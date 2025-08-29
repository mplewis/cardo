import { describe, expect, it } from 'vitest'
import type { Kanji, Phrase } from '../generated/prisma'
import {
  deduplicateByKey,
  deduplicateKanji,
  deduplicatePhrases,
  mapDbKanjiToCardData,
  mapDbPhrasesToCardData,
} from './data-utils'

describe('data-utils', () => {
  describe('mapDbPhrasesToCardData', () => {
    it('maps database phrases to card data format', () => {
      const dbPhrases: Phrase[] = [
        {
          id: 1,
          queryId: 1,
          englishMeaning: 'Exit',
          kanji: '出口',
          phoneticKana: 'でぐち',
          phoneticRomaji: 'deguchi',
          kanjiBreakdown: '出 = exit / 口 = mouth',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
      ]

      const result = mapDbPhrasesToCardData(dbPhrases)

      expect(result).toEqual([
        {
          englishMeaning: 'Exit',
          kanji: '出口',
          phoneticKana: 'でぐち',
          phoneticRomaji: 'deguchi',
          kanjiBreakdown: '出 = exit / 口 = mouth',
        },
      ])
    })

    it('handles empty array', () => {
      const result = mapDbPhrasesToCardData([])
      expect(result).toEqual([])
    })
  })

  describe('mapDbKanjiToCardData', () => {
    it('maps database kanji to card data format', () => {
      const dbKanji: Kanji[] = [
        {
          id: 1,
          queryId: 1,
          englishMeaning: 'exit, go out',
          kanji: '出',
          phoneticKana: 'で',
          phoneticRomaji: 'de',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
      ]

      const result = mapDbKanjiToCardData(dbKanji)

      expect(result).toEqual([
        {
          englishMeaning: 'exit, go out',
          kanji: '出',
          phoneticKana: 'で',
          phoneticRomaji: 'de',
        },
      ])
    })

    it('handles empty array', () => {
      const result = mapDbKanjiToCardData([])
      expect(result).toEqual([])
    })
  })

  describe('deduplicateByKey', () => {
    it('deduplicates items by key, keeping item with lowest ID', () => {
      const items = [
        { id: 2, name: 'apple', value: 'red' },
        { id: 1, name: 'apple', value: 'green' },
        { id: 3, name: 'banana', value: 'yellow' },
      ]

      const result = deduplicateByKey(items, (item) => item.name)

      expect(result).toEqual([
        { id: 1, name: 'apple', value: 'green' },
        { id: 3, name: 'banana', value: 'yellow' },
      ])
    })

    it('uses custom selector function', () => {
      const items = [
        { id: 2, name: 'apple', value: 'red' },
        { id: 1, name: 'apple', value: 'green' },
      ]

      const result = deduplicateByKey(
        items,
        (item) => item.name,
        (existing, candidate) => (existing.id > candidate.id ? existing : candidate)
      )

      expect(result).toEqual([{ id: 2, name: 'apple', value: 'red' }])
    })

    it('handles empty array', () => {
      const result = deduplicateByKey([], (item) => item.toString())
      expect(result).toEqual([])
    })
  })

  describe('deduplicatePhrases', () => {
    it('deduplicates phrases by kanji, keeping earliest created', () => {
      const phrases: Phrase[] = [
        {
          id: 2,
          queryId: 1,
          englishMeaning: 'Exit (newer)',
          kanji: '出口',
          phoneticKana: 'でぐち',
          phoneticRomaji: 'deguchi',
          kanjiBreakdown: '出 = exit / 口 = mouth',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
        {
          id: 1,
          queryId: 1,
          englishMeaning: 'Exit (older)',
          kanji: '出口',
          phoneticKana: 'でぐち',
          phoneticRomaji: 'deguchi',
          kanjiBreakdown: '出 = exit / 口 = mouth',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        {
          id: 3,
          queryId: 1,
          englishMeaning: 'Station',
          kanji: '駅',
          phoneticKana: 'えき',
          phoneticRomaji: 'eki',
          kanjiBreakdown: '駅 = station',
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
        },
      ]

      const result = deduplicatePhrases(phrases)

      expect(result).toHaveLength(2)
      expect(result[0].englishMeaning).toBe('Exit (older)')
      expect(result[1].englishMeaning).toBe('Station')
    })
  })

  describe('deduplicateKanji', () => {
    it('deduplicates kanji by character, keeping earliest created', () => {
      const kanji: Kanji[] = [
        {
          id: 2,
          queryId: 1,
          englishMeaning: 'exit, go out (newer)',
          kanji: '出',
          phoneticKana: 'で',
          phoneticRomaji: 'de',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
        {
          id: 1,
          queryId: 1,
          englishMeaning: 'exit, go out (older)',
          kanji: '出',
          phoneticKana: 'で',
          phoneticRomaji: 'de',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        {
          id: 3,
          queryId: 1,
          englishMeaning: 'station',
          kanji: '駅',
          phoneticKana: 'えき',
          phoneticRomaji: 'eki',
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
        },
      ]

      const result = deduplicateKanji(kanji)

      expect(result).toHaveLength(2)
      expect(result[0].englishMeaning).toBe('exit, go out (older)')
      expect(result[1].englishMeaning).toBe('station')
    })
  })
})
