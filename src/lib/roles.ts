export const MANAGER_ROLE = 'מנהל'

export function isManagerRole(role: string | null | undefined): boolean {
  const r = String(role || '').trim().toLowerCase()
  return (
    r === MANAGER_ROLE.toLowerCase()
    || r === 'manager'
    || r === 'admin'
    || r === 'administrator'
    || r === 'superadmin'
  )
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  const r = String(role || '').trim().toLowerCase()
  return r === 'superadmin' || r === 'super_admin'
}

export const MANAGER_ONLY_ROUTE_PREFIXES = [
  '/jobs',
  '/tasks',
  '/company-employees',
  '/domains',
  '/dashboards',
  '/notifications',
] as const

export function isManagerOnlyRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return MANAGER_ONLY_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}
