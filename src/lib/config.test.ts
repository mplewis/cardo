import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppConfig,
  getDatabaseConfig,
  getEnvironmentConfig,
  getLLMConfig,
  getLoggingConfig,
} from './config'

describe('config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getDatabaseConfig', () => {
    it('returns database configuration from environment', () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = 'test'

      const config = getDatabaseConfig()

      expect(config).toEqual({
        url: 'file:./test.db',
        isTest: true,
      })
    })

    it('detects test environment from NODE_ENV', () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = 'test'

      const config = getDatabaseConfig()

      expect(config.isTest).toBe(true)
    })

    it('handles missing DATABASE_URL', () => {
      delete process.env.DATABASE_URL
      delete process.env.NODE_ENV

      const config = getDatabaseConfig()

      expect(config).toEqual({
        url: undefined,
        isTest: false,
      })
    })
  })

  describe('getLLMConfig', () => {
    it('returns LLM configuration from environment', () => {
      process.env.LLM_PROVIDER = 'Anthropic'
      process.env.LLM_API_KEY = 'test-key'

      const config = getLLMConfig()

      expect(config).toEqual({
        provider: 'Anthropic',
        apiKey: 'test-key',
      })
    })

    it('falls back to OPENAI_API_KEY', () => {
      delete process.env.LLM_API_KEY
      process.env.OPENAI_API_KEY = 'openai-key'

      const config = getLLMConfig()

      expect(config.apiKey).toBe('openai-key')
    })

    it('uses default provider', () => {
      delete process.env.LLM_PROVIDER

      const config = getLLMConfig()

      expect(config.provider).toBe('OpenAI')
    })
  })

  describe('getLoggingConfig', () => {
    it('returns logging configuration from environment', () => {
      process.env.LOG_LEVEL = 'debug'

      const config = getLoggingConfig()

      expect(config).toEqual({
        level: 'debug',
      })
    })

    it('uses default log level', () => {
      delete process.env.LOG_LEVEL

      const config = getLoggingConfig()

      expect(config.level).toBe('info')
    })
  })

  describe('getEnvironmentConfig', () => {
    it('returns environment configuration', () => {
      process.env.CLAUDECODE = '1'
      process.env.NODE_ENV = 'development'

      const config = getEnvironmentConfig()

      expect(config).toEqual({
        isClaudeCode: true,
        isTest: false,
      })
    })

    it('defaults to production environment', () => {
      delete process.env.NODE_ENV
      delete process.env.CLAUDECODE

      const config = getEnvironmentConfig()

      expect(config).toEqual({
        isClaudeCode: false,
        isTest: false,
      })
    })
  })

  describe('getAppConfig', () => {
    it('returns complete application configuration', () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.LLM_PROVIDER = 'OpenAI'
      process.env.LLM_API_KEY = 'test-key'
      process.env.LOG_LEVEL = 'warn'
      process.env.CLAUDECODE = '1'
      process.env.NODE_ENV = 'test'

      const config = getAppConfig()

      expect(config).toEqual({
        database: {
          url: 'file:./test.db',
          isTest: true,
        },
        llm: {
          provider: 'OpenAI',
          apiKey: 'test-key',
        },
        logging: {
          level: 'warn',
        },
        environment: {
          isClaudeCode: true,
          isTest: true,
        },
      })
    })
  })
})
