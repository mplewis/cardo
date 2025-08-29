import { PrismaClient } from '../generated/prisma'
import { initializeDatabase } from './database'
import { log } from './logger'

/**
 * Higher-order function that handles database lifecycle and error formatting for commands
 */
export async function withDatabaseCommand<T>(
  commandName: string,
  operation: (db: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    await initializeDatabase()
    const db = new PrismaClient()
    try {
      return await operation(db)
    } finally {
      await db.$disconnect()
    }
  } catch (error) {
    log.error({ error }, `Failed to ${commandName}`)
    throw new Error(
      `Failed to ${commandName}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
