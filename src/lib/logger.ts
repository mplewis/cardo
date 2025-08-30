import pino from 'pino'
import { getLoggingConfig } from './config'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** Create logger with appropriate configuration */
function createLogger() {
  const { level } = getLoggingConfig()

  if (process.stdout.isTTY) {
    return pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    })
  }

  return pino({
    level,
    formatters: {
      level: (label) => ({ level: label }),
    },
  })
}

// Create singleton logger instance
export const log = createLogger()
