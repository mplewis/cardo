import type { DatabaseService } from './database-service'

export interface RawLlmResponse {
  kanji: string
  englishMeaning: string
  phoneticKana: string
  phoneticRomaji: string
  kanjiBreakdown: string
}

export interface ConsolidationResult {
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

/** Service for consolidating LLM responses into structured data */
export class ConsolidationService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Consolidate raw LLM response into phrases and individual kanji
   *
   * Process:
   * 1. Separate 1-char (individual kanji) from 2+ char (phrases)
   * 2. Extract individual kanji from phrase breakdowns
   * 3. Deduplicate against existing kanji in database
   * 4. Return structured data for further processing
   */
  async consolidate(rawData: RawLlmResponse[]): Promise<ConsolidationResult> {
    const phrases: ConsolidationResult['phrases'] = []
    const individualKanjiSet = new Set<string>()
    const individualKanjiData = new Map<string, { meaning: string; kana: string; romaji: string }>()

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
        const extractedKanji = this.extractKanjiFromBreakdown(item.kanjiBreakdown)
        for (const kanjiChar of extractedKanji) {
          individualKanjiSet.add(kanjiChar)
        }
      } else if (item.kanji.length === 1) {
        // This is individual kanji
        individualKanjiSet.add(item.kanji)
        individualKanjiData.set(item.kanji, {
          meaning: item.englishMeaning,
          kana: item.phoneticKana,
          romaji: item.phoneticRomaji,
        })
      }
    }

    // Step 3: Deduplicate against existing kanji in database
    const existingKanji = await this.dbService.getExistingKanji([...individualKanjiSet])
    const newKanji = [...individualKanjiSet].filter((k) => !existingKanji.includes(k))

    // Build result for new kanji that have data
    const individualKanji: ConsolidationResult['individualKanji'] = []
    for (const kanjiChar of newKanji) {
      const data = individualKanjiData.get(kanjiChar)
      if (data) {
        individualKanji.push({
          englishMeaning: data.meaning,
          kanji: kanjiChar,
          phoneticKana: data.kana,
          phoneticRomaji: data.romaji,
        })
      }
    }

    return {
      phrases,
      individualKanji,
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
  private extractKanjiFromBreakdown(breakdown: string): string[] {
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
        for (const char of kanjiChars) {
          if (this.isKanji(char)) {
            kanji.push(char)
          }
        }
      }
    }

    return [...new Set(kanji)] // Remove duplicates
  }

  /** Check if a character is a kanji character */
  private isKanji(char: string): boolean {
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
}
