import { readFile } from 'node:fs/promises'
import type { ChatModel, ModelProvider } from 'any-llm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LlmService } from './llm'

const mockClient = {
  createChatCompletionNonStreaming: vi.fn(),
}

vi.mock('node:fs/promises')
vi.mock('any-llm', () => ({
  Client: vi.fn(() => mockClient),
  ModelProvider: {
    OpenAI: 'OpenAI',
    Anthropic: 'Anthropic',
    Google: 'Google',
  },
  ChatRoles: {
    User: 'user',
    System: 'system',
    Assistant: 'assistant',
  },
  OpenAIChatModels: {
    GPT3_5Turbo: { modelId: 'gpt-3.5-turbo' },
  },
}))
vi.mock('./logger', () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

const mockReadFile = vi.mocked(readFile)

describe('LlmService', () => {
  let llmService: LlmService

  beforeEach(() => {
    vi.clearAllMocks()
    llmService = new LlmService({
      provider: 'OpenAI' as ModelProvider,
      model: { modelId: 'gpt-3.5-turbo' } as ChatModel,
      apiKey: 'test-key',
    })
  })

  describe('generatePhrases', () => {
    it('generates phrases from LLM response', async () => {
      const mockPromptTemplate = 'Generate {{count}} phrases for {{domain}}'
      const mockLlmResponse = `| English Meaning | Kanji | Phonetic Kana | Kanji Breakdown |
| --------------- | ----- | ------------- | --------------- |
| Exit            | 出口  | でぐち        | 出 = exit / 口 = mouth |
| Restaurant      | 食堂  | しょくどう    | 食 = food / 堂 = hall |`

      mockReadFile.mockResolvedValue(mockPromptTemplate)
      mockClient.createChatCompletionNonStreaming.mockResolvedValue(mockLlmResponse)

      const result = await llmService.generatePhrases('train stations', 2)

      expect(result).toEqual([
        {
          englishMeaning: 'Exit',
          kanji: '出口',
          phoneticKana: 'でぐち',
          phoneticRomaji: '',
          kanjiBreakdown: '出 = exit / 口 = mouth',
        },
        {
          englishMeaning: 'Restaurant',
          kanji: '食堂',
          phoneticKana: 'しょくどう',
          phoneticRomaji: '',
          kanjiBreakdown: '食 = food / 堂 = hall',
        },
      ])

      expect(mockClient.createChatCompletionNonStreaming).toHaveBeenCalled()
    })

    it('handles LLM errors gracefully', async () => {
      const mockPromptTemplate = 'Generate {{count}} phrases for {{domain}}'
      mockReadFile.mockResolvedValue(mockPromptTemplate)
      mockClient.createChatCompletionNonStreaming.mockRejectedValue(new Error('LLM API error'))

      await expect(llmService.generatePhrases('test', 1)).rejects.toThrow(
        'LLM phrase generation failed: LLM API error'
      )
    })

    it('throws error when no table found in response', async () => {
      const mockPromptTemplate = 'Generate {{count}} phrases for {{domain}}'
      mockReadFile.mockResolvedValue(mockPromptTemplate)
      mockClient.createChatCompletionNonStreaming.mockResolvedValue('No table here!')

      await expect(llmService.generatePhrases('test', 1)).rejects.toThrow(
        'No valid data rows found in LLM response table'
      )
    })
  })

  describe('generateKanjiMeanings', () => {
    it('generates kanji meanings from LLM response', async () => {
      const mockPromptTemplate = 'Analyze these kanji: {{kanjiList}}'
      const mockLlmResponse = `| English Meaning | Kanji | Phonetic Kana | Phonetic Romaji |
| --------------- | ----- | ------------- | --------------- |
| exit, go out    | 出    | で            | de              |
| mouth, opening  | 口    | ぐち          | guchi           |`

      mockReadFile.mockResolvedValue(mockPromptTemplate)
      mockClient.createChatCompletionNonStreaming.mockResolvedValue(mockLlmResponse)

      const result = await llmService.generateKanjiMeanings(['出', '口'])

      expect(result).toEqual([
        {
          englishMeaning: 'exit, go out',
          kanji: '出',
          phoneticKana: 'で',
          phoneticRomaji: 'de',
        },
        {
          englishMeaning: 'mouth, opening',
          kanji: '口',
          phoneticKana: 'ぐち',
          phoneticRomaji: 'guchi',
        },
      ])

      expect(mockClient.createChatCompletionNonStreaming).toHaveBeenCalled()
    })

    it('returns empty array for empty kanji list', async () => {
      const result = await llmService.generateKanjiMeanings([])
      expect(result).toEqual([])
      expect(mockClient.createChatCompletionNonStreaming).not.toHaveBeenCalled()
    })

    it('handles LLM errors gracefully', async () => {
      const mockPromptTemplate = 'Analyze these kanji: {{kanjiList}}'
      mockReadFile.mockResolvedValue(mockPromptTemplate)
      mockClient.createChatCompletionNonStreaming.mockRejectedValue(new Error('LLM API error'))

      await expect(llmService.generateKanjiMeanings(['出'])).rejects.toThrow(
        'LLM kanji generation failed: LLM API error'
      )
    })
  })
})
