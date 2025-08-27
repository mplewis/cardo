import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CardData } from '../lib/card'
import { exportToCSV } from '../lib/export'

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
      kanji: [
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

    const result = await exportToCSV(cardData)

    // Check that files exist and have correct structure
    expect(result.phrasesPath).toBeTruthy()
    expect(result.kanjiPath).toBeTruthy()
    expect(result.tempDir).toBeTruthy()

    // Verify phrases CSV content
    const phrasesContent = readFileSync(result.phrasesPath, 'utf-8')
    expect(phrasesContent).toMatchInlineSnapshot(`
      "English Meaning,Kanji,Phonetic Kana,Phonetic Romaji,Kanji Breakdown
      Exit,出口,でぐち,deguchi,出 = exit / 口 = mouth
      Cash Only,現金のみ,げんきんのみ,genkin nomi,現金 = cash / のみ = only"
    `)

    // Verify kanji CSV content
    const kanjiContent = readFileSync(result.kanjiPath, 'utf-8')
    expect(kanjiContent).toMatchInlineSnapshot(`
      "English Meaning,Kanji,Phonetic Kana,Phonetic Romaji
      exit,出,で,de
      "mouth, opening",口,くち,kuchi"
    `)
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
      kanji: [],
    }

    const result = await exportToCSV(cardData)
    const phrasesContent = readFileSync(result.phrasesPath, 'utf-8')

    expect(phrasesContent).toMatchInlineSnapshot(`
      "English Meaning,Kanji,Phonetic Kana,Phonetic Romaji,Kanji Breakdown
      "Test ""quoted"" text",漢字,かんじ,kanji,"Contains, comma and ""quotes""""
    `)
  })

  it('handles empty data', async () => {
    const cardData: CardData = {
      phrases: [],
      kanji: [],
    }

    const result = await exportToCSV(cardData)

    // Should still create files with just headers
    const phrasesContent = readFileSync(result.phrasesPath, 'utf-8')
    expect(phrasesContent).toMatchInlineSnapshot(
      `"English Meaning,Kanji,Phonetic Kana,Phonetic Romaji,Kanji Breakdown"`
    )

    const kanjiContent = readFileSync(result.kanjiPath, 'utf-8')
    expect(kanjiContent).toMatchInlineSnapshot(
      `"English Meaning,Kanji,Phonetic Kana,Phonetic Romaji"`
    )
  })

  it('supports auto-open parameter', async () => {
    const cardData: CardData = {
      phrases: [],
      kanji: [],
    }

    // Test that autoOpen parameter is accepted (actual file opening behavior
    // is platform-dependent and hard to test reliably)
    const result = await exportToCSV(cardData, false)
    expect(result.phrasesPath).toBeTruthy()
    expect(result.kanjiPath).toBeTruthy()

    // Should not throw when autoOpen is true, even if opening fails
    const resultWithAutoOpen = await exportToCSV(cardData, true)
    expect(resultWithAutoOpen.phrasesPath).toBeTruthy()
    expect(resultWithAutoOpen.kanjiPath).toBeTruthy()
  })
})
