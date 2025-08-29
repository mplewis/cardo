import { afterEach, describe, expect, it } from 'vitest'
import { truncateDatabase } from '../test-utils'
import {
  createKanji,
  createPhrase,
  createPhrases,
  createQuery,
  deleteQuery,
  getExistingKanji,
  getQueryWithCards,
  kanjiExists,
} from './database'

afterEach(async () => {
  await truncateDatabase()
})

describe('database', () => {
  describe('createQuery', () => {
    it('creates a new query', async () => {
      const queryData = {
        count: 5,
        domain: 'train stations',
      }

      const query = await createQuery(queryData)

      expect(query).toMatchObject({
        id: expect.any(Number),
        count: 5,
        domain: 'train stations',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })
  })

  describe('getQueryWithCards', () => {
    it('returns query with related phrases and kanji', async () => {
      const query = await createQuery({ count: 3, domain: 'test' })

      await createPhrase({
        englishMeaning: 'Exit',
        kanji: '出口',
        phoneticKana: 'でぐち',
        phoneticRomaji: 'deguchi',
        kanjiBreakdown: '出 = exit / 口 = mouth',
        queryId: query.id,
      })

      await createKanji({
        englishMeaning: 'exit',
        kanji: '出',
        phoneticKana: 'で',
        phoneticRomaji: 'de',
        queryId: query.id,
      })

      const result = await getQueryWithCards(query.id)

      expect(result).toMatchObject({
        id: query.id,
        count: 3,
        domain: 'test',
        phrases: [
          expect.objectContaining({
            kanji: '出口',
            englishMeaning: 'Exit',
          }),
        ],
        kanji: [
          expect.objectContaining({
            kanji: '出',
            englishMeaning: 'exit',
          }),
        ],
      })
    })
  })

  describe('createPhrases', () => {
    it('creates multiple phrases', async () => {
      const query = await createQuery({ count: 3, domain: 'test' })

      const phrases = [
        {
          englishMeaning: 'Exit',
          kanji: '出口',
          phoneticKana: 'でぐち',
          phoneticRomaji: 'deguchi',
          kanjiBreakdown: '出 = exit / 口 = mouth',
          queryId: query.id,
        },
        {
          englishMeaning: 'Entrance',
          kanji: '入口',
          phoneticKana: 'いりぐち',
          phoneticRomaji: 'iriguchi',
          kanjiBreakdown: '入 = enter / 口 = mouth',
          queryId: query.id,
        },
      ]

      await createPhrases(phrases)

      const result = await getQueryWithCards(query.id)
      expect(result?.phrases).toHaveLength(2)
    })
  })

  describe('kanjiExists', () => {
    it('returns true for existing kanji', async () => {
      const query = await createQuery({ count: 3, domain: 'test' })

      await createKanji({
        englishMeaning: 'exit',
        kanji: '出',
        phoneticKana: 'で',
        phoneticRomaji: 'de',
        queryId: query.id,
      })

      const exists = await kanjiExists('出')
      expect(exists).toBe(true)
    })

    it('returns false for non-existing kanji', async () => {
      const exists = await kanjiExists('非')
      expect(exists).toBe(false)
    })
  })

  describe('getExistingKanji', () => {
    it('returns only existing kanji from list', async () => {
      const query = await createQuery({ count: 3, domain: 'test' })

      await createKanji({
        englishMeaning: 'exit',
        kanji: '出',
        phoneticKana: 'で',
        phoneticRomaji: 'de',
        queryId: query.id,
      })

      const existing = await getExistingKanji(['出', '入', '口'])
      expect(existing).toEqual(['出'])
    })
  })

  describe('deleteQuery', () => {
    it('deletes query and cascades to related data', async () => {
      const query = await createQuery({ count: 3, domain: 'test' })

      await createPhrase({
        englishMeaning: 'Exit',
        kanji: '出口',
        phoneticKana: 'でぐち',
        phoneticRomaji: 'deguchi',
        kanjiBreakdown: '出 = exit / 口 = mouth',
        queryId: query.id,
      })

      await deleteQuery(query.id)

      const result = await getQueryWithCards(query.id)
      expect(result).toBeNull()
    })
  })
})
