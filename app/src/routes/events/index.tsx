import { createFileRoute } from '@tanstack/react-router'
import { AgendaPage } from '@/web/events/components/agenda-page'

export const Route = createFileRoute('/events/')({
  ssr: false,
  component: AgendaPage,
})
