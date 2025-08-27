import { PrismaClient } from './generated/prisma'

/** Shared test database client */
let testPrisma: PrismaClient | null = null

/** Get or create the test database client */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./tmp/test.db',
        },
      },
    })
  }
  return testPrisma
}

/** Close the test database client */
export async function closeTestPrismaClient(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect()
    testPrisma = null
  }
}
