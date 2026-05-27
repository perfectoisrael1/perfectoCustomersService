/**
 * Creates public/<route>/index.html stubs so Apache can serve a real file when
 * mod_rewrite / SPA fallback is unreliable. Also updates public/.htaccess trailing-slash rules.
 *
 * Keep ROUTES in sync with src/App.tsx route paths.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')

const STORAGE_KEY = 'perfectoSpaRedirect'

/** Client routes that must survive hard refresh (Ctrl+R) on static hosting */
const ROUTES = [
  'login',
  'jobs',
  'jobs/today',
  'jobs/exceptions',
  'jobs/search',
  'jobs/leave',
  'accounts',
  'accounts/businesses',
  'accounts/today',
  'leads',
  'tickets',
  'tasks',
  'tasks/my-tasks',
  'tasks/all',
  'tasks/urgent',
  'tasks/done',
  'cities',
  'commissions',
  'company-employees',
]

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
          sessionStorage.setItem('${STORAGE_KEY}', p)
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
  console.log(`generate-spa-static-routes: wrote ${ROUTES.length} index.html stubs under public/`)
}

function injectHtaccessRules() {
  const htPath = path.join(publicDir, '.htaccess')
  let content = fs.readFileSync(htPath, 'utf8')

  const sorted = [...ROUTES].sort((a, b) => b.length - a.length)
  const block = sorted.map((r) => `RewriteRule ^${r}$ /${r}/ [R=301,L]`).join('\n')

  const injected = `${MARK_START}\n${block}\n${MARK_END}`

  if (content.includes(MARK_START) && content.includes(MARK_END)) {
    const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`, 'm')
    content = content.replace(re, injected)
  } else {
    console.warn('generate-spa-static-routes: markers missing in .htaccess, appending block after RewriteBase')
    content = content.replace(/(RewriteBase\s+\/\s*\n)/, `$1\n${injected}\n`)
  }

  fs.writeFileSync(htPath, content, 'utf8')
  console.log('generate-spa-static-routes: updated .htaccess trailing-slash rules')
}

writeStubs()
injectHtaccessRules()
