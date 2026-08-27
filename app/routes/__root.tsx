import { useState, type ReactNode } from 'react'
import { ChakraProvider, Container, Flex, Heading, HStack, Text } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { system } from '../theme'

export const Route = createRootRoute({
  ssr: false,
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
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <Shell />
        </QueryClientProvider>
      </ChakraProvider>
    </RootDocument>
  )
}

function Shell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <Container maxW="3xl" py="6" px="4">
      <Flex
        as="header"
        gap="4"
        align={{ base: 'flex-start', sm: 'center' }}
        justify="space-between"
        direction={{ base: 'column', sm: 'row' }}
        pb="6"
      >
        <Heading size="lg">Ambient Calendar Display</Heading>
        <HStack as="nav" gap="4" flexWrap="wrap">
          <NavLink to="/" current={pathname === '/'}>
            Agenda
          </NavLink>
          <NavLink to="/settings" current={pathname === '/settings'}>
            Configurações
          </NavLink>
        </HStack>
      </Flex>
      <Outlet />
    </Container>
  )
}

function NavLink({
  to,
  current,
  children,
}: {
  to: '/' | '/settings'
  current: boolean
  children: ReactNode
}) {
  return (
    <Link to={to} aria-current={current ? 'page' : undefined}>
      <Text fontWeight={current ? 'semibold' : 'medium'} textDecoration={current ? 'underline' : 'none'}>
        {children}
      </Text>
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
