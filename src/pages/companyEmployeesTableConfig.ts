/**
 * הגדרות טבלת עובדי חברה — עמודות ברירת מחדל, סדר מועדף ותוויות בעברית (מחוץ לקומפוננטת העמוד).
 */

/** ערכי תפקיד — נשמרים בעמודה `role` */
export const COMPANY_EMPLOYEE_ROLE_OPTIONS = [
  { value: 'מנהל', label: 'מנהל' },
  { value: 'מכירות', label: 'מכירות' },
  { value: 'שירות לקוחות', label: 'שירות לקוחות' },
  { value: 'סושיאל', label: 'סושיאל' },
  { value: 'קידום אתרים', label: 'קידום אתרים' },
  { value: 'מתכנת', label: 'מתכנת' },
] as const

export type CompanyEmployeeRoleOption = { value: string; label: string }

export const COMPANY_EMPLOYEE_CUSTOM_ROLES_STORAGE_KEY = 'perfecto-cs-custom-employee-roles'

export function loadCustomEmployeeRoles(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(COMPANY_EMPLOYEE_CUSTOM_ROLES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v) => String(v ?? '').trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export function saveCustomEmployeeRoles(roles: string[]): void {
  if (typeof window === 'undefined') return
  const unique = Array.from(
    new Set(roles.map((r) => r.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'he'))
  window.localStorage.setItem(
    COMPANY_EMPLOYEE_CUSTOM_ROLES_STORAGE_KEY,
    JSON.stringify(unique),
  )
}

/** מיזוג תפקידים מוגדרים, מותאמים אישית, מהטבלה והערך הנוכחי */
export function buildCompanyEmployeeRoleOptions(
  customRoles: string[],
  existingFromRows: string[] = [],
  currentValue?: string,
): CompanyEmployeeRoleOption[] {
  const seen = new Set<string>()
  const ordered: CompanyEmployeeRoleOption[] = []

  const add = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    ordered.push({ value: trimmed, label: trimmed })
  }

  for (const opt of COMPANY_EMPLOYEE_ROLE_OPTIONS) add(opt.value)
  for (const role of customRoles) add(role)
  for (const role of existingFromRows) add(role)
  if (currentValue) add(currentValue)

  return ordered
}

/** סטטוס חשבון — נשמר ב־`status`; `active` נדרש להתחברות */
export const COMPANY_EMPLOYEE_STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל' },
  { value: 'inactive', label: 'לא פעיל' },
] as const

export function normalizeCompanyEmployeeStatus(raw: unknown): 'active' | 'inactive' {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'active' || v === 'פעיל') return 'active'
  return 'inactive'
}

export function formatCompanyEmployeeStatusLabel(raw: unknown): string {
  const normalized = normalizeCompanyEmployeeStatus(raw)
  return (
    COMPANY_EMPLOYEE_STATUS_OPTIONS.find((opt) => opt.value === normalized)?.label
    ?? String(raw ?? '—')
  )
}

export const COMPANY_EMPLOYEES_FALLBACK_COLUMNS = [
  'id',
  'username',
  'password',
  'fullName',
  'role',
  'status',
  'createdAt',
  'updatedAt',
] as const

const PREFERRED_COLUMN_ORDER = [
  'id',
  'username',
  'password',
  'fullName',
  'full_name',
  'role',
  'status',
  'email',
  'phone',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
] as const

/** סידור מפתחות שדה לפי סדר עסקי, ואז האחרים לפי א״ב */
export function companyEmployeesColumnOrder(keys: string[]): string[] {
  const preferred = [...PREFERRED_COLUMN_ORDER]
  const rest = filterAndSortRest(keys, preferred)
  const head = preferred.filter((k) => keys.includes(k))
  return [...head, ...rest]
}

function filterAndSortRest(keys: string[], preferred: readonly string[]): string[] {
  const prefSet = new Set(preferred)
  return keys.filter((k) => !prefSet.has(k)).sort((a, b) => a.localeCompare(b, 'he'))
}

const COLUMN_LABELS_HE: Readonly<Record<string, string>> = {
  id: 'מזהה',
  username: 'שם משתמש',
  fullName: 'שם מלא',
  full_name: 'שם מלא',
  role: 'תפקיד',
  status: 'סטטוס',
  email: 'אימייל',
  phone: 'טלפון',
  createdAt: 'נוצר',
  updatedAt: 'עודכן',
  created_at: 'נוצר',
  updated_at: 'עודכן',
  password: 'סיסמה',
}

export function companyEmployeesColumnHeaderLabel(key: string): string {
  return COLUMN_LABELS_HE[key] ?? key
}
