import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@app': path.resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    include: ['**/*.test.ts'],
  },
})
