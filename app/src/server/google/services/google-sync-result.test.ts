import { expect, test } from 'vitest'
import { googleSyncResultFromOutcome } from '@/server/google/services/google-sync-result'

test('partial sync is visible as a failure while preserving its calendar result', () => {
  expect(
    googleSyncResultFromOutcome({
      kind: 'partial',
      upserted: 3,
      deleted: 1,
      errors: ['conta@gmail.com/Tasks: token 403'],
    }),
  ).toEqual({
    ok: false,
    partial: true,
    eventCount: 3,
    message: '3 Events sincronizados; avisos: conta@gmail.com/Tasks: token 403',
  })
})
