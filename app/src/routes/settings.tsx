import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/web/settings/components/settings-page'

export const Route = createFileRoute('/settings')({
  ssr: false,
  component: SettingsPage,
})
