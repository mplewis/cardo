import { Args, Command, Flags } from '@oclif/core'
import { PrismaClient } from '../generated/prisma'
import { initializeDatabase } from '../lib/database'
import { displayCards } from '../lib/display'
import { exportToCSV } from '../lib/export'
import { log } from '../lib/logger'

/**
 * Recall and display previously generated flashcards
 */
export default class Recall extends Command {
  static override args = {
    queryId: Args.integer({
      description: 'query ID to recall (use --list to see available queries)',
      required: false,
    }),
  }

  static override description = 'Recall and display previously generated flashcards'

  static override examples = [
    '<%= config.bin %> <%= command.id %> --list',
    '<%= config.bin %> <%= command.id %> --all',
    '<%= config.bin %> <%= command.id %> 1',
    '<%= config.bin %> <%= command.id %> 3 --export',
  ]

  static override flags = {
    all: Flags.boolean({
      char: 'a',
      description: 'recall all cards from all queries',
      default: false,
    }),
    export: Flags.boolean({
      char: 'e',
      description: 'export recalled cards to CSV files',
      default: false,
    }),
    list: Flags.boolean({
      char: 'l',
      description: 'list all available queries with their IDs',
      default: false,
    }),
    'no-open': Flags.boolean({
      description: 'do not automatically open CSV files after export (only with --export)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Recall)
    const { queryId } = args

    try {
      await initializeDatabase()
      const db = new PrismaClient()

      // Handle --list flag
      if (flags.list) {
        const queries = await db.query.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                phrases: true,
                kanji: true,
              },
            },
          },
        })

        if (queries.length === 0) {
          this.log('📭 No queries found. Generate some cards first with the "cards" command.')
          await db.$disconnect()
          return
        }

        this.log('\\n📋 Available Queries:\\n')

        for (const query of queries) {
          const createdAt = new Date(query.createdAt).toLocaleString()
          this.log(`🆔 ID: ${query.id}`)
          this.log(`   📅 Created: ${createdAt}`)
          this.log(`   📝 Prompt: ${query.prompt}`)
          this.log(
            `   📊 Cards: ${query._count.phrases} phrases, ${query._count.kanji} individual kanji`
          )
          this.log('')
        }
        await db.$disconnect()
        return
      }

      // Handle --all flag
      if (flags.all) {
        const phrases = await db.phrase.findMany({
          orderBy: [{ queryId: 'desc' }, { id: 'asc' }],
        })

        const kanji = await db.kanji.findMany({
          orderBy: [{ queryId: 'desc' }, { id: 'asc' }],
        })

        if (phrases.length === 0 && kanji.length === 0) {
          this.log('📭 No cards found. Generate some cards first with the "cards" command.')
          await db.$disconnect()
          return
        }

        this.log('\\n📚 All Japanese Kanji Flashcards\\n')
        displayCards({ phrases, kanji })

        if (flags.export) {
          const result = await exportToCSV({ phrases, kanji }, !flags['no-open'])
          this.log(`\\n📁 CSV files exported to: ${result.tempDir}`)
          if (!flags['no-open']) {
            this.log('📂 CSV files opened automatically')
          }
        }

        log.info(
          `Recalled all cards: ${phrases.length} phrases and ${kanji.length} individual kanji`
        )
        await db.$disconnect()
        return
      }

      // Handle specific query ID
      if (!queryId) {
        this.error(
          'Please provide a query ID, or use --list to see available queries, or --all for all cards'
        )
      }

      // Check if query exists
      const query = await db.query.findUnique({
        where: { id: queryId },
        include: {
          _count: {
            select: {
              phrases: true,
              kanji: true,
            },
          },
        },
      })

      if (!query) {
        this.error(`Query with ID ${queryId} not found. Use --list to see available queries.`)
      }

      const phrases = await db.phrase.findMany({
        where: { queryId },
        orderBy: { id: 'asc' },
      })

      const kanji = await db.kanji.findMany({
        where: { queryId },
        orderBy: { id: 'asc' },
      })

      if (phrases.length === 0 && kanji.length === 0) {
        this.log(`📭 No cards found for query ID ${queryId}.`)
        await db.$disconnect()
        return
      }

      const createdAt = new Date(query.createdAt).toLocaleString()
      this.log(`\\n📚 Flashcards from Query ID ${queryId}\\n`)
      this.log(`📅 Created: ${createdAt}`)
      this.log(`📝 Prompt: ${query.prompt}\\n`)

      displayCards({ phrases, kanji })

      if (flags.export) {
        const result = await exportToCSV({ phrases, kanji }, !flags['no-open'])
        this.log(`\\n📁 CSV files exported to: ${result.tempDir}`)
        if (!flags['no-open']) {
          this.log('📂 CSV files opened automatically')
        }
      }

      log.info(
        `Recalled query ${queryId}: ${phrases.length} phrases and ${kanji.length} individual kanji`
      )
      await db.$disconnect()
    } catch (error) {
      log.error({ error }, 'Failed to recall cards')
      this.error(
        `Failed to recall cards: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
