import * as React from 'react'
import { cn } from '@/web/common/utils/cn'
import { Label } from '@/web/common/components/ui/label'

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="group"
      data-slot="field"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn(className)} {...props} />
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | string | undefined>
}) {
  let content: React.ReactNode = children

  if (!content && errors?.length) {
    const messages = errors
      .map((error) => (typeof error === 'string' ? error : error?.message))
      .filter(Boolean)
    if (messages.length === 1) content = messages[0]
    else if (messages.length > 1) {
      content = (
        <ul className="ml-4 flex list-disc flex-col gap-1">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )
    }
  }

  if (!content) return null

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm font-normal text-destructive', className)}
      {...props}
    >
      {content}
    </div>
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('flex flex-col gap-4', className)} {...props} />
}

export { Field, FieldLabel, FieldError, FieldGroup }
