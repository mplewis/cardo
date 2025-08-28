import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  type ApiKeyValues,
  type ChatMessage,
  type ChatModel,
  ChatRoles,
  Client,
  type LLMSettings,
  ModelProvider,
  OpenAIChatModels,
} from 'any-llm'
import type { RawLlmResponse } from './consolidation'
import { log } from './logger'

/**
 * Configuration for LLM service
 */
export interface LlmConfig {
  provider: ModelProvider
  model: ChatModel
  apiKey?: string
}

/**
 * Service for interacting with LLMs to generate Japanese kanji cards
 */
export class LlmService {
  private client: Client
  private model: ChatModel
  private phrasesPromptTemplate: string | null = null
  private kanjiPromptTemplate: string | null = null

  constructor(config: LlmConfig) {
    const apiKeyValues = {} as Partial<ApiKeyValues>
    if (config.apiKey) {
      // Map provider to appropriate API key field
      switch (config.provider) {
        case ModelProvider.OpenAI:
          apiKeyValues.OPENAI_API_KEY = config.apiKey
          break
        case ModelProvider.Anthropic:
          apiKeyValues.ANTHROPIC_API_KEY = config.apiKey
          break
        case ModelProvider.Google:
          apiKeyValues.GOOGLE_GEMINI_API_KEY = config.apiKey
          break
        case ModelProvider.Mistral:
          apiKeyValues.MISTRAL_API_KEY = config.apiKey
          break
        case ModelProvider.Groq:
          apiKeyValues.GROQ_API_KEY = config.apiKey
          break
      }
    }

    this.client = new Client(config.provider, apiKeyValues as ApiKeyValues)
    this.model = config.model
  }

  /**
   * Load prompt templates from resources/prompts/
   */
  private async loadPromptTemplates(): Promise<void> {
    if (!this.phrasesPromptTemplate) {
      const phrasesPath = join(process.cwd(), 'resources', 'prompts', 'phrases.txt')
      this.phrasesPromptTemplate = await readFile(phrasesPath, 'utf-8')
    }

    if (!this.kanjiPromptTemplate) {
      const kanjiPath = join(process.cwd(), 'resources', 'prompts', 'individual-kanji.txt')
      this.kanjiPromptTemplate = await readFile(kanjiPath, 'utf-8')
    }
  }

