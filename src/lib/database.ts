import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Kanji, Phrase, Query } from '../generated/prisma'
import { PrismaClient } from '../generated/prisma'
import { getTestPrismaClient } from '../test-database'

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

const prodPrisma = createPrismaClient()

// Use shared test database client in test environment, otherwise use production client
const prisma =
  process.env.NODE_ENV === 'test' || process.env.DATABASE_URL?.includes('test.db')
    ? getTestPrismaClient()
    : prodPrisma

export interface CreateQueryData {
  prompt: string
}

export interface CreatePhraseData {
  englishMeaning: string
  kanji: string
  phoneticKana: string
  phoneticRomaji: string
  kanjiBreakdown: string
  queryId: number
}

export interface CreateKanjiData {
  englishMeaning: string
  kanji: string
  phoneticKana: string
  phoneticRomaji: string
  queryId: number
}

/** Create a new query record */
export async function createQuery(data: CreateQueryData): Promise<Query> {
  return await prisma.query.create({
    data,
  })
}
/** Get a query by ID with all related data */
export async function getQueryWithCards(id: number): Promise<Query | null> {
  return await prisma.query.findUnique({
    where: { id },
    include: {
      phrases: true,
      kanji: true,
    },
  })
}
/** Get all queries with counts */
export async function getAllQueries(): Promise<
  Array<Query & { _count: { phrases: number; kanji: number } }>
> {
  return await prisma.query.findMany({
    include: {
      _count: {
        select: {
          phrases: true,
          kanji: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
/** Create a new phrase */
export async function createPhrase(data: CreatePhraseData): Promise<Phrase> {
  return await prisma.phrase.create({
    data,
  })
}
/** Create multiple phrases */
export async function createPhrases(phrases: CreatePhraseData[]): Promise<void> {
  await prisma.phrase.createMany({
    data: phrases,
  })
}
/** Create a new kanji */
export async function createKanji(data: CreateKanjiData): Promise<Kanji> {
  return await prisma.kanji.create({
    data,
  })
}
/** Create multiple kanji */
export async function createKanjis(kanjis: CreateKanjiData[]): Promise<void> {
  await prisma.kanji.createMany({
    data: kanjis,
  })
}
/** Get all phrases for all queries */
export async function getAllPhrases(): Promise<Phrase[]> {
  return await prisma.phrase.findMany({
    orderBy: {
      kanji: 'asc',
    },
  })
}
/** Get all kanji for all queries */
export async function getAllKanji(): Promise<Kanji[]> {
  return await prisma.kanji.findMany({
    orderBy: {
      kanji: 'asc',
    },
  })
}
/** Check if a kanji already exists */
export async function kanjiExists(kanji: string): Promise<boolean> {
  const existing = await prisma.kanji.findUnique({
    where: { kanji },
  })
  return existing !== null
}
/** Get existing kanji characters */
export async function getExistingKanji(kanjis: string[]): Promise<string[]> {
  const existing = await prisma.kanji.findMany({
    where: {
      kanji: {
        in: kanjis,
      },
    },
    select: {
      kanji: true,
    },
  })
  return existing.map((k: { kanji: string }) => k.kanji)
}
/** Delete a query and all associated cards */
export async function deleteQuery(id: number): Promise<void> {
  await prisma.query.delete({
    where: { id },
  })
}

/** Initialize the database and run auto-migrations */
export async function initializeDatabase(): Promise<void> {
  try {
    await prodPrisma.$connect()

    // Deploy pending migrations in production/development
    const { spawn } = await import('node:child_process')

    // Run prisma db push to auto-migrate schema changes
    await new Promise<void>((resolve, reject) => {
      const child = spawn('pnpm', ['prisma', 'db', 'push'], {
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
