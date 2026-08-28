import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: [
    './src/server/events/repository/schema.ts',
    './src/server/settings/repository/schema.ts',
    './src/server/google/repository/schema.ts',
  ],
  out: './db/migrations',
  dialect: 'sqlite',
})
