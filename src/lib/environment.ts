/**
 * Check if the application is running in Claude Code context
 */
export function isClaudeCodeContext(): boolean {
  return process.env.CLAUDECODE === '1'
}
