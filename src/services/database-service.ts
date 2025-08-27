import type { IndividualKanji, Phrase, Query } from '../generated/prisma'
import { PrismaClient } from '../generated/prisma'

// Use test database in test environment
function createPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'test' || process.env.DATABASE_URL?.includes('test.db')) {
    return new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./tmp/test.db',
        },
      },
    })
  }

  // Use production database client
  const { prisma: prodPrisma } = require('../database')
  return prodPrisma
}

const prisma = createPrismaClient()

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

export interface CreateIndividualKanjiData {
  englishMeaning: string
  kanji: string
  phoneticKana: string
  phoneticRomaji: string
  queryId: number
}

/** Service for database operations */
export class DatabaseService {
  /** Create a new query record */
  async createQuery(data: CreateQueryData): Promise<Query> {
    return await prisma.query.create({
      data,
    })
  }

  /** Get a query by ID with all related data */
  async getQueryWithCards(id: number): Promise<Query | null> {
    return await prisma.query.findUnique({
      where: { id },
      include: {
        phrases: true,
        individualKanji: true,
      },
    })
  }

  /** Get all queries with counts */
  async getAllQueries(): Promise<
    Array<Query & { _count: { phrases: number; individualKanji: number } }>
  > {
    return await prisma.query.findMany({
      include: {
        _count: {
          select: {
            phrases: true,
            individualKanji: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /** Create a new phrase */
  async createPhrase(data: CreatePhraseData): Promise<Phrase> {
    return await prisma.phrase.create({
      data,
    })
  }

  /** Create multiple phrases */
  async createPhrases(phrases: CreatePhraseData[]): Promise<void> {
    await prisma.phrase.createMany({
      data: phrases,
    })
  }

  /** Create a new individual kanji */
  async createIndividualKanji(data: CreateIndividualKanjiData): Promise<IndividualKanji> {
    return await prisma.individualKanji.create({
      data,
    })
  }

  /** Create multiple individual kanji */
  async createIndividualKanjis(kanjis: CreateIndividualKanjiData[]): Promise<void> {
    await prisma.individualKanji.createMany({
      data: kanjis,
    })
  }

  /** Get all phrases for all queries */
  async getAllPhrases(): Promise<Phrase[]> {
    return await prisma.phrase.findMany({
      orderBy: {
        kanji: 'asc',
      },
    })
  }

  /** Get all individual kanji for all queries */
  async getAllIndividualKanji(): Promise<IndividualKanji[]> {
    return await prisma.individualKanji.findMany({
      orderBy: {
        kanji: 'asc',
      },
    })
  }

  /** Check if an individual kanji already exists */
  async individualKanjiExists(kanji: string): Promise<boolean> {
    const existing = await prisma.individualKanji.findUnique({
      where: { kanji },
    })
    return existing !== null
  }

  /** Get existing individual kanji characters */
  async getExistingKanji(kanjis: string[]): Promise<string[]> {
    const existing = await prisma.individualKanji.findMany({
      where: {
        kanji: {
          in: kanjis,
        },
      },
      select: {
        kanji: true,
      },
    })
    return existing.map((k) => k.kanji)
  }

  /** Delete a query and all associated cards */
  async deleteQuery(id: number): Promise<void> {
    await prisma.query.delete({
      where: { id },
    })
  }
}
