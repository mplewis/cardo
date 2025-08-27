import { PrismaClient } from './src/generated/prisma'
import { resolve } from 'node:path'

export async function setup() {
  // Set test database URL to absolute path
  const testDbPath = resolve('./tmp/test.db')
  process.env.DATABASE_URL = `file:${testDbPath}`
  process.env.NODE_ENV = 'test'

  // Create test database client and initialize
  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${testDbPath}`,
      },
    },
  })

  await testPrisma.$connect()

  // Run migrations for test database
  const { spawn } = await import('node:child_process')
  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx', ['prisma', 'db', 'push'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Migration failed with code ${code}`))
      }
    })
  })

  await testPrisma.$disconnect()
}

export async function teardown() {
  // Clean up handled by setup files
}
