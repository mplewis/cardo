import type { Kanji, Phrase } from '../generated/prisma'
import type { CardData } from './card'

/**
 * Map database phrases to CardData format
 */
export function mapDbPhrasesToCardData(phrases: Phrase[]): CardData['phrases'] {
  return phrases.map((p) => ({
    englishMeaning: p.englishMeaning,
    kanji: p.kanji,
    phoneticKana: p.phoneticKana,
    phoneticRomaji: p.phoneticRomaji,
    kanjiBreakdown: p.kanjiBreakdown,
  }))
}

/**
 * Map database kanji to CardData format
 */
export function mapDbKanjiToCardData(kanji: Kanji[]): CardData['kanji'] {
  return kanji.map((k) => ({
    englishMeaning: k.englishMeaning,
    kanji: k.kanji,
    phoneticKana: k.phoneticKana,
    phoneticRomaji: k.phoneticRomaji,
  }))
}

/**
 * Generic deduplication function that keeps items with lowest ID
 */
export function deduplicateByKey<T extends { id: number }>(
  items: T[],
  keyExtractor: (item: T) => string,
  selector: (existing: T, candidate: T) => T = (existing, candidate) =>
    existing.id < candidate.id ? existing : candidate
): T[] {
  const seen = new Map<string, T>()

  for (const item of items) {
    const key = keyExtractor(item)
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, item)
    } else {
      seen.set(key, selector(existing, item))
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.id - b.id)
}

/**
 * Deduplicate phrases by kanji, keeping the earliest created (lowest ID)
 */
export function deduplicatePhrases(phrases: Phrase[]): Phrase[] {
  return deduplicateByKey(phrases, (phrase) => phrase.kanji)
}

/**
 * Deduplicate individual kanji by kanji character, keeping the earliest created (lowest ID)
 */
export function deduplicateKanji(kanji: Kanji[]): Kanji[] {
  return deduplicateByKey(kanji, (k) => k.kanji)
}
