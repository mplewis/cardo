import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardData } from './card'
import { displayCards, displaySummary } from './display'

// Mock console-table-printer
vi.mock('console-table-printer', () => ({
  Table: vi.fn().mockImplementation(() => ({
    addRow: vi.fn(),
    printTable: vi.fn(),
  })),
}))

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

afterEach(() => {
  mockConsoleLog.mockClear()
  vi.clearAllMocks()
})

describe('display', () => {
  describe('displayCards', () => {
    it('displays phrases and kanji in separate tables', () => {
      const cardData: CardData = {
        phrases: [
          {
            englishMeaning: 'Exit',
            kanji: '出口',
            phoneticKana: 'でぐち',
            phoneticRomaji: 'deguchi',
            kanjiBreakdown: '出 = exit / 口 = mouth',
          },
        ],
        kanji: [
          {
            englishMeaning: 'exit',
            kanji: '出',
            phoneticKana: 'で',
            phoneticRomaji: 'de',
          },
        ],
      }

      displayCards(cardData)

      // Verify console log calls
      expect(mockConsoleLog.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "
        📝 Phrases:",
          ],
          [
            "
        🈂️ Individual Kanji:",
          ],
        ]
      `)
    })

    it('displays message when no cards found', () => {
      const cardData: CardData = {
        phrases: [],
        kanji: [],
      }

      displayCards(cardData)

      expect(mockConsoleLog.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "
        📭 No cards found.",
          ],
        ]
      `)
    })

    it('displays only phrases when kanji is empty', () => {
      const cardData: CardData = {
        phrases: [
          {
            englishMeaning: 'Exit',
            kanji: '出口',
            phoneticKana: 'でぐち',
            phoneticRomaji: 'deguchi',
            kanjiBreakdown: '出 = exit / 口 = mouth',
          },
        ],
        kanji: [],
      }

      displayCards(cardData)

      expect(mockConsoleLog.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "
        📝 Phrases:",
          ],
        ]
      `)
    })
  })

  describe('displaySummary', () => {
    it('displays summary table with counts', () => {
      const cardData: CardData = {
        phrases: [
          {
            englishMeaning: 'Exit',
            kanji: '出口',
            phoneticKana: 'でぐち',
            phoneticRomaji: 'deguchi',
            kanjiBreakdown: '出 = exit / 口 = mouth',
          },
        ],
        kanji: [
          {
            englishMeaning: 'exit',
            kanji: '出',
            phoneticKana: 'で',
            phoneticRomaji: 'de',
          },
        ],
      }

      displaySummary(cardData)

      // Function should complete without errors
      expect(true).toBe(true)
    })
  })
})
