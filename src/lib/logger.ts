import pino from 'pino'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

/** Create logger with appropriate configuration */
function createLogger() {
  if (process.stdout.isTTY) {
    return pino({
      level: LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      },
    })
  }

  return pino({
    level: LOG_LEVEL,
    formatters: {
      level: (label) => ({ level: label }),
    },
  })
}

// Create singleton logger instance
export const log = createLogger()
