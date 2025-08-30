/** Core type interfaces for the application */

/** Base interface for Japanese text with phonetic representations */
export interface JapaneseText {
  /** English meaning/translation */
  englishMeaning: string
  /** Japanese characters (kanji/kana) */
  kanji: string
  /** Phonetic representation in kana */
  phoneticKana: string
  /** Phonetic representation in romaji */
  phoneticRomaji: string
}

/** Individual kanji character information */
export interface KanjiInfo extends JapaneseText {}

/** Japanese phrase information with kanji breakdown */
export interface PhraseInfo extends JapaneseText {
  /** Breakdown of individual kanji in the phrase */
  kanjiBreakdown: string
}

/** Database creation data with query association */
export interface WithQueryId {
  queryId: number
}

/** Data structure for creating kanji records in database */
export interface CreateKanjiData extends KanjiInfo, WithQueryId {}

/** Data structure for creating phrase records in database */
export interface CreatePhraseData extends PhraseInfo, WithQueryId {}

/** Collection of phrases and kanji for display/export */
export interface CardData {
  phrases: PhraseInfo[]
  kanji: KanjiInfo[]
}
