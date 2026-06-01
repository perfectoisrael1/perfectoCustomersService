/**
 * Creates public/<route>/index.html stubs + updates .htaccess.
 * Routes are auto-collected from src — see scripts/lib/collect-spa-routes.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  HTACCESS_SKIP_TRAILING_SLASH,
  HTACCESS_TRAILING_SLASH_ONLY,
  ROUTES,
  SPA_REDIRECT_STORAGE_KEY,
} from './spa-routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')

const STATIC_HTML = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>מעביר…</title>
    <script>
      try {
        var p = location.pathname || ''
        if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1)
        if (p && p.startsWith('/') && !p.startsWith('//') && p.indexOf('..') === -1) {
          sessionStorage.setItem('${SPA_REDIRECT_STORAGE_KEY}', p)
        }
      } catch (e) {}
      location.replace('/')
    </script>
  </head>
  <body></body>
</html>
`

const MARK_START = '# BEGIN SPA_STATIC_TRAILING_SLASH'
const MARK_END = '# END SPA_STATIC_TRAILING_SLASH'

function writeStubs() {
  for (const route of ROUTES) {
    const segments = route.split('/').filter(Boolean)
    const dir = path.join(publicDir, ...segments)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'index.html'), STATIC_HTML, 'utf8')
  }
  console.log(`generate-spa-static-routes: wrote ${ROUTES.length} stubs under public/`)
}

function injectHtaccessRules() {
  const htPath = path.join(publicDir, '.htaccess')
  let content = fs.readFileSync(htPath, 'utf8')

  const skip = new Set(HTACCESS_SKIP_TRAILING_SLASH)
  const sorted = [...ROUTES, ...HTACCESS_TRAILING_SLASH_ONLY]
    .filter((r) => !skip.has(r))
    .sort((a, b) => b.length - a.length)
  // Internal rewrite only — external R=301 becomes http:// behind SSL-terminating proxies.
  const block = sorted.map((r) => `RewriteRule ^${r}$ /${r}/ [L]`).join('\n')

  const injected = `${MARK_START}\n${block}\n${MARK_END}`

  if (content.includes(MARK_START) && content.includes(MARK_END)) {
    const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`, 'm')
    content = content.replace(re, injected)
  } else {
    console.warn('generate-spa-static-routes: markers missing in .htaccess, appending block after RewriteBase')
    content = content.replace(/(RewriteBase\s+\/\s*\n)/, `$1\n${injected}\n`)
  }

  fs.writeFileSync(htPath, content, 'utf8')
  console.log('generate-spa-static-routes: updated .htaccess')
}

console.log(`generate-spa-static-routes: ${ROUTES.length} routes (auto-collected from source)`)

writeStubs()
injectHtaccessRules()
