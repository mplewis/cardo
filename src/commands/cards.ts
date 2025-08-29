import { Args, Command, Flags } from '@oclif/core'
import { withDatabaseCommand } from '../lib/command-utils'
import { consolidate } from '../lib/consolidation'
import { displayCards } from '../lib/display'
import { exportToCSV } from '../lib/export'
import { createLlmService } from '../lib/llm'
import { log } from '../lib/logger'

/**
 * Generate Japanese kanji flashcards using LLM
 */
export default class Cards extends Command {
  static override args = {
    count: Args.integer({
      description: 'number of phrases to generate',
      required: true,
    }),
  }

  static override strict = false

  static override description = 'Generate Japanese kanji flashcards using LLM'

  static override examples = [
    '<%= config.bin %> <%= command.id %> 10 train stations',
    '<%= config.bin %> <%= command.id %> 5 restaurants',
    '<%= config.bin %> <%= command.id %> 15 shopping --include-known',
    '<%= config.bin %> <%= command.id %> 10 "train stations" (quotes still supported)',
  ]

  static override flags = {
    'include-known': Flags.boolean({
      char: 'i',
      description: 'allow previously generated phrases to be included in results',
      default: false,
    }),
    'no-open': Flags.boolean({
      description: 'do not automatically open CSV files after generation',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags, argv } = await this.parse(Cards)
    const { count } = args

    // Extract domain from remaining arguments (everything after count)
    const domainArgs = argv.slice(1) // Skip the count argument
    const domain = domainArgs.join(' ').trim()

    // Validate input
    if (count <= 0) {
      this.error('Count must be a positive integer')
    }

    if (!domain) {
      this.error(
        'Domain cannot be empty. Please provide a domain after the count, e.g., "cards 5 train stations"'
      )
    }

    log.info({ count, domain }, 'Starting card generation')

    try {
      await withDatabaseCommand('generate cards', async (db) => {
        // Create LLM service
        const llmService = createLlmService()

        // Get existing phrases to exclude (default behavior, unless --include-known is set)
        let knownPhrases: string[] = []
        if (!flags['include-known']) {
          const existingPhrases = await db.phrase.findMany({
            select: { kanji: true },
          })
          knownPhrases = existingPhrases.map((p) => p.kanji)

          if (knownPhrases.length > 0) {
            log.info({ count: knownPhrases.length }, 'Found existing phrases to exclude')
          }
        } else {
          this.log('Including previously generated phrases (--include-known enabled)')
        }

        // Generate phrases using LLM
        const rawPhrases = await llmService.generatePhrases(domain, count, knownPhrases)

        if (rawPhrases.length === 0) {
          this.warn('No phrases were generated. Please try again with a different domain.')
          return
        }

        // Save to database and consolidate
        const query = await db.query.create({
          data: {
            count,
            domain,
          },
        })

        const queryId = query.id

        // Save phrases to database
        for (const phrase of rawPhrases) {
          await db.phrase.create({
            data: {
              ...phrase,
              queryId,
            },
          })
        }

        // Run consolidation to extract individual kanji
        const consolidated = await consolidate(rawPhrases)

        // Save individual kanji to database
        for (const kanji of consolidated.kanji) {
          await db.kanji.create({
            data: {
              ...kanji,
              queryId,
            },
          })
        }

        // Fetch consolidated data for display
        const phrases = await db.phrase.findMany({
          where: { queryId },
          orderBy: { id: 'asc' },
        })

        const kanji = await db.kanji.findMany({
          where: { queryId },
          orderBy: { id: 'asc' },
        })

        // Display in terminal
        displayCards({ phrases, kanji })

        // Export to CSV
        await exportToCSV({ phrases, kanji }, !flags['no-open'])

        log.info({ phrases: phrases.length, kanji: kanji.length }, 'Successfully generated cards')
      })
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
