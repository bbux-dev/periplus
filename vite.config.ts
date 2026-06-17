import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createPwaOptions } from './src/pwa/pwaConfig'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(createPwaOptions())],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
    // Playwright e2e specs live in e2e/ and import @playwright/test — keep Vitest out.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
