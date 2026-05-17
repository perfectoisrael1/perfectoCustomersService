/**
 * הגדרות טבלת עובדי חברה — עמודות ברירת מחדל, סדר מועדף ותוויות בעברית (מחוץ לקומפוננטת העמוד).
 */

/** ערכי תפקיד בעת יצירת עובד — נשלחים ל־API בשדה `role` (בצד השרת ממופים ל־`status`) */
export const COMPANY_EMPLOYEE_ROLE_OPTIONS = [
  { value: 'מנהל', label: 'מנהל' },
  { value: 'מכירות', label: 'מכירות' },
  { value: 'שירות לקוחות', label: 'שירות לקוחות' },
] as const

export const COMPANY_EMPLOYEES_FALLBACK_COLUMNS = [
  'id',
  'username',
  'fullName',
  'status',
  'createdAt',
  'updatedAt',
] as const

const PREFERRED_COLUMN_ORDER = [
  'id',
  'username',
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
  role: 'תפקיד / הרשאה',
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
