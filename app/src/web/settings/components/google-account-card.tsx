import type { GoogleAccountPublic } from '@/shared/google/types'
import { Badge } from '@/web/common/components/ui/badge'
import { Button } from '@/web/common/components/ui/button'
import { Checkbox } from '@/web/common/components/ui/checkbox'
import { Label } from '@/web/common/components/ui/label'

export function GoogleAccountCard({
  account,
  disconnecting,
  patchingCalendarId,
  onDisconnect,
  onReconnect,
  onToggleCalendar,
}: {
  account: GoogleAccountPublic
  disconnecting: boolean
  patchingCalendarId: string | null
  onDisconnect: () => void
  onReconnect: () => void
  onToggleCalendar: (calendarRowId: string, enabled: boolean) => void
}) {
  const needsReconnect = account.status === 'needs_reconnect'
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-medium">{account.email}</p>
            {needsReconnect ? (
              <Badge variant="secondary" className="bg-orange-100 text-orange-900">
                Reconectar
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            {needsReconnect ? (
              <Button type="button" size="sm" variant="outline" onClick={onReconnect}>
                Reconectar
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="destructive" loading={disconnecting} onClick={onDisconnect}>
              Desconectar
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 pl-1">
          {account.calendars.map((cal) => (
            <div key={cal.id} className="flex items-center gap-2">
              <Checkbox
                id={`cal-${cal.id}`}
                checked={cal.enabled}
                disabled={needsReconnect || patchingCalendarId === cal.id}
                onCheckedChange={(checked) => {
                  const enabled = checked === true
                  if (enabled !== cal.enabled) onToggleCalendar(cal.id, enabled)
                }}
              />
              <Label htmlFor={`cal-${cal.id}`} className="font-normal">
                {cal.summary}
              </Label>
            </div>
          ))}
          {account.calendars.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum calendário importado.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
