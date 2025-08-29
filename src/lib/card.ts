import { consolidate, type PhrasesResponse } from './consolidation'
import { mapDbKanjiToCardData, mapDbPhrasesToCardData } from './data-utils'
import {
  createKanjis,
  createPhrases,
  getAllKanji,
  getAllPhrases,
  getQueryWithCards,
} from './database'
import { createLlmService } from './llm'

export interface CardData {
  phrases: Array<{
    englishMeaning: string
    kanji: string
    phoneticKana: string
    phoneticRomaji: string
    kanjiBreakdown: string
  }>
  kanji: Array<{
    englishMeaning: string
    kanji: string
    phoneticKana: string
    phoneticRomaji: string
  }>
}

/**
 * Generate cards from raw LLM response data
 *
 * Process:
 * 1. Consolidate raw data into phrases and individual kanji
 * 2. Store phrases and known individual kanji
 * 3. Identify kanji that need LLM lookup for meanings
 * 4. Return card data for display/export
 */
export async function generateCards(
  queryId: number,
  rawLlmData: PhrasesResponse[]
): Promise<CardData> {
  // Step 1: Consolidate the data
  const consolidated = await consolidate(rawLlmData)

  // Step 2: Store phrases in database
  if (consolidated.phrases.length > 0) {
    const phrasesToCreate = consolidated.phrases.map((phrase) => ({
      ...phrase,
      queryId,
    }))
    await createPhrases(phrasesToCreate)
  }

  // Step 3: Store individual kanji that we have data for
  if (consolidated.kanji.length > 0) {
    const kanjiToCreate = consolidated.kanji.map((kanji) => ({
      ...kanji,
      queryId,
    }))
    await createKanjis(kanjiToCreate)
  }

  // Step 4: Get all cards for this query to return
  const queryWithCards = await getQueryWithCards(queryId)

  return {
    phrases: queryWithCards?.phrases ? mapDbPhrasesToCardData(queryWithCards.phrases) : [],
    kanji: queryWithCards?.kanji ? mapDbKanjiToCardData(queryWithCards.kanji) : [],
  }
}

/** Get all cards for a specific query */
export async function getCardsForQuery(queryId: number): Promise<CardData> {
  const queryWithCards = await getQueryWithCards(queryId)

  return {
    phrases: queryWithCards?.phrases ? mapDbPhrasesToCardData(queryWithCards.phrases) : [],
    kanji: queryWithCards?.kanji ? mapDbKanjiToCardData(queryWithCards.kanji) : [],
  }
}

/** Get all cards across all queries */
export async function getAllCards(): Promise<CardData> {
  const [phrases, kanji] = await Promise.all([getAllPhrases(), getAllKanji()])

  return {
    phrases: mapDbPhrasesToCardData(phrases),
    kanji: mapDbKanjiToCardData(kanji),
  }
}

/**
 * Generate cards from LLM query based on domain
 *
 * Process:
 * 1. Query LLM for phrases matching the domain
 * 2. Use existing consolidation and storage logic
 * 3. Return card data for display/export
 */
export async function generateCardsFromQuery(
  queryId: number,
  domain: string,
  count: number
): Promise<CardData> {
  const llmService = createLlmService()

  // Get raw data from LLM
  const rawLlmData = await llmService.generatePhrases(domain, count)

  // Use existing card generation logic
  return generateCards(queryId, rawLlmData)
}
