import type { GoogleAccountPublic } from '@/shared/google/types'
import { Button, Checkbox, Chip } from '@heroui/react'
import { PendingButton } from '@/web/common/components/pending-button'

export function GoogleAccountCard({
  account,
  disconnecting,
  patchingCalendarId,
  patchingTaskListId,
  onDisconnect,
  onReconnect,
  onConnectTasks,
  onToggleCalendar,
  onToggleTaskList,
}: {
  account: GoogleAccountPublic
  disconnecting: boolean
  patchingCalendarId: string | null
  patchingTaskListId: string | null
  onDisconnect: () => void
  onReconnect: () => void
  onConnectTasks: () => void
  onToggleCalendar: (calendarRowId: string, enabled: boolean) => void
  onToggleTaskList: (taskListRowId: string, enabled: boolean) => void
}) {
  const needsReconnect = account.status === 'needs_reconnect'
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-medium">{account.email}</p>
            {needsReconnect ? (
              <Chip size="sm" color="warning">
                Reconectar
              </Chip>
            ) : null}
            {!needsReconnect && !account.tasksAuthorized ? (
              <Button size="sm" variant="outline" onPress={onConnectTasks}>
                Conectar Google Tasks
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            {needsReconnect ? (
              <Button size="sm" variant="outline" onPress={onReconnect}>
                Reconectar
              </Button>
            ) : null}
            <PendingButton size="sm" variant="danger" isPending={disconnecting} onPress={onDisconnect}>
              Desconectar
            </PendingButton>
          </div>
        </div>
        <div className="flex flex-col gap-2 pl-1">
          {account.calendars.map((cal) => (
            <Checkbox
              key={cal.id}
              isSelected={cal.enabled}
              isDisabled={needsReconnect || patchingCalendarId === cal.id}
              onChange={(enabled) => {
                if (enabled !== cal.enabled) onToggleCalendar(cal.id, enabled)
              }}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                {cal.summary}
              </Checkbox.Content>
            </Checkbox>
          ))}
          {account.tasksAuthorized ? account.taskLists.map((list) => (
            <Checkbox
              key={list.id}
              isSelected={list.enabled}
              isDisabled={needsReconnect || patchingTaskListId === list.id}
              onChange={(enabled) => onToggleTaskList(list.id, enabled)}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Tarefas: {list.title}
              </Checkbox.Content>
            </Checkbox>
          )) : <p className="text-sm text-muted">Google Tasks não conectado.</p>}
          {account.calendars.length === 0 ? (
            <p className="text-sm text-muted">Nenhum calendário importado.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
