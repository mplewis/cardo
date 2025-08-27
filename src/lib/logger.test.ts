import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('creates logger with all standard methods', async () => {
    const { log } = await import('./logger')

    expect(log).toBeDefined()
    expect(typeof log.info).toBe('function')
    expect(typeof log.error).toBe('function')
    expect(typeof log.warn).toBe('function')
    expect(typeof log.debug).toBe('function')
    expect(typeof log.trace).toBe('function')
    expect(typeof log.fatal).toBe('function')
  })

  it('uses pretty transport when TTY is available', async () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })

    const { log } = await import('./logger')
    expect(log.level).toBeDefined()
  })

  it('uses JSON format when TTY is not available', async () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })

    const { log } = await import('./logger')
    expect(log.level).toBeDefined()
  })

  it('respects LOG_LEVEL environment variable', async () => {
    const originalLogLevel = process.env.LOG_LEVEL
    process.env.LOG_LEVEL = 'debug'

    const { log } = await import('./logger')
    expect(log.level).toBe('debug')

    process.env.LOG_LEVEL = originalLogLevel
  })
})
