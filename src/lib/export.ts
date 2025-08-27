import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CardData } from './card'

export interface ExportResult {
  phrasesPath: string
  kanjiPath: string
  tempDir: string
}

/**
 * Export cards to CSV files in a temporary directory
 *
 * Creates separate CSV files for phrases and individual kanji
 * Returns paths to the created files
 */
export async function exportToCSV(cards: CardData): Promise<ExportResult> {
  // Create temporary directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const tempDir = join(tmpdir(), `cardo-export-${timestamp}`)
  mkdirSync(tempDir, { recursive: true })

  // Export phrases
  const phrasesPath = join(tempDir, 'phrases.csv')
  const phrasesCSV = convertPhrasesToCSV(cards.phrases)
  writeFileSync(phrasesPath, phrasesCSV, 'utf-8')

  // Export individual kanji
  const kanjiPath = join(tempDir, 'kanji.csv')
  const kanjiCSV = convertKanjiToCSV(cards.kanji)
  writeFileSync(kanjiPath, kanjiCSV, 'utf-8')

  return {
    phrasesPath,
    kanjiPath,
    tempDir,
  }
}

/** Convert phrases to CSV format */
function convertPhrasesToCSV(phrases: CardData['phrases']): string {
  const headers = [
    'English Meaning',
    'Kanji',
    'Phonetic Kana',
    'Phonetic Romaji',
    'Kanji Breakdown',
  ]
  const rows = phrases.map((phrase) => [
    escapeCsvField(phrase.englishMeaning),
    escapeCsvField(phrase.kanji),
    escapeCsvField(phrase.phoneticKana),
    escapeCsvField(phrase.phoneticRomaji),
    escapeCsvField(phrase.kanjiBreakdown),
  ])

  return [headers, ...rows].map((row) => row.join(',')).join('\n')
}

/** Convert individual kanji to CSV format */
function convertKanjiToCSV(kanji: CardData['kanji']): string {
  const headers = ['English Meaning', 'Kanji', 'Phonetic Kana', 'Phonetic Romaji']
  const rows = kanji.map((k) => [
    escapeCsvField(k.englishMeaning),
    escapeCsvField(k.kanji),
    escapeCsvField(k.phoneticKana),
    escapeCsvField(k.phoneticRomaji),
  ])

  return [headers, ...rows].map((row) => row.join(',')).join('\n')
}

/** Escape CSV field by wrapping in quotes and escaping internal quotes */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}
