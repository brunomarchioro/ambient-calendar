import type { Settings } from '@/shared/settings/types'
import type { GoogleConnectionTest } from '@/shared/sync/types'
import { memoryStore } from '@/server/sync/services/memory-store'
import type { GoogleSecrets, MirrorStore, SyncOutcome } from '@/server/sync/types'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'

function syncErrorMessage(message: string): string {
  if (message === 'token 401') {
    return 'Client ID, client secret ou refresh token incorretos.'
  }
  if (message.startsWith('token ')) {
    return `Erro ao renovar access token (${message}).`
  }
  if (message === 'list 403') {
    return 'Sem permissão para ler o calendário primary.'
  }
  if (message.startsWith('list ')) {
    return `Erro ao listar Events (${message}).`
  }
  if (message === 'list_shape') {
    return 'Resposta inesperada da Google Calendar API.'
  }
  if (message === 'too many pages') {
    return 'Calendário com paginação além do limite do teste.'
  }
  return `Erro de conexão: ${message}.`
}

export function googleConnectionTestFromOutcome(outcome: SyncOutcome): GoogleConnectionTest {
  switch (outcome.kind) {
    case 'ok':
      return {
        ok: true,
        message:
          outcome.upserted === 0
            ? 'Conexão OK, mas nenhum Event no horizonte. Confira o calendário primary ou aumente os dias de horizonte.'
            : `Conexão OK. ${outcome.upserted} Events sincronizados no horizonte.`,
        eventCount: outcome.upserted,
      }
    case 'invalid_grant':
      return {
        ok: false,
        message: 'Refresh token inválido ou expirado. Refaça o OAuth no Playground.',
      }
    case 'skipped':
      return {
        ok: false,
        message:
          'Credenciais Google não configuradas (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).',
      }
    case 'error':
      return { ok: false, message: syncErrorMessage(outcome.message) }
  }
}

export async function testGoogleConnectionUseCase(input: {
  settings: Settings
  secrets: GoogleSecrets | null
  fetch: typeof fetch
  store?: MirrorStore
  now: Date
}): Promise<GoogleConnectionTest> {
  const outcome = await runScheduledSyncUseCase({
    settings: input.settings,
    secrets: input.secrets,
    fetch: input.fetch,
    store: input.store ?? memoryStore(),
    now: input.now,
    log: { error: () => {} },
  })
  return googleConnectionTestFromOutcome(outcome)
}
