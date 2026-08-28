import { createFileRoute } from '@tanstack/react-router'
import { getHealth } from '@/server/health/get-health'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => getHealth(),
    },
  },
})
