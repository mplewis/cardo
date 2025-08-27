import { describe, expect, it, vi } from 'vitest'
import { ConsolidationService, type RawLlmResponse } from './consolidation-service'
import type { DatabaseService } from './database-service'

describe('ConsolidationService', () => {
  const mockDbService = {
    getExistingKanji: vi.fn(),
  } as unknown as DatabaseService

  const service = new ConsolidationService(mockDbService)

  describe('consolidate', () => {
    it('separates phrases from individual kanji', async () => {
      vi.mocked(mockDbService.getExistingKanji).mockResolvedValue([])

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

      const result = await service.consolidate(rawData)

      expect(result.phrases).toHaveLength(1)
      expect(result.phrases[0]).toMatchObject({
        kanji: '出口',
        englishMeaning: 'Exit',
      })

      expect(result.individualKanji).toHaveLength(1)
      expect(result.individualKanji[0]).toMatchObject({
        kanji: '出',
        englishMeaning: 'exit',
      })
    })

    it('extracts kanji from phrase breakdowns', async () => {
      vi.mocked(mockDbService.getExistingKanji).mockResolvedValue([])

      const rawData: RawLlmResponse[] = [
        {
          kanji: '現金のみ',
          englishMeaning: 'Cash Only',
          phoneticKana: 'げんきんのみ',
          phoneticRomaji: 'genkin nomi',
          kanjiBreakdown: '現金 = cash / のみ = only',
        },
      ]

      const result = await service.consolidate(rawData)

      expect(result.phrases).toHaveLength(1)
      // Should extract 現 and 金 from the breakdown
      expect(mockDbService.getExistingKanji).toHaveBeenCalledWith(['現', '金'])
    })

    it('deduplicates against existing kanji', async () => {
      vi.mocked(mockDbService.getExistingKanji).mockResolvedValue(['出'])

      const rawData: RawLlmResponse[] = [
        {
          kanji: '出口',
          englishMeaning: 'Exit',
          phoneticKana: 'でぐち',
          phoneticRomaji: 'deguchi',
          kanjiBreakdown: '出 = exit / 口 = mouth',
        },
      ]

      const result = await service.consolidate(rawData)

      // Should not include 出 since it already exists
      // But should want to include 口 since it's new
      expect(result.individualKanji).toHaveLength(0)
    })

    it('handles kata only breakdowns', async () => {
      vi.mocked(mockDbService.getExistingKanji).mockResolvedValue([])

      const rawData: RawLlmResponse[] = [
        {
          kanji: 'ひらがな',
          englishMeaning: 'Hiragana',
          phoneticKana: 'ひらがな',
          phoneticRomaji: 'hiragana',
          kanjiBreakdown: 'kata only',
        },
      ]

      const result = await service.consolidate(rawData)

      expect(result.phrases).toHaveLength(1)
      expect(mockDbService.getExistingKanji).toHaveBeenCalledWith([])
    })

    it('handles complex breakdown formats', async () => {
      vi.mocked(mockDbService.getExistingKanji).mockResolvedValue([])

      const rawData: RawLlmResponse[] = [
        {
          kanji: '薬局',
          englishMeaning: 'Pharmacy',
          phoneticKana: 'やっきょく',
          phoneticRomaji: 'yakkyoku',
          kanjiBreakdown: '薬 = medicine / 局 = office',
        },
      ]

      const result = await service.consolidate(rawData)

      expect(result.phrases).toHaveLength(1)
      expect(mockDbService.getExistingKanji).toHaveBeenCalledWith(['薬', '局'])
    })
  })
})
