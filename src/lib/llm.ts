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
import { z } from 'zod'
import { getLLMConfig } from './config'
import type { KanjiResponse, PhrasesResponse } from './consolidation'
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
 * Zod schema for phrase data from LLM
 */
const phraseSchema = z.object({
  englishMeaning: z.string().min(1),
  kanji: z.string().min(1),
  phoneticKana: z.string().min(1),
  phoneticRomaji: z.string().min(1),
  kanjiBreakdown: z.string().min(1),
})

/**
 * Zod schema for individual kanji data from LLM
 */
const kanjiSchema = z.object({
  englishMeaning: z.string().min(1),
  kanji: z.string().length(1),
  phoneticKana: z.string().min(1),
  phoneticRomaji: z.string().min(1),
})

/**
 * Array schemas for LLM responses
 */
const phrasesArraySchema = z.array(phraseSchema)
const kanjiArraySchema = z.array(kanjiSchema)

/**
 * Clean up streaming response format from any-llm library
 * Handles responses that come in format: 0:"content" chunks
 */
function cleanStreamingResponse(response: string): string {
  if (typeof response !== 'string' || !response.includes('0:"')) {
    return response
  }

  // Find each chunk starting with 0:" and ending with "
  const chunks = []
  let pos = 0

  while (pos < response.length) {
    const start = response.indexOf('0:"', pos)
    if (start === -1) break

    const contentStart = start + 3 // Skip '0:"'

    // Find the closing quote, but skip over any escaped quotes (\")
    let end = contentStart
    while (end < response.length) {
      const nextQuote = response.indexOf('"', end)
      if (nextQuote === -1) break

      // Check if this quote is escaped
      if (response[nextQuote - 1] === '\\') {
        end = nextQuote + 1 // Skip this escaped quote
      } else {
        end = nextQuote // Found the real closing quote
        break
      }
    }

    if (end >= response.length) break

    // Extract content and unescape quotes
    const content = response.slice(contentStart, end)
    chunks.push(content.replace(/\\"/g, '"'))

    pos = end + 1
  }

  return chunks.join('').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
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
      const kanjiPath = join(process.cwd(), 'resources', 'prompts', 'kanji.txt')
      this.kanjiPromptTemplate = await readFile(kanjiPath, 'utf-8')
    }
  }

  /**
   * Generate Japanese phrases based on domain and count
   */
  async generatePhrases(
    domain: string,
    count: number,
    excludePhrases: string[] = []
  ): Promise<PhrasesResponse[]> {
    await this.loadPromptTemplates()

    if (!this.phrasesPromptTemplate) {
      throw new Error('Failed to load phrases prompt template')
    }

    let prompt = this.phrasesPromptTemplate
      .replace('{{count}}', count.toString())
      .replace('{{domain}}', domain)

    // Add exclusion list if provided
    if (excludePhrases.length > 0) {
      const exclusionText = `\n\nIMPORTANT: Do NOT include any of these existing phrases in your response:\n${excludePhrases.join(', ')}\n\nGenerate completely NEW phrases that are different from the ones listed above.`
      prompt += exclusionText
    }

    log.info({ count, domain }, 'Querying LLM for phrases')
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
      const cleanResponse = cleanStreamingResponse(response)
      log.debug({ response: cleanResponse }, 'Cleaned LLM response')

      const parsedData = this.parsePhrasesResponse(cleanResponse)
      log.info({ count: parsedData.length }, 'Parsed phrases from LLM response')

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
  async generateKanjiMeanings(kanjiList: string[]): Promise<KanjiResponse[]> {
    if (kanjiList.length === 0) {
      return []
    }

    await this.loadPromptTemplates()

    if (!this.kanjiPromptTemplate) {
      throw new Error('Failed to load kanji prompt template')
    }

    const kanjiListString = kanjiList.join(', ')
    const prompt = this.kanjiPromptTemplate.replace('{{kanjiList}}', kanjiListString)

    log.info({ count: kanjiList.length, kanji: kanjiListString }, 'Querying LLM for kanji meanings')
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
      const cleanResponse = cleanStreamingResponse(response)
      log.debug({ response: cleanResponse }, 'Cleaned LLM response')
      const parsedData = this.parseKanjiResponse(cleanResponse)
      log.info({ count: parsedData.length }, 'Parsed kanji meanings from LLM response')

      return parsedData
    } catch (error) {
      log.error({ error }, 'Failed to generate kanji meanings')
      throw new Error(
        `LLM kanji generation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Generic method to parse LLM JSON response with schema validation
   */
  private parseJsonResponse<T>(
    response: string,
    schema: z.ZodSchema<T[]>,
    dataType: 'phrases' | 'kanji'
  ): T[] {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in LLM response')
      }

      const jsonString = jsonMatch[0]
      const parsedJson = JSON.parse(jsonString)

      // Validate with provided Zod schema
      const validatedData = schema.parse(parsedJson)

      return validatedData
    } catch (error) {
      if (error instanceof z.ZodError) {
        log.error(
          { error: error.issues, cleanedResponse: response },
          `Invalid ${dataType} data structure from LLM`
        )
        throw new Error(
          `Invalid ${dataType} data structure: ${error.issues.map((e) => e.message).join(', ')}`
        )
      }

      log.error(
        { error, cleanedResponse: response },
        `Failed to parse ${dataType} JSON from LLM response`
      )
      throw new Error(
        `Failed to parse ${dataType} JSON: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Parse phrases response from LLM into structured data
   */
  private parsePhrasesResponse(response: string): PhrasesResponse[] {
    return this.parseJsonResponse(response, phrasesArraySchema, 'phrases')
  }

  /**
   * Parse individual kanji response from LLM into structured data
   */
  private parseKanjiResponse(response: string): KanjiResponse[] {
    return this.parseJsonResponse(response, kanjiArraySchema, 'kanji')
  }
}

/**
 * Create an LLM service instance from environment variables
 */
export function createLlmService(): LlmService {
  const { provider: providerString, apiKey } = getLLMConfig()

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
