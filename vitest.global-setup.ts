import { resolve } from 'node:path'
import { closeTestPrismaClient, getTestPrismaClient } from './src/test-database'

export async function setup() {
  // Set test database URL to absolute path
  const testDbPath = resolve('./tmp/test.db')
  process.env.DATABASE_URL = `file:${testDbPath}`
  process.env.NODE_ENV = 'test'

  // Run migrations for test database first
  const { spawn } = await import('node:child_process')
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['prisma', 'db', 'push', '--accept-data-loss'], {
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

  // Then get shared test database client and connect
  const testPrisma = getTestPrismaClient()
  await testPrisma.$connect()
}

export async function teardown() {
  // Close shared test database client
  await closeTestPrismaClient()
}
