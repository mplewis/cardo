import type { ConsolidationService } from './consolidation-service'
import type { RawLlmResponse } from './consolidation-service'
import type { DatabaseService } from './database-service'

export interface CardData {
  phrases: Array<{
    englishMeaning: string
    kanji: string
    phoneticKana: string
    phoneticRomaji: string
    kanjiBreakdown: string
  }>
  individualKanji: Array<{
    englishMeaning: string
    kanji: string
    phoneticKana: string
    phoneticRomaji: string
  }>
}

/** Service for generating flashcards from consolidated data */
export class CardService {
  constructor(
    private dbService: DatabaseService,
    private consolidationService: ConsolidationService
  ) {}

  /**
   * Generate cards from raw LLM response data
   *
   * Process:
   * 1. Consolidate raw data into phrases and individual kanji
   * 2. Store phrases and known individual kanji
   * 3. Identify kanji that need LLM lookup for meanings
   * 4. Return card data for display/export
   */
  async generateCards(queryId: number, rawLlmData: RawLlmResponse[]): Promise<CardData> {
    // Step 1: Consolidate the data
    const consolidated = await this.consolidationService.consolidate(rawLlmData)

    // Step 2: Store phrases in database
    if (consolidated.phrases.length > 0) {
      const phrasesToCreate = consolidated.phrases.map((phrase) => ({
        ...phrase,
        queryId,
      }))
      await this.dbService.createPhrases(phrasesToCreate)
    }

    // Step 3: Store individual kanji that we have data for
    if (consolidated.individualKanji.length > 0) {
      const kanjiToCreate = consolidated.individualKanji.map((kanji) => ({
        ...kanji,
        queryId,
      }))
      await this.dbService.createIndividualKanjis(kanjiToCreate)
    }

    // Step 4: Get all cards for this query to return
    const queryWithCards = await this.dbService.getQueryWithCards(queryId)

    return {
      phrases:
        queryWithCards?.phrases.map((p) => ({
          englishMeaning: p.englishMeaning,
          kanji: p.kanji,
          phoneticKana: p.phoneticKana,
          phoneticRomaji: p.phoneticRomaji,
          kanjiBreakdown: p.kanjiBreakdown,
        })) || [],
      individualKanji:
        queryWithCards?.individualKanji.map((k) => ({
          englishMeaning: k.englishMeaning,
          kanji: k.kanji,
          phoneticKana: k.phoneticKana,
          phoneticRomaji: k.phoneticRomaji,
        })) || [],
    }
  }

  /**
   * Get all cards for a specific query
   */
  async getCardsForQuery(queryId: number): Promise<CardData> {
    const queryWithCards = await this.dbService.getQueryWithCards(queryId)

    return {
      phrases:
        queryWithCards?.phrases.map((p) => ({
          englishMeaning: p.englishMeaning,
          kanji: p.kanji,
          phoneticKana: p.phoneticKana,
          phoneticRomaji: p.phoneticRomaji,
          kanjiBreakdown: p.kanjiBreakdown,
        })) || [],
      individualKanji:
        queryWithCards?.individualKanji.map((k) => ({
          englishMeaning: k.englishMeaning,
          kanji: k.kanji,
          phoneticKana: k.phoneticKana,
          phoneticRomaji: k.phoneticRomaji,
        })) || [],
    }
  }

  /**
   * Get all cards across all queries
   */
  async getAllCards(): Promise<CardData> {
    const [phrases, individualKanji] = await Promise.all([
      this.dbService.getAllPhrases(),
      this.dbService.getAllIndividualKanji(),
    ])

    return {
      phrases: phrases.map((p) => ({
        englishMeaning: p.englishMeaning,
        kanji: p.kanji,
        phoneticKana: p.phoneticKana,
        phoneticRomaji: p.phoneticRomaji,
        kanjiBreakdown: p.kanjiBreakdown,
      })),
      individualKanji: individualKanji.map((k) => ({
        englishMeaning: k.englishMeaning,
        kanji: k.kanji,
        phoneticKana: k.phoneticKana,
        phoneticRomaji: k.phoneticRomaji,
      })),
    }
  }
}
