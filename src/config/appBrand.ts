/**
 * App brand constants.
 *
 * themeColor '#1e40af' matches --color-primary (hsl(222, 89%, 40%)) in src/index.css.
 *
 * Note: pwa/pwaConfig.ts intentionally inlines its own brand constants to keep the
 * pwaConfig module within the tsconfig.node.json scope — it does NOT import from here.
 */
export const appBrand = {
  name: 'Life Log',
  shortName: 'Life Log',
  description: 'Capture structured life events locally and offline',
  themeColor: '#1e40af',
} as const
