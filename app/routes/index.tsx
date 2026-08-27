import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

function Home() {
  return <h1>Ambient Calendar Display</h1>
}
