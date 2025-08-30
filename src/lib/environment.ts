import { getEnvironmentConfig } from './config'

/**
 * Check if the application is running in Claude Code context
 */
export function isClaudeCodeContext(): boolean {
  return getEnvironmentConfig().isClaudeCode
}