  /**
   * Generate Japanese phrases based on domain and count
   */
  async generatePhrases(domain: string, count: number): Promise<RawLlmResponse[]> {
    await this.loadPromptTemplates()

    if (!this.phrasesPromptTemplate) {
      throw new Error('Failed to load phrases prompt template')
    }

    const prompt = this.phrasesPromptTemplate
      .replace('{{count}}', count.toString())
      .replace('{{domain}}', domain)

    log.info(`Querying LLM for ${count} phrases in domain: ${domain}`)
    log.debug({ prompt }, 'Prompt details')

    try {
      const messages: ChatMessage[] = [
        {
          role: ChatRoles.User,
          content: prompt,
        },
      ]

      const chatSettings: LLMSettings = {
        model: this.model,
        temperature: 0.3,
        maxTokens: 2000,
      }

      const response = await this.client.createChatCompletionNonStreaming(chatSettings, messages)
      log.debug({ response }, 'Raw LLM response')

      const parsedData = this.parsePhrasesResponse(response)
      log.info(`Parsed ${parsedData.length} phrases from LLM response`)

      return parsedData
    } catch (error) {
      log.error({ error }, 'Failed to generate phrases')
      throw new Error(
        `LLM phrase generation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Generate meanings for individual kanji characters
   */
  async generateKanjiMeanings(kanjiList: string[]): Promise<
    Array<{
      englishMeaning: string
      kanji: string
      phoneticKana: string
      phoneticRomaji: string
    }>
  > {
    if (kanjiList.length === 0) {
      return []
    }

    await this.loadPromptTemplates()

    if (!this.kanjiPromptTemplate) {
      throw new Error('Failed to load kanji prompt template')
    }

    const kanjiListString = kanjiList.join(', ')
    const prompt = this.kanjiPromptTemplate.replace('{{kanjiList}}', kanjiListString)

    log.info(`Querying LLM for meanings of ${kanjiList.length} kanji: ${kanjiListString}`)
    log.debug({ prompt }, 'Prompt details')

    try {
      const messages: ChatMessage[] = [
        {
          role: ChatRoles.User,
          content: prompt,
        },
      ]

      const chatSettings: LLMSettings = {
        model: this.model,
        temperature: 0.3,
        maxTokens: 1500,
      }

      const response = await this.client.createChatCompletionNonStreaming(chatSettings, messages)
      log.debug({ response }, 'Raw LLM response')

      const parsedData = this.parseKanjiResponse(response)
      log.info(`Parsed ${parsedData.length} kanji meanings from LLM response`)

      return parsedData
    } catch (error) {
      log.error({ error }, 'Failed to generate kanji meanings')
      throw new Error(
        `LLM kanji generation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Parse phrases response from LLM into structured data
   */
  private parsePhrasesResponse(response: string): RawLlmResponse[] {
    const results: RawLlmResponse[] = []

    // Split response into lines and find table rows
    const lines = response.split('\n').filter((line) => line.trim())

    let inTable = false
    let headerFound = false

    for (const line of lines) {
      // Check if this line looks like a table row
      if (line.includes('|')) {
        const cells = line
          .split('|')
          .map((cell) => cell.trim())
          .filter((cell) => cell !== '')

        // Skip empty rows
        if (cells.length === 0) continue

        // Check if this is a header row
        if (
          !headerFound &&
          cells.some(
            (cell) => cell.toLowerCase().includes('english') || cell.toLowerCase().includes('kanji')
          )
        ) {
          headerFound = true
          inTable = true
          continue
        }

        // Check if this is a separator row (contains dashes)
        if (cells.every((cell) => /^[\s-|:]*$/.test(cell))) {
          continue
        }

        // If we're in a table and this has 4+ cells, it's a data row
        if (inTable && cells.length >= 4) {
          const [englishMeaning, kanji, phoneticKana, kanjiBreakdown] = cells

          if (englishMeaning && kanji && phoneticKana && kanjiBreakdown) {
            results.push({
              englishMeaning,
              kanji,
              phoneticKana,
              phoneticRomaji: '', // We don't get romaji from phrase prompts
              kanjiBreakdown,
            })
          }
        }
      }
    }

    if (results.length === 0) {
      throw new Error('No valid data rows found in LLM response table')
    }

    return results
  }

  /**
   * Parse individual kanji response from LLM into structured data
   */
  private parseKanjiResponse(response: string): Array<{
    englishMeaning: string
    kanji: string
    phoneticKana: string
    phoneticRomaji: string
  }> {
    const results: Array<{
      englishMeaning: string
      kanji: string
      phoneticKana: string
      phoneticRomaji: string
    }> = []

    // Split response into lines and find table rows
    const lines = response.split('\n').filter((line) => line.trim())

    let inTable = false
    let headerFound = false

    for (const line of lines) {
      // Check if this line looks like a table row
      if (line.includes('|')) {
        const cells = line
          .split('|')
          .map((cell) => cell.trim())
          .filter((cell) => cell !== '')

        // Skip empty rows
        if (cells.length === 0) continue

        // Check if this is a header row
        if (
          !headerFound &&
          cells.some(
            (cell) => cell.toLowerCase().includes('english') || cell.toLowerCase().includes('kanji')
          )
        ) {
          headerFound = true
          inTable = true
          continue
        }

        // Check if this is a separator row (contains dashes)
        if (cells.every((cell) => /^[\s-|:]*$/.test(cell))) {
          continue
        }

        // If we're in a table and this has 4+ cells, it's a data row
        if (inTable && cells.length >= 4) {
          const [englishMeaning, kanji, phoneticKana, phoneticRomaji] = cells

          if (englishMeaning && kanji && phoneticKana && phoneticRomaji) {
            results.push({
              englishMeaning,
              kanji,
              phoneticKana,
              phoneticRomaji,
            })
          }
        }
      }
    }

    if (results.length === 0) {
      throw new Error('No valid data rows found in LLM response table')
    }

    return results
  }
}

/**
 * Create an LLM service instance from environment variables
 */
export function createLlmService(): LlmService {
  const providerString = process.env.LLM_PROVIDER || 'OpenAI'
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY

  // Convert string to ModelProvider enum and get default model
  let provider: ModelProvider
  let model: ChatModel

  switch (providerString.toLowerCase()) {
    case 'openai':
      provider = ModelProvider.OpenAI
      model = OpenAIChatModels.GPT3_5Turbo
      break
    case 'anthropic':
      provider = ModelProvider.Anthropic
      // Would need to import AnthropicChatModels for proper models
      model = OpenAIChatModels.GPT3_5Turbo // Fallback for now
      break
    case 'google':
      provider = ModelProvider.Google
      model = OpenAIChatModels.GPT3_5Turbo // Fallback for now
      break
    case 'mistral':
      provider = ModelProvider.Mistral
      model = OpenAIChatModels.GPT3_5Turbo // Fallback for now
      break
    case 'groq':
      provider = ModelProvider.Groq
      model = OpenAIChatModels.GPT3_5Turbo // Fallback for now
      break
    default:
      provider = ModelProvider.OpenAI
      model = OpenAIChatModels.GPT3_5Turbo
  }

  return new LlmService({
    provider,
    model,
    ...(apiKey && { apiKey }),
  })
}
