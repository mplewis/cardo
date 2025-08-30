import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import open from 'open'
import { getEnvironmentConfig } from './config'
import { KANJI_CSV_FILENAME, PHRASES_CSV_FILENAME } from './constants/file'
import { isClaudeCodeContext } from './environment'
import { log } from './logger'
import type { CardData } from './types/core'

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
export async function exportToCSV(cards: CardData, autoOpen = false): Promise<ExportResult> {
  // Create temporary directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const tempDir = join(tmpdir(), `cardo-export-${timestamp}`)
  mkdirSync(tempDir, { recursive: true })

  log.info(
    { tempDir, phraseCount: cards.phrases.length, kanjiCount: cards.kanji.length },
    'Starting CSV export'
  )

  // Export phrases
  const phrasesPath = join(tempDir, PHRASES_CSV_FILENAME)
  const phrasesCSV = convertPhrasesToCSV(cards.phrases)
  writeFileSync(phrasesPath, phrasesCSV, 'utf-8')
  log.debug({ path: phrasesPath }, 'Wrote phrases CSV')

  // Export individual kanji
  const kanjiPath = join(tempDir, KANJI_CSV_FILENAME)
  const kanjiCSV = convertKanjiToCSV(cards.kanji)
  writeFileSync(kanjiPath, kanjiCSV, 'utf-8')
  log.debug({ path: kanjiPath }, 'Wrote kanji CSV')

  // Auto-open CSV files if requested
  const { isTest } = getEnvironmentConfig()
  if (isClaudeCodeContext() || isTest) {
    // Never open in automation contexts
  } else if (autoOpen) {
    try {
      await Promise.all([open(phrasesPath), open(kanjiPath)])
      log.info('CSV files opened successfully')
    } catch (error) {
      log.warn({ error }, 'Could not open CSV files')
    }
  }

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
