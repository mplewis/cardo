import { describe, expect, it, vi } from 'vitest'
import { exportAndShowResult } from './export-utils'
import type { CardData } from './types/core'

// Mock the dependencies
vi.mock('./environment', () => ({
  isClaudeCodeContext: vi.fn(),
}))

vi.mock('./export', () => ({
  exportToCSV: vi.fn(),
}))

const mockIsClaudeCodeContext = vi.mocked(await import('./environment')).isClaudeCodeContext
const mockExportToCSV = vi.mocked(await import('./export')).exportToCSV

describe('export-utils', () => {
  const mockCardData: CardData = {
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
        englishMeaning: 'exit, go out',
        kanji: '出',
        phoneticKana: 'で',
        phoneticRomaji: 'de',
      },
    ],
  }

  const mockExportResult = {
    phrasesPath: '/tmp/phrases.csv',
    kanjiPath: '/tmp/kanji.csv',
    tempDir: '/tmp/cardo-export-123',
  }

  const mockLogger = {
    log: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockExportToCSV.mockResolvedValue(mockExportResult)
  })

  describe('exportAndShowResult', () => {
    it('opens files when noOpenFlag is false and not in Claude Code context', async () => {
      mockIsClaudeCodeContext.mockReturnValue(false)

      const result = await exportAndShowResult(mockCardData, false, mockLogger)

      expect(mockExportToCSV).toHaveBeenCalledWith(mockCardData, true)
      expect(result).toBe(mockExportResult)
      expect(mockLogger.log).toHaveBeenCalledWith('\nCSV files exported to: /tmp/cardo-export-123')
      expect(mockLogger.log).toHaveBeenCalledWith('CSV files opened automatically')
      expect(mockLogger.log).toHaveBeenCalledTimes(2)
    })

    it('does not open files when noOpenFlag is true', async () => {
      mockIsClaudeCodeContext.mockReturnValue(false)

      const result = await exportAndShowResult(mockCardData, true, mockLogger)

      expect(mockExportToCSV).toHaveBeenCalledWith(mockCardData, false)
      expect(result).toBe(mockExportResult)
      expect(mockLogger.log).toHaveBeenCalledWith('\nCSV files exported to: /tmp/cardo-export-123')
      expect(mockLogger.log).toHaveBeenCalledTimes(1)
    })

    it('does not open files in Claude Code context but shows appropriate message', async () => {
      mockIsClaudeCodeContext.mockReturnValue(true)

      const result = await exportAndShowResult(mockCardData, false, mockLogger)

      expect(mockExportToCSV).toHaveBeenCalledWith(mockCardData, false)
      expect(result).toBe(mockExportResult)
      expect(mockLogger.log).toHaveBeenCalledWith('\nCSV files exported to: /tmp/cardo-export-123')
      expect(mockLogger.log).toHaveBeenCalledWith('CSV files not opened (Claude Code context)')
      expect(mockLogger.log).toHaveBeenCalledTimes(2)
    })

    it('does not show Claude Code message when noOpenFlag is true even in Claude Code context', async () => {
      mockIsClaudeCodeContext.mockReturnValue(true)

      const result = await exportAndShowResult(mockCardData, true, mockLogger)

      expect(mockExportToCSV).toHaveBeenCalledWith(mockCardData, false)
      expect(result).toBe(mockExportResult)
      expect(mockLogger.log).toHaveBeenCalledWith('\nCSV files exported to: /tmp/cardo-export-123')
      expect(mockLogger.log).toHaveBeenCalledTimes(1)
    })
  })
})
