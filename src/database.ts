import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from './generated/prisma'

/** Get the database file path in the system's app data folder */
function getDatabasePath(): string {
  const appDataDir = join(homedir(), '.local', 'share', 'cardo')
  mkdirSync(appDataDir, { recursive: true })
  return join(appDataDir, 'cardo.db')
}

/** Create and configure the Prisma client with the correct database path */
function createPrismaClient(): PrismaClient {
  const databasePath = getDatabasePath()
  process.env.DATABASE_URL = `file:${databasePath}`

  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${databasePath}`,
      },
    },
  })
}

export const prisma = createPrismaClient()

/** Initialize the database and run auto-migrations */
export async function initializeDatabase(): Promise<void> {
  try {
    await prisma.$connect()

    // Deploy pending migrations in production/development
    const { spawn } = await import('node:child_process')

    // Run prisma db push to auto-migrate schema changes
    await new Promise<void>((resolve, reject) => {
      const child = spawn('npx', ['prisma', 'db', 'push'], {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `file:${getDatabasePath()}` },
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Migration failed with code ${code}`))
        }
      })
    })
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}
