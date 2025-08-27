import { consolidate, type RawLlmResponse } from './consolidation'
import {
  createKanjis,
  createPhrases,
  getAllKanji,
  getAllPhrases,
  getQueryWithCards,
} from './database'

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
  rawLlmData: RawLlmResponse[]
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
    phrases:
      queryWithCards?.phrases.map((p) => ({
        englishMeaning: p.englishMeaning,
        kanji: p.kanji,
        phoneticKana: p.phoneticKana,
        phoneticRomaji: p.phoneticRomaji,
        kanjiBreakdown: p.kanjiBreakdown,
      })) || [],
    kanji:
      queryWithCards?.kanji.map((k) => ({
        englishMeaning: k.englishMeaning,
        kanji: k.kanji,
        phoneticKana: k.phoneticKana,
        phoneticRomaji: k.phoneticRomaji,
      })) || [],
  }
}

/** Get all cards for a specific query */
export async function getCardsForQuery(queryId: number): Promise<CardData> {
  const queryWithCards = await getQueryWithCards(queryId)

  return {
    phrases:
      queryWithCards?.phrases.map((p) => ({
        englishMeaning: p.englishMeaning,
        kanji: p.kanji,
        phoneticKana: p.phoneticKana,
        phoneticRomaji: p.phoneticRomaji,
        kanjiBreakdown: p.kanjiBreakdown,
      })) || [],
    kanji:
      queryWithCards?.kanji.map((k) => ({
        englishMeaning: k.englishMeaning,
        kanji: k.kanji,
        phoneticKana: k.phoneticKana,
        phoneticRomaji: k.phoneticRomaji,
      })) || [],
  }
}

/** Get all cards across all queries */
export async function getAllCards(): Promise<CardData> {
  const [phrases, kanji] = await Promise.all([getAllPhrases(), getAllKanji()])

  return {
    phrases: phrases.map((p) => ({
      englishMeaning: p.englishMeaning,
      kanji: p.kanji,
      phoneticKana: p.phoneticKana,
      phoneticRomaji: p.phoneticRomaji,
      kanjiBreakdown: p.kanjiBreakdown,
    })),
    kanji: kanji.map((k) => ({
      englishMeaning: k.englishMeaning,
      kanji: k.kanji,
      phoneticKana: k.phoneticKana,
      phoneticRomaji: k.phoneticRomaji,
    })),
  }
}
