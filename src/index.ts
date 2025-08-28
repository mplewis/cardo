#!/usr/bin/env node

import { run } from '@oclif/core'
import 'dotenv/config'

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
