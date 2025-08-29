import { Args, Command, Flags } from '@oclif/core'
import { PrismaClient } from '../generated/prisma'
import { initializeDatabase } from '../lib/database'
import { log } from '../lib/logger'

/**
 * Delete a query and its associated flashcards
 */
export default class Delete extends Command {
  static override args = {
    queryId: Args.integer({
      description: 'query ID to delete',
      required: true,
    }),
  }

  static override description = 'Delete a query and optionally its associated flashcards'

  static override examples = [
    '<%= config.bin %> <%= command.id %> 1',
    '<%= config.bin %> <%= command.id %> 3 --with-cards',
    '<%= config.bin %> <%= command.id %> 2 --force',
  ]

  static override flags = {
    'with-cards': Flags.boolean({
      char: 'c',
      description: 'also delete associated phrase and kanji cards (default behavior)',
      default: true,
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'skip confirmation prompt',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Delete)
    const { queryId } = args

    try {
      await initializeDatabase()
      const db = new PrismaClient()

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
        this.error(`Query with ID ${queryId} not found.`)
      }

      const createdAt = new Date(query.createdAt).toLocaleString()

      // Show what will be deleted
      this.log(`\nDelete Query ${queryId}\n`)
      this.log(`Created: ${createdAt}`)
      this.log(`Domain: ${query.domain}`)
      this.log(`Count: ${query.count}`)
      this.log(
        `Associated cards: ${query._count.phrases} phrases, ${query._count.kanji} individual kanji`
      )

      if (flags['with-cards']) {
        this.log(`\nThis will permanently delete the query and ALL associated flashcards.`)
      } else {
        this.log(`\nThis will permanently delete the query only (cards will remain orphaned).`)
      }

      // Confirmation prompt (unless --force is used)
      if (!flags.force) {
        this.log('\nAre you sure you want to proceed? (y/N)')
        this.error('Use --force flag to skip this confirmation and proceed with deletion.')
      }

      // Perform deletion
      if (flags['with-cards']) {
        // Delete associated cards first (phrases and kanji will be deleted via cascade)
        await db.query.delete({
          where: { id: queryId },
        })

        this.log(`\nSuccessfully deleted query ${queryId} and all associated cards.`)
        log.info(
          {
            queryId,
            phrases: query._count.phrases,
            kanji: query._count.kanji,
          },
          'Deleted query with associated data'
        )
      } else {
        // Delete only the query (this will orphan the cards)
        await db.phrase.updateMany({
          where: { queryId },
          data: { queryId: -1 }, // Mark as orphaned
        })

        await db.kanji.updateMany({
          where: { queryId },
          data: { queryId: -1 }, // Mark as orphaned
        })

        await db.query.delete({
          where: { id: queryId },
        })

        this.log(`\nSuccessfully deleted query ${queryId}. Associated cards remain in database.`)
        log.info(
          {
            queryId,
            orphanedPhrases: query._count.phrases,
            orphanedKanji: query._count.kanji,
          },
          'Deleted query, orphaned associated data'
        )
      }

      await db.$disconnect()
    } catch (error) {
      log.error({ error }, 'Failed to delete query')
      this.error(
        `Failed to delete query: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
