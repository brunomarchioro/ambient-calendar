import '@/styles/globals.css'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { cn } from '@/web/common/utils/cn'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Ambient Calendar Display' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Shell />
      </QueryClientProvider>
    </RootDocument>
  )
}

function Shell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ambient Calendar Display</h1>
        <nav className="flex flex-wrap gap-4">
          <NavLink to="/events" current={pathname === '/events'}>
            Agenda
          </NavLink>
          <NavLink to="/settings" current={pathname === '/settings'}>
            Configurações
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

function NavLink({
  to,
  current,
  children,
}: {
  to: '/events' | '/settings'
  current: boolean
  children: ReactNode
}) {
  return (
    <Link to={to} aria-current={current ? 'page' : undefined}>
      <span
        className={cn(
          'text-sm',
          current ? 'font-semibold underline underline-offset-4' : 'font-medium hover:underline',
        )}
      >
        {children}
      </span>
    </Link>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
