import type { CardData } from './card'
import { isClaudeCodeContext } from './environment'
import { type ExportResult, exportToCSV } from './export'

/**
 * Logger interface for export feedback
 */
export interface ExportLogger {
  log: (message: string) => void
}

/**
 * Export cards to CSV and provide user feedback about file opening behavior
 */
export async function exportAndShowResult(
  cards: CardData,
  noOpenFlag: boolean,
  logger: ExportLogger
): Promise<ExportResult> {
  const shouldOpen = !noOpenFlag && !isClaudeCodeContext()
  const result = await exportToCSV(cards, shouldOpen)

  logger.log(`\nCSV files exported to: ${result.tempDir}`)
  if (shouldOpen) {
    logger.log('CSV files opened automatically')
  } else if (isClaudeCodeContext() && !noOpenFlag) {
    logger.log('CSV files not opened (Claude Code context)')
  }

  return result
}
