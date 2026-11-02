export function fieldErrorText(errors: unknown[]): string {
  return errors
    .map((error) =>
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : undefined,
    )
    .filter(Boolean)
    .join(' ')
}
