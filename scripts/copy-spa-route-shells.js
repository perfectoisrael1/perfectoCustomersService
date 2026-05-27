/**
 * After vite build: copy dist/index.html to dist/<route>/index.html for every SPA route.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { HTACCESS_TRAILING_SLASH_ONLY, ROUTES } from './spa-routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')
const src = path.join(dist, 'index.html')

if (!fs.existsSync(src)) {
  console.error('copy-spa-route-shells: dist/index.html missing — run vite build first')
  process.exit(1)
}

const shell = fs.readFileSync(src, 'utf8')
let count = 0

for (const route of [...ROUTES, ...HTACCESS_TRAILING_SLASH_ONLY]) {
  const segments = route.split('/').filter(Boolean)
  const destDir = path.join(dist, ...segments)
  fs.mkdirSync(destDir, { recursive: true })
  fs.writeFileSync(path.join(destDir, 'index.html'), shell, 'utf8')
  count += 1
}

console.log(`copy-spa-route-shells: wrote ${count} full SPA shells (${ROUTES.length} routes, auto-collected)`)
