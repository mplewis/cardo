import { Args, Command, Flags } from '@oclif/core'
import { PrismaClient } from '../generated/prisma'
import { consolidate } from '../lib/consolidation'
import { initializeDatabase } from '../lib/database'
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
    domain: Args.string({
      description: 'domain/theme for the phrases (e.g., "train stations", "restaurants")',
      required: true,
    }),
  }

  static override description = 'Generate Japanese kanji flashcards using LLM'

  static override examples = [
    '<%= config.bin %> <%= command.id %> 10 "train stations"',
    '<%= config.bin %> <%= command.id %> 5 "restaurants"',
    '<%= config.bin %> <%= command.id %> 15 "shopping"',
  ]

  static override flags = {
    'no-open': Flags.boolean({
      description: 'do not automatically open CSV files after generation',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Cards)
    const { count, domain } = args

    // Validate input
    if (count <= 0) {
      this.error('Count must be a positive integer')
    }

    if (!domain.trim()) {
      this.error('Domain cannot be empty')
    }

    log.info(`Starting card generation for ${count} phrases in domain: "${domain}"`)

    try {
      // Initialize database
      await initializeDatabase()
      const db = new PrismaClient()

      // Create LLM service
      const llmService = createLlmService()

      // Generate phrases using LLM
      const rawPhrases = await llmService.generatePhrases(domain, count)

      if (rawPhrases.length === 0) {
        this.warn('No phrases were generated. Please try again with a different domain.')
        return
      }

      // Save to database and consolidate
      const query = await db.query.create({
        data: {
          prompt: `Generate ${count} phrases for domain: "${domain}"`,
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
      this.log('\\n📚 Generated Japanese Kanji Flashcards\\n')
      displayCards({ phrases, kanji })

      // Export to CSV
      const result = await exportToCSV({ phrases, kanji }, !flags['no-open'])

      this.log(`\\n✅ Cards generated successfully!`)
      this.log(`📁 CSV files saved to: ${result.tempDir}`)

      if (!flags['no-open']) {
        this.log('📂 CSV files opened automatically')
      }

      log.info(
        `Successfully generated ${phrases.length} phrases and ${kanji.length} individual kanji`
      )

      await db.$disconnect()
    } catch (error) {
      log.error({ error }, 'Failed to generate cards')
      this.error(
        `Failed to generate cards: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
