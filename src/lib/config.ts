import {
  CLAUDE_CODE,
  CLAUDE_CODE_ENABLED,
  DATABASE_URL,
  LLM_API_KEY,
  LLM_PROVIDER,
  LOG_LEVEL,
  NODE_ENV,
  OPENAI_API_KEY,
  PRODUCTION,
  TEST,
} from './constants/env'
import { DEFAULT_PROVIDER } from './constants/llm'
import { DEFAULT_LEVEL } from './constants/logging'

/** Centralized environment variable configuration */

/** Database configuration */
export interface DatabaseConfig {
  url: string | undefined
  isTest: boolean
}

/** LLM configuration from environment variables */
export interface LLMConfig {
  provider: string
  apiKey: string | undefined
}

/** Logging configuration */
export interface LoggingConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
}

/** Environment context configuration */
export interface EnvironmentConfig {
  isClaudeCode: boolean
  isTest: boolean
}

/** Complete application configuration */
export interface AppConfig {
  database: DatabaseConfig
  llm: LLMConfig
  logging: LoggingConfig
  environment: EnvironmentConfig
}

/** Get database configuration from environment */
export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env[DATABASE_URL]
  const { isTest } = getEnvironmentConfig()
  return { url, isTest }
}

/** Get LLM configuration from environment */
export function getLLMConfig(): LLMConfig {
  const provider = process.env[LLM_PROVIDER] || DEFAULT_PROVIDER
  const apiKey = process.env[LLM_API_KEY] || process.env[OPENAI_API_KEY]
  return { provider, apiKey }
}

/** Get logging configuration from environment */
export function getLoggingConfig(): LoggingConfig {
  const level = (process.env[LOG_LEVEL] as LoggingConfig['level']) || DEFAULT_LEVEL
  return { level }
}

/** Get environment context configuration */
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env[NODE_ENV] || PRODUCTION
  return {
    isClaudeCode: process.env[CLAUDE_CODE] === CLAUDE_CODE_ENABLED,
    isTest: nodeEnv === TEST,
  }
}

/** Get complete application configuration */
export function getAppConfig(): AppConfig {
  return {
    database: getDatabaseConfig(),
    llm: getLLMConfig(),
    logging: getLoggingConfig(),
    environment: getEnvironmentConfig(),
  }
}
