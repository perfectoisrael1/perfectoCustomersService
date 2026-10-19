export const MANAGER_ROLE = 'מנהל'

/** מנהל קבוע לפי השם המלא, גם אם עמודת התפקיד עדיין לא עודכנה */
export const DESIGNATED_MANAGER_FULL_NAME = 'איתמר בן עטר'

export function normalizePersonName(name: string | null | undefined): string {
  return String(name || '').replace(/\s+/g, ' ').trim()
}

export function isDesignatedManagerName(fullName: string | null | undefined): boolean {
  return normalizePersonName(fullName) === DESIGNATED_MANAGER_FULL_NAME
}

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

export function isManagerUser(
  user: { role?: string | null; fullName?: string | null } | null | undefined,
): boolean {
  return isManagerRole(user?.role) || isDesignatedManagerName(user?.fullName)
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  const r = String(role || '').trim().toLowerCase()
  return r === 'superadmin' || r === 'super_admin'
}

export const MANAGER_ONLY_ROUTE_PREFIXES = [
  '/jobs',
  '/payment-attempts',
  '/tasks',
  '/company-employees',
  '/domains',
  '/dashboards',
  '/notifications',
  '/conversations',
  '/complaints',
  '/expenses',
  '/advertising-expenses',
  '/general',
] as const

export function isManagerOnlyRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return MANAGER_ONLY_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}
