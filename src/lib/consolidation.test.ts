import { describe, expect, it, vi } from 'vitest'
import { consolidate, type RawLlmResponse } from './consolidation'

// Mock the database module
vi.mock('./database', () => ({
  getExistingKanji: vi.fn(),
}))

// Mock the logger
vi.mock('./logger', () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock the LLM service
vi.mock('./llm', () => ({
  createLlmService: vi.fn(() => ({
    generateKanjiMeanings: vi.fn().mockResolvedValue([]),
  })),
}))

// Import the mocked function
const { getExistingKanji } = await import('./database')
const mockGetExistingKanji = vi.mocked(getExistingKanji)

describe('consolidate', () => {
  it('separates phrases from individual kanji', async () => {
    mockGetExistingKanji.mockResolvedValue([])

    const rawData: RawLlmResponse[] = [
      {
        kanji: '出口',
        englishMeaning: 'Exit',
        phoneticKana: 'でぐち',
        phoneticRomaji: 'deguchi',
        kanjiBreakdown: '出 = exit / 口 = mouth',
      },
      {
        kanji: '出',
        englishMeaning: 'exit',
        phoneticKana: 'で',
        phoneticRomaji: 'de',
        kanjiBreakdown: '',
      },
    ]

    const result = await consolidate(rawData)

    expect(result.phrases).toHaveLength(1)
    expect(result.phrases[0]).toMatchObject({
      kanji: '出口',
      englishMeaning: 'Exit',
    })

    expect(result.kanji).toHaveLength(1)
    expect(result.kanji[0]).toMatchObject({
      kanji: '出',
      englishMeaning: 'exit',
    })
  })

  it('extracts kanji from phrase breakdowns', async () => {
    mockGetExistingKanji.mockResolvedValue([])

    const rawData: RawLlmResponse[] = [
      {
        kanji: '現金のみ',
        englishMeaning: 'Cash Only',
        phoneticKana: 'げんきんのみ',
        phoneticRomaji: 'genkin nomi',
        kanjiBreakdown: '現金 = cash / のみ = only',
      },
    ]

    const result = await consolidate(rawData)

    expect(result.phrases).toHaveLength(1)
    // Should extract 現 and 金 from the breakdown
    expect(mockGetExistingKanji).toHaveBeenCalledWith(['現', '金'])
  })

  it('deduplicates against existing kanji', async () => {
    mockGetExistingKanji.mockResolvedValue(['出'])

    const rawData: RawLlmResponse[] = [
      {
        kanji: '出口',
        englishMeaning: 'Exit',
        phoneticKana: 'でぐち',
        phoneticRomaji: 'deguchi',
        kanjiBreakdown: '出 = exit / 口 = mouth',
      },
    ]

    const result = await consolidate(rawData)

    // Should not include 出 since it already exists
    // But should want to include 口 since it's new
    expect(result.kanji).toHaveLength(0)
  })

  it('handles kata only breakdowns', async () => {
    mockGetExistingKanji.mockResolvedValue([])

    const rawData: RawLlmResponse[] = [
      {
        kanji: 'ひらがな',
        englishMeaning: 'Hiragana',
        phoneticKana: 'ひらがな',
        phoneticRomaji: 'hiragana',
        kanjiBreakdown: 'kata only',
      },
    ]

    const result = await consolidate(rawData)

    expect(result.phrases).toHaveLength(1)
    expect(mockGetExistingKanji).toHaveBeenCalledWith([])
  })

  it('handles complex breakdown formats', async () => {
    mockGetExistingKanji.mockResolvedValue([])

    const rawData: RawLlmResponse[] = [
      {
        kanji: '薬局',
        englishMeaning: 'Pharmacy',
        phoneticKana: 'やっきょく',
        phoneticRomaji: 'yakkyoku',
        kanjiBreakdown: '薬 = medicine / 局 = office',
      },
    ]

    const result = await consolidate(rawData)

    expect(result.phrases).toHaveLength(1)
    expect(mockGetExistingKanji).toHaveBeenCalledWith(['薬', '局'])
  })
})
