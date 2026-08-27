interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
}

declare module 'cloudflare:workers' {
  export const env: Env
}
