import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const SPA_REDIRECT_STORAGE_KEY = 'perfectoSpaRedirect'

const STORAGE_KEY = SPA_REDIRECT_STORAGE_KEY

/**
 * רענון מלא (Ctrl+R) על נתיב עמוק בפריסה סטטית עלול להחזיר 404.
 * ה-stub ב-public/<route>/index.html שומר את הנתיב ומפנה ל-/ — כאן משלימים ניווט בצד הלקוח.
 */
export function hardReloadSpaPreservingRoute() {
  try {
    let p = window.location.pathname || ''
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1)
    if (p && p.startsWith('/') && !p.startsWith('//') && p.indexOf('..') === -1) {
      window.sessionStorage.setItem(STORAGE_KEY, p)
    }
  } catch {
    /* ignore */
  }
  window.location.replace(`/?_=${Date.now()}`)
}

function readSafePath(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw || typeof raw !== 'string') return null
    if (!raw.startsWith('/') || raw.startsWith('//')) return null
    if (raw.includes('..')) return null
    let p = raw.trim()
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1)
    return p
  } catch {
    return null
  }
}

export default function SpaRedirectBootstrap() {
  const navigate = useNavigate()

  useEffect(() => {
    const path = readSafePath()
    if (!path) return
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    navigate(path, { replace: true })
  }, [navigate])

  return null
}
