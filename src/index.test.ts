import { describe, expect, it } from 'vitest'

describe('Project setup', () => {
  it('loads environment variables', () => {
    expect(process.env).toBeDefined()
  })

  it('imports required dependencies', async () => {
    const { run } = await import('@oclif/core')
    expect(run).toBeTypeOf('function')
  })
})
