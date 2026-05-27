import { ACCOUNT_STATUS_CELL_BG, mapAccountStatusLabel } from './caliberUi'
import { LEADS_DIALOG_ACCENT, LEAD_PHONE_EMPHASIS } from './leadsUi'

export { LEADS_DIALOG_ACCENT as ACCOUNTS_DIALOG_ACCENT }
export const ACCOUNT_PHONE_EMPHASIS = LEAD_PHONE_EMPHASIS

export const PERFECTO_STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל' },
  { value: 'unactive', label: 'לא פעיל' },
  { value: 'inactive', label: 'לא פעיל' },
  { value: 'suspended', label: 'בהשעיה' },
  { value: 'pending', label: 'ממתין' },
] as const

export const AVAILABILITY_OPTIONS = [
  { value: '1', label: 'זמין' },
  { value: '0', label: 'לא זמין (לא בשעות העבודה)' },
  { value: '2', label: 'לא זמין (כיבוי ידני באפליקציה)' },
] as const

export function accountStatusOptionsForForm(raw: string | null | undefined) {
  const cur = String(raw || '').trim().toLowerCase()
  const merged = new Map<string, string>()
  for (const o of PERFECTO_STATUS_OPTIONS) {
    merged.set(o.value, o.label)
  }
  if (cur && !merged.has(cur)) {
    merged.set(cur, mapAccountStatusLabel(cur))
  }
  return Array.from(merged.entries()).map(([value, label]) => ({ value, label }))
}

export function accountStatusChipColors(raw: string | null | undefined): { bg: string; fg: string } {
  const label = mapAccountStatusLabel(raw)
  const bg = ACCOUNT_STATUS_CELL_BG[label]
  if (!bg) return { bg: '#757575', fg: '#fff' }
  const fgMap: Record<string, string> = {
    פעיל: '#1B5E20',
    'לא פעיל': '#1565C0',
    בהשעיה: '#BF360C',
    ממתין: '#827717',
  }
  return { bg, fg: fgMap[label] || '#263238' }
}

export function parseJsonStringArrayField(raw: string | null | undefined): string[] {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((x) => String(x || '').trim()).filter(Boolean)
  } catch {
    return trimmed
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
}

export function stringifyJsonStringArray(items: string[]): string | null {
  const clean = items.map((s) => s.trim()).filter(Boolean)
  return clean.length ? JSON.stringify(clean) : null
}

export const accountFieldInputSx = {
  mt: 0.5,
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: 'background.paper',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
    '&:hover fieldset': { borderColor: LEADS_DIALOG_ACCENT },
    '&.Mui-focused fieldset': { borderColor: LEADS_DIALOG_ACCENT, borderWidth: 2 },
  },
} as const

export type AccountTabKey = 'phone' | 'business' | 'domains' | 'status'

export const ACCOUNT_EDIT_TABS: { key: AccountTabKey; title: string }[] = [
  { key: 'phone', title: 'טלפון' },
  { key: 'business', title: 'פרטי עסק' },
  { key: 'domains', title: 'תחומים וערים' },
  { key: 'status', title: 'סטטוס וזמינות' },
]
