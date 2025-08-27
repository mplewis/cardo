import { getTestPrismaClient } from './test-database'

/** Truncate all test database tables and reset auto-increment counters */
export async function truncateDatabase(): Promise<void> {
  const testPrisma = getTestPrismaClient()

  try {
    await testPrisma.$executeRaw`DELETE FROM IndividualKanji`
    await testPrisma.$executeRaw`DELETE FROM Phrase`
    await testPrisma.$executeRaw`DELETE FROM Query`
    await testPrisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name IN ('Query', 'Phrase', 'IndividualKanji')`
  } catch (error) {
    // Tables might not exist yet during setup, ignore error
    console.warn('Truncate failed (expected during setup):', error)
  }
}
