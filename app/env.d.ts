/** Wrangler secrets / .dev.vars not inferred by cf-typegen from bindings alone. */
interface Env {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ENCRYPTION_KEY?: string
  SYNC_FIXTURE?: string
  GOOGLE_SYNC_FIXTURE?: string
}
