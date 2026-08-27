/** Wrangler secrets / .dev.vars not inferred by cf-typegen from bindings alone. */
interface Env {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REFRESH_TOKEN?: string
  SYNC_FIXTURE?: string
}
