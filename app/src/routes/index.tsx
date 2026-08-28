import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  ssr: false,
  component: IndexRedirect,
})

function IndexRedirect() {
  return <Navigate to="/events" replace />
}
