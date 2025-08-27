import { afterEach } from 'vitest'
import { truncateDatabase } from './src/test-utils'

afterEach(async () => {
  await truncateDatabase()
})
