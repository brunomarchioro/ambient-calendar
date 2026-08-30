import type { GoogleSyncResult } from '@/shared/google/types'
import type { SyncOutcome } from '@/server/sync/types'

export function googleSyncResultFromOutcome(outcome: SyncOutcome): GoogleSyncResult {
  switch (outcome.kind) {
    case 'ok':
      return {
        ok: true,
        message:
          outcome.upserted === 0
            ? 'Sincronização OK, mas nenhum Event no horizonte. Confira os calendários habilitados ou aumente os dias de horizonte.'
            : `Sincronização OK. ${outcome.upserted} Events no horizonte.`,
        eventCount: outcome.upserted,
      }
    case 'partial':
      return {
        ok: true,
        message: `${outcome.upserted} Events sincronizados; avisos: ${outcome.errors.join('; ')}`,
        eventCount: outcome.upserted,
      }
    case 'skipped':
      return {
        ok: false,
        message:
          outcome.reason === 'no_accounts'
            ? 'Nenhuma conta Google conectada.'
            : 'OAuth não configurado (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENCRYPTION_KEY).',
      }
    case 'error':
      return { ok: false, message: `Erro de sincronização: ${outcome.message}.` }
  }
}
