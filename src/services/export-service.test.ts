import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CardData } from './card-service'
import { ExportService } from './export-service'

describe('ExportService', () => {
  const service = new ExportService()

  describe('exportToCSV', () => {
    it('creates CSV files for phrases and kanji', async () => {
      const cardData: CardData = {
        phrases: [
          {
            englishMeaning: 'Exit',
            kanji: '出口',
            phoneticKana: 'でぐち',
            phoneticRomaji: 'deguchi',
            kanjiBreakdown: '出 = exit / 口 = mouth',
          },
          {
            englishMeaning: 'Cash Only',
            kanji: '現金のみ',
            phoneticKana: 'げんきんのみ',
            phoneticRomaji: 'genkin nomi',
            kanjiBreakdown: '現金 = cash / のみ = only',
          },
        ],
        individualKanji: [
          {
            englishMeaning: 'exit',
            kanji: '出',
            phoneticKana: 'で',
            phoneticRomaji: 'de',
          },
          {
            englishMeaning: 'mouth, opening',
            kanji: '口',
            phoneticKana: 'くち',
            phoneticRomaji: 'kuchi',
          },
        ],
      }

      const result = await service.exportToCSV(cardData)

      // Check that files exist and have correct structure
      expect(result.phrasesPath).toBeTruthy()
      expect(result.kanjiPath).toBeTruthy()
      expect(result.tempDir).toBeTruthy()

      // Verify phrases CSV content
      const phrasesContent = readFileSync(result.phrasesPath, 'utf-8')
      const phrasesLines = phrasesContent.split('\n')

      expect(phrasesLines[0]).toBe(
        'English Meaning,Kanji,Phonetic Kana,Phonetic Romaji,Kanji Breakdown'
      )
      expect(phrasesLines[1]).toBe('Exit,出口,でぐち,deguchi,出 = exit / 口 = mouth')
      expect(phrasesLines[2]).toBe(
        'Cash Only,現金のみ,げんきんのみ,genkin nomi,現金 = cash / のみ = only'
      )

      // Verify kanji CSV content
      const kanjiContent = readFileSync(result.kanjiPath, 'utf-8')
      const kanjiLines = kanjiContent.split('\n')

      expect(kanjiLines[0]).toBe('English Meaning,Kanji,Phonetic Kana,Phonetic Romaji')
      expect(kanjiLines[1]).toBe('exit,出,で,de')
      expect(kanjiLines[2]).toBe('"mouth, opening",口,くち,kuchi')
    })

    it('handles CSV escaping correctly', async () => {
      const cardData: CardData = {
        phrases: [
          {
            englishMeaning: 'Test "quoted" text',
            kanji: '漢字',
            phoneticKana: 'かんじ',
            phoneticRomaji: 'kanji',
            kanjiBreakdown: 'Contains, comma and "quotes"',
          },
        ],
        individualKanji: [],
      }

      const result = await service.exportToCSV(cardData)
      const phrasesContent = readFileSync(result.phrasesPath, 'utf-8')
      const phrasesLines = phrasesContent.split('\n')

      expect(phrasesLines[1]).toBe(
        '"Test ""quoted"" text",漢字,かんじ,kanji,"Contains, comma and ""quotes"""'
      )
    })

    it('handles empty data', async () => {
      const cardData: CardData = {
        phrases: [],
        individualKanji: [],
      }

      const result = await service.exportToCSV(cardData)

      // Should still create files with just headers
      const phrasesContent = readFileSync(result.phrasesPath, 'utf-8')
      expect(phrasesContent).toBe(
        'English Meaning,Kanji,Phonetic Kana,Phonetic Romaji,Kanji Breakdown'
      )

      const kanjiContent = readFileSync(result.kanjiPath, 'utf-8')
      expect(kanjiContent).toBe('English Meaning,Kanji,Phonetic Kana,Phonetic Romaji')
    })
  })
})
