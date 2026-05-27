/**
 * אוסף אוטומטית נתיבי SPA מקבצי המקור — בכל build, בלי רשימה ידנית.
 */
import fs from 'fs'
import path from 'path'

const SKIP_SEGMENT = /^(:|\*|\{|\[)/
const NUMERIC_SEGMENT = /^\d+$/

export function collectSpaRoutes({
  rootDir,
  globs = ['src/**/*.{tsx,ts}'],
  extraRoutes = [],
  htaccessTrailingSlashOnly = [],
}) {
  const routes = new Set()
  const routeRoots = new Set()

  for (const r of [...extraRoutes, ...htaccessTrailingSlashOnly]) {
    addRoute(r, routes, routeRoots)
  }

  const files = new Set()
  for (const pattern of globs) {
    for (const abs of resolveGlob(rootDir, pattern)) {
      if (abs.includes(`${path.sep}api${path.sep}`)) continue
      if (abs.includes(`${path.sep}node_modules${path.sep}`)) continue
      if (abs.includes(`${path.sep}dist${path.sep}`)) continue
      files.add(abs)
    }
  }

  for (const filePath of files) {
    let content
    try {
      content = fs.readFileSync(filePath, 'utf8')
    } catch {
      continue
    }
    extractPathsFromContent(content, routes, routeRoots)
  }

  const allContent = [...files].map((f) => fs.readFileSync(f, 'utf8')).join('\n')
  expandDynamicRouteLiterals(allContent, routes, routeRoots)
  expandParametricRoutes(allContent, routes, routeRoots)

  return [...routes].sort((a, b) => a.localeCompare(b))
}

function extractPathsFromContent(content, routes, routeRoots) {
  const patterns = [
    /\bpath=["']([^"']+)["']/g,
    /\bto=["'](\/[^"']+)["']/g,
    /navigate\s*\(\s*["'](\/[^"'?]+)["']/g,
    /navigate\s*\(\s*`(\/[a-zA-Z0-9][a-zA-Z0-9/_-]*)`/g,
    /["'](\/(?:[a-zA-Z0-9][a-zA-Z0-9/_-]*))["']\s*:/g,
    /:\s*["'](\/(?:[a-zA-Z0-9][a-zA-Z0-9/_-]*))["']\s*,/g,
    /location\.pathname\s*!==\s*["'](\/[^"']+)["']/g,
    /startsWith\s*\(\s*["'](\/[^"']+)["']\s*\)/g,
  ]

  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      ingestRawPath(m[1], routes, routeRoots)
    }
  }
}

function expandDynamicRouteLiterals(allContent, routes, routeRoots) {
  for (const m of allContent.matchAll(/["'](\/[a-zA-Z0-9][a-zA-Z0-9/_-]+)["']/g)) {
    ingestRawPath(m[1], routes, routeRoots)
  }
}

function expandParametricRoutes(allContent, routes, routeRoots) {
  const arrayLiterals = [...allContent.matchAll(/VALID_[A-Z_]+\s*[^=]*=\s*\[([\s\S]*?)\]/g)]
  for (const m of arrayLiterals) {
    const values = [...m[1].matchAll(/['"]([a-zA-Z0-9_-]+)['"]/g)].map((x) => x[1])
    if (values.length === 0) continue
    const ctxBefore = allContent.slice(Math.max(0, m.index - 400), m.index)
    let prefix = null
    if (/JobsTab|jobs\//i.test(ctxBefore + m[0])) prefix = 'jobs'
    if (prefix) {
      for (const v of values) addRoute(`${prefix}/${v}`, routes, routeRoots)
    }
  }

  const slugMap = allContent.match(/SLUG_TO_TAB[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (slugMap) {
    for (const line of slugMap[1].split('\n')) {
      const km = line.match(/^\s*['"]?([a-zA-Z0-9_-]+)['"]?\s*:/)
      if (km) addRoute(`tasks/${km[1]}`, routes, routeRoots)
    }
  }
}

function ingestRawPath(raw, routes, routeRoots) {
  if (!raw || typeof raw !== 'string') return
  let p = raw.trim()
  if (!p.startsWith('/') || p.startsWith('//')) return
  if (p.includes('${') || p.includes('..')) return
  if (/\.(js|ts|tsx|css|png|jpg|svg|woff)/i.test(p)) return

  p = p.split('?')[0].split('#')[0]
  if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1)
  if (p === '/' || p === '') return

  const segments = p.split('/').filter(Boolean)
  if (segments.length > 8) return
  if (segments.some((s) => SKIP_SEGMENT.test(s) || NUMERIC_SEGMENT.test(s))) return

  if (['api', 'v1', 'assets', 'static'].includes(segments[0])) return

  addRoute(segments.join('/'), routes, routeRoots)
}

function resolveGlob(rootDir, pattern) {
  const normalized = pattern.replace(/\\/g, '/')
  if (!normalized.includes('**')) {
    const abs = path.join(rootDir, normalized)
    return fs.existsSync(abs) ? [abs] : []
  }
  const [prefix, suffix] = normalized.split('**/')
  const base = path.join(rootDir, prefix.replace(/\/$/, ''))
  const ext = suffix.startsWith('.') ? suffix : null
  const out = []
  if (!fs.existsSync(base)) return out
  walkSourceFiles(base, ext, out)
  return out
}

function walkSourceFiles(dir, extPattern, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walkSourceFiles(full, extPattern, out)
      continue
    }
    if (!extPattern) {
      out.push(full)
      continue
    }
    const exts = extPattern.replace(/^\./, '').split(',')
    if (exts.some((e) => full.endsWith(e.trim()))) out.push(full)
  }
}

function addRoute(route, routes, routeRoots) {
  const clean = String(route || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
  if (!clean || clean.includes('..')) return
  routes.add(clean)
  const first = clean.split('/')[0]
  if (first) routeRoots.add(first)
}
