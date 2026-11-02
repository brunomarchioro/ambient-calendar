import type { ReactNode } from 'react'
import { Button, Spinner, type ButtonProps } from '@heroui/react'

export function PendingButton({ children, ...props }: Omit<ButtonProps, 'children'> & { children: ReactNode }) {
  return (
    <Button {...props}>
      {({ isPending }) => (
        <>
          {isPending ? <Spinner color="current" size="sm" /> : null}
          {children}
        </>
      )}
    </Button>
  )
}
