import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CardData } from './card-service'

export interface ExportResult {
  phrasesPath: string
  kanjiPath: string
  tempDir: string
}

/** Service for exporting cards to CSV files */
export class ExportService {
  /**
   * Export cards to CSV files in a temporary directory
   *
   * Creates separate CSV files for phrases and individual kanji
   * Returns paths to the created files
   */
  async exportToCSV(cards: CardData): Promise<ExportResult> {
    // Create temporary directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tempDir = join(tmpdir(), `cardo-export-${timestamp}`)
    mkdirSync(tempDir, { recursive: true })

    // Export phrases
    const phrasesPath = join(tempDir, 'phrases.csv')
    const phrasesCSV = this.convertPhrasesToCSV(cards.phrases)
    writeFileSync(phrasesPath, phrasesCSV, 'utf-8')

    // Export individual kanji
    const kanjiPath = join(tempDir, 'individual_kanji.csv')
    const kanjiCSV = this.convertKanjiToCSV(cards.individualKanji)
    writeFileSync(kanjiPath, kanjiCSV, 'utf-8')

    return {
      phrasesPath,
      kanjiPath,
      tempDir,
    }
  }

  /** Convert phrases to CSV format */
  private convertPhrasesToCSV(phrases: CardData['phrases']): string {
    const headers = [
      'English Meaning',
      'Kanji',
      'Phonetic Kana',
      'Phonetic Romaji',
      'Kanji Breakdown',
    ]
    const rows = phrases.map((phrase) => [
      this.escapeCsvField(phrase.englishMeaning),
      this.escapeCsvField(phrase.kanji),
      this.escapeCsvField(phrase.phoneticKana),
      this.escapeCsvField(phrase.phoneticRomaji),
      this.escapeCsvField(phrase.kanjiBreakdown),
    ])

    return [headers, ...rows].map((row) => row.join(',')).join('\n')
  }

  /** Convert individual kanji to CSV format */
  private convertKanjiToCSV(kanji: CardData['individualKanji']): string {
    const headers = ['English Meaning', 'Kanji', 'Phonetic Kana', 'Phonetic Romaji']
    const rows = kanji.map((k) => [
      this.escapeCsvField(k.englishMeaning),
      this.escapeCsvField(k.kanji),
      this.escapeCsvField(k.phoneticKana),
      this.escapeCsvField(k.phoneticRomaji),
    ])

    return [headers, ...rows].map((row) => row.join(',')).join('\n')
  }

  /** Escape CSV field by wrapping in quotes and escaping internal quotes */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }
}
