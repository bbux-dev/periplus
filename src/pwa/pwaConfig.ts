import type { VitePWAOptions } from 'vite-plugin-pwa'

// Inline brand constants — do NOT import from src/config/appBrand.
// src/config/ is outside tsconfig.node.json scope; importing it would break tsc -b.
const APP_NAME = 'Life Log'
const THEME_COLOR = '#1e40af' // matches --color-primary in index.css

export function createPwaOptions(): Partial<VitePWAOptions> {
  return {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'vite.svg'],
    manifest: {
      name: APP_NAME,
      short_name: APP_NAME,
      description: 'Capture structured life events locally and offline',
      theme_color: THEME_COLOR,
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      // Precache all static app-shell assets (JS, CSS, HTML, icons, fonts)
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      // SPA offline: serve cached index.html for all navigation requests
      navigateFallback: '/index.html',
    },
    devOptions: {
      // SW is only generated in `vite build` / `vite preview`, never in dev.
      // Setting enabled: true here causes HMR conflicts — leave false.
      enabled: false,
    },
  }
}
