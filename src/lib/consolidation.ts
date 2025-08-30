import { getExistingKanji } from './database'
import { createLlmService } from './llm'
import { log } from './logger'
import type { KanjiInfo, PhraseInfo } from './types/core'

export interface PhrasesResponse extends PhraseInfo {}

export interface KanjiResponse extends KanjiInfo {}

export interface ConsolidationResult {
  phrases: PhraseInfo[]
  kanji: KanjiInfo[]
}

/**
 * Consolidate raw LLM response into phrases and individual kanji
 *
 * Process:
 * 1. Separate 1-char (individual kanji) from 2+ char (phrases)
 * 2. Extract individual kanji from phrase breakdowns
 * 3. Deduplicate against existing kanji in database
 * 4. Query LLM for meanings of new kanji that don't have data
 * 5. Return structured data for further processing
 */
export async function consolidate(rawData: PhrasesResponse[]): Promise<ConsolidationResult> {
  const phrases: ConsolidationResult['phrases'] = []
  const kanjiSet = new Set<string>()
  const kanjiData = new Map<string, { meaning: string; kana: string; romaji: string }>()

  // Step 1: Separate phrases (2+ chars) from individual kanji (1 char)
  for (const item of rawData) {
    if (item.kanji.length >= 2) {
      // This is a phrase
      phrases.push({
        englishMeaning: item.englishMeaning,
        kanji: item.kanji,
        phoneticKana: item.phoneticKana,
        phoneticRomaji: item.phoneticRomaji,
        kanjiBreakdown: item.kanjiBreakdown,
      })

      // Step 2: Extract individual kanji from breakdown
      const extractedKanji = extractKanjiFromBreakdown(item.kanjiBreakdown)
      for (const kanjiChar of extractedKanji) {
        kanjiSet.add(kanjiChar)
      }
    } else if (item.kanji.length === 1) {
      // This is individual kanji
      kanjiSet.add(item.kanji)
      kanjiData.set(item.kanji, {
        meaning: item.englishMeaning,
        kana: item.phoneticKana,
        romaji: item.phoneticRomaji,
      })
    }
  }

  // Step 3: Deduplicate against existing kanji in database
  const existingKanji = await getExistingKanji([...kanjiSet])
  const newKanji = [...kanjiSet].filter((k) => !existingKanji.includes(k))

  // Step 4: Identify kanji that need LLM lookup
  const kanjiNeedingLookup: string[] = []
  for (const kanjiChar of newKanji) {
    if (!kanjiData.has(kanjiChar)) {
      kanjiNeedingLookup.push(kanjiChar)
    }
  }

  // Step 5: Query LLM for missing kanji meanings
  if (kanjiNeedingLookup.length > 0) {
    log.info({ count: kanjiNeedingLookup.length }, 'Querying LLM for meanings of kanji')
    try {
      const llmService = createLlmService()
      const llmKanjiData = await llmService.generateKanjiMeanings(kanjiNeedingLookup)

      // Add LLM data to our map
      for (const kanjiInfo of llmKanjiData) {
        kanjiData.set(kanjiInfo.kanji, {
          meaning: kanjiInfo.englishMeaning,
          kana: kanjiInfo.phoneticKana,
          romaji: kanjiInfo.phoneticRomaji,
        })
      }
    } catch (error) {
      log.warn({ error }, 'Failed to get kanji meanings from LLM')
    }
  }

  // Step 6: Build result for new kanji that have data
  const kanji: ConsolidationResult['kanji'] = []
  for (const kanjiChar of newKanji) {
    const data = kanjiData.get(kanjiChar)
    if (data) {
      kanji.push({
        englishMeaning: data.meaning,
        kanji: kanjiChar,
        phoneticKana: data.kana,
        phoneticRomaji: data.romaji,
      })
    }
  }

  return {
    phrases,
    kanji,
  }
}

/**
 * Extract individual kanji characters from breakdown text
 *
 * Handles formats like:
 * - "出 = exit / 口 = mouth"
 * - "現金 = cash / のみ = only"
 * - "kata only" (no kanji)
 */
function extractKanjiFromBreakdown(breakdown: string): string[] {
  if (breakdown.toLowerCase().includes('kata only')) {
    return []
  }

  const kanji: string[] = []

  // Split by common delimiters and extract kanji characters
  const parts = breakdown.split(/[/,;]/)

  for (const part of parts) {
    // Look for patterns like "漢字 = meaning" or "漢字=" or just "漢字"
    const match = part.trim().match(/^([一-龯]+)/)
    if (match) {
      const kanjiChars = match[1]
      // Add each individual character
      if (kanjiChars) {
        for (const char of kanjiChars) {
          if (isKanji(char)) {
            kanji.push(char)
          }
        }
      }
    }
  }

  return [...new Set(kanji)] // Remove duplicates
}

/** Check if a character is a kanji character */
function isKanji(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9faf) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) // CJK Extension E
  )
}
