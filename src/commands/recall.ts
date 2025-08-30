import { Command, Flags } from '@oclif/core'
import { Table } from 'console-table-printer'
import { withDatabaseCommand } from '../lib/command-utils'
import { deduplicateKanji, deduplicatePhrases } from '../lib/data-utils'
import { displayCards } from '../lib/display'
import { exportAndShowResult } from '../lib/export-utils'
import { log } from '../lib/logger'

/**
 * Recall and display previously generated flashcards
 */
export default class Recall extends Command {
  static override args = {}

  static override strict = false

  static override description = 'Recall and display previously generated flashcards'

  static override examples = [
    '<%= config.bin %> <%= command.id %> --list',
    '<%= config.bin %> <%= command.id %> --all',
    '<%= config.bin %> <%= command.id %> 1',
    '<%= config.bin %> <%= command.id %> 3 --export',
    '<%= config.bin %> <%= command.id %> food',
    '<%= config.bin %> <%= command.id %> train station',
    '<%= config.bin %> <%= command.id %> restaurant --export',
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
    const { flags, argv } = await this.parse(Recall)

    // Join all argv arguments to create the queryIdOrSearch
    const queryIdOrSearch = argv.join(' ').trim()

    try {
      await withDatabaseCommand('recall cards', async (db) => {
        // Handle --list flag
        if (flags.list) {
          const queries = await db.query.findMany({
            orderBy: [{ domain: 'asc' }, { createdAt: 'desc' }],
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
            this.log('No queries found. Generate some cards first with the "cards" command.')
            await db.$disconnect()
            return
          }

          const queriesTable = new Table({
            title: 'Available Queries',
            columns: [
              { name: 'id', title: 'ID', alignment: 'right' },
              { name: 'created', title: 'Created', alignment: 'left' },
              { name: 'domain', title: 'Domain', alignment: 'left' },
              { name: 'count', title: 'Count', alignment: 'right' },
              { name: 'phrases', title: 'Phrases', alignment: 'right' },
              { name: 'kanji', title: 'Kanji', alignment: 'right' },
            ],
          })

          for (const query of queries) {
            const createdAt = new Date(query.createdAt).toLocaleString()
            queriesTable.addRow({
              id: query.id,
              created: createdAt,
              domain: query.domain,
              count: query.count,
              phrases: query._count.phrases,
              kanji: query._count.kanji,
            })
          }

          queriesTable.printTable()
          await db.$disconnect()
          return
        }

        // Handle --all flag
        if (flags.all) {
          const allPhrases = await db.phrase.findMany({
            orderBy: [{ queryId: 'desc' }, { id: 'asc' }],
          })

          const allKanji = await db.kanji.findMany({
            orderBy: [{ queryId: 'desc' }, { id: 'asc' }],
          })

          if (allPhrases.length === 0 && allKanji.length === 0) {
            this.log('No cards found. Generate some cards first with the "cards" command.')
            await db.$disconnect()
            return
          }

          // Deduplicate by kanji, keeping earliest created
          const phrases = deduplicatePhrases(allPhrases)
          const kanji = deduplicateKanji(allKanji)

          const duplicatePhrases = allPhrases.length - phrases.length
          const duplicateKanji = allKanji.length - kanji.length
          displayCards({ phrases, kanji })

          if (flags.export) {
            await exportAndShowResult({ phrases, kanji }, flags['no-open'], this)
          }

          log.info(
            {
              phrases: phrases.length,
              kanji: kanji.length,
              duplicatesRemoved: duplicatePhrases + duplicateKanji,
            },
            'Recalled all cards'
          )
          await db.$disconnect()
          return
        }

        // Handle specific query ID or search term
        if (!queryIdOrSearch) {
          this.error(
            'Please provide a query ID or search term, or use --list to see available queries, or --all for all cards'
          )
        }

        // Determine if input is a numeric ID or search term
        const isNumeric = /^\d+$/.test(queryIdOrSearch)

        if (isNumeric) {
          // Handle specific query ID
          const queryId = parseInt(queryIdOrSearch, 10)

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

          const allPhrases = await db.phrase.findMany({
            where: { queryId },
            orderBy: { id: 'asc' },
          })

          const allKanji = await db.kanji.findMany({
            where: { queryId },
            orderBy: { id: 'asc' },
          })

          if (allPhrases.length === 0 && allKanji.length === 0) {
            this.log(`No cards found for query ID ${queryId}.`)
            await db.$disconnect()
            return
          }

          // Deduplicate by kanji, keeping earliest created
          const phrases = deduplicatePhrases(allPhrases)
          const kanji = deduplicateKanji(allKanji)

          const duplicatePhrases = allPhrases.length - phrases.length
          const duplicateKanji = allKanji.length - kanji.length

          const createdAt = new Date(query.createdAt).toLocaleString()
          this.log(`\nFlashcards from Query ID ${queryId}\n`)
          this.log(`Created: ${createdAt}`)
          this.log(`Domain: ${query.domain}`)
          this.log(`Count: ${query.count}`)
          this.log('')

          displayCards({ phrases, kanji })

          if (flags.export) {
            await exportAndShowResult({ phrases, kanji }, flags['no-open'], this)
          }

          log.info(
            {
              queryId,
              phrases: phrases.length,
              kanji: kanji.length,
              duplicatesRemoved: duplicatePhrases + duplicateKanji,
            },
            'Recalled query'
          )
        } else {
          // Handle search term - find queries with matching domains
          // Split search into individual words for OR search
          const searchWords = queryIdOrSearch
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 0)

          const matchingQueries = await db.query.findMany({
            where: {
              OR: searchWords.map((word) => ({
                domain: {
                  contains: word,
                },
              })),
            },
            orderBy: [{ domain: 'asc' }, { createdAt: 'desc' }],
            include: {
              _count: {
                select: {
                  phrases: true,
                  kanji: true,
                },
              },
            },
          })

          if (matchingQueries.length === 0) {
            this.log(
              `No queries found with domain containing "${queryIdOrSearch}". Use --list to see available queries.`
            )
            await db.$disconnect()
            return
          }

          // Get all phrases and kanji from matching queries
          const queryIds = matchingQueries.map((q) => q.id)

          const allPhrases = await db.phrase.findMany({
            where: { queryId: { in: queryIds } },
            orderBy: [{ queryId: 'desc' }, { id: 'asc' }],
          })

          const allKanji = await db.kanji.findMany({
            where: { queryId: { in: queryIds } },
            orderBy: [{ queryId: 'desc' }, { id: 'asc' }],
          })

          // Deduplicate by kanji, keeping earliest created
          const phrases = deduplicatePhrases(allPhrases)
          const kanji = deduplicateKanji(allKanji)

          const duplicatePhrases = allPhrases.length - phrases.length
          const duplicateKanji = allKanji.length - kanji.length

          this.log(`\nFlashcards matching "${queryIdOrSearch}"\n`)
          this.log(`Found ${matchingQueries.length} matching queries:`)
          for (const query of matchingQueries) {
            const createdAt = new Date(query.createdAt).toLocaleString()
            this.log(`  • Query ${query.id}: ${query.domain} (${createdAt})`)
          }
          if (duplicatePhrases > 0 || duplicateKanji > 0) {
            this.log(
              `\nDeduplicated: ${duplicatePhrases} phrase(s) and ${duplicateKanji} kanji (kept earliest)`
            )
          }
          this.log('')

          displayCards({ phrases, kanji })

          if (flags.export) {
            await exportAndShowResult({ phrases, kanji }, flags['no-open'], this)
          }

          log.info(
            {
              search: queryIdOrSearch,
              phrases: phrases.length,
              kanji: kanji.length,
              matchingQueries: matchingQueries.length,
              duplicatesRemoved: duplicatePhrases + duplicateKanji,
            },
            'Recalled search results'
          )
        }
      })
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
