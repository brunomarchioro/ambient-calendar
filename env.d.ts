interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
}

interface Env {
  DB: D1Database
  DEVICE_API_TOKEN?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REFRESH_TOKEN?: string
  SYNC_FIXTURE?: string
}

declare module 'cloudflare:workers' {
  export const env: Env
}
