import { createFileRoute } from '@tanstack/react-router'
import { getHealth } from '@app/server/health'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => getHealth(),
    },
  },
})
