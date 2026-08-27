import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: 'ui-sans-serif, system-ui, sans-serif' },
        body: { value: 'ui-sans-serif, system-ui, sans-serif' },
      },
      radii: {
        l1: { value: '0.5rem' },
        l2: { value: '0.75rem' },
        l3: { value: '1rem' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
