/**
 * נתיבי SPA לרענון — נאספים אוטומטית מ-src בכל build.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { collectSpaRoutes } from './lib/collect-spa-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

export const SPA_REDIRECT_STORAGE_KEY = 'perfectoSpaRedirect'

export const HTACCESS_TRAILING_SLASH_ONLY = []

export const ROUTES = collectSpaRoutes({
  rootDir,
  globs: ['src/**/*.{tsx,ts}'],
  extraRoutes: ['login'],
  htaccessTrailingSlashOnly: HTACCESS_TRAILING_SLASH_ONLY,
})
