/**
 * עיצוב משותף למסך לידים (טבלה, דיאלוג, צבעי סטטוס).
 */
import type { Theme } from '@mui/material/styles'

/** כחול להדגשת תוויות שדות ומסגרות מיקוד בדיאלוג לידים */
export const LEADS_DIALOG_ACCENT = '#1e88e5'

/** צבע הדגשה לטלפון בטבלה ובשדה */
export const LEAD_PHONE_EMPHASIS = '#227EB5'

export const STANDARD_TABLE_BODY_FONT_PX = 14

/**
 * סטטוסים לבחירה — רשימה קצרה לפרפקטו (קוביות בדיאלוג).
 * ערך קיים בליד שלא ברשימה יתווסף אוטומטית לבחירה.
 */
export const LEADS_STATUS_OPTIONS: readonly string[] = [
  'אמ 2',
  'לחזור אליו',
  'אין מענה',
  'חדש',
  'לא מעוניין',
  'שילם בהעברה',
  'שילם',
  'אמ 3',
  'מעוניין מחכים לתשלום',
  'לא מעוניין דמי הקמה',
]

const STATUS_COLOR_ENTRIES: [string, { bg: string; fg: string }][] = [
  ['אמ 2', { bg: '#FF7043', fg: '#fff' }],
  ['לחזור אליו', { bg: '#FFA726', fg: '#fff' }],
  ['אין מענה', { bg: '#90A4AE', fg: '#fff' }],
  ['חדש', { bg: '#BDBDBD', fg: '#fff' }],
  ['לא מעוניין', { bg: '#C62828', fg: '#fff' }],
  ['שילם בהעברה', { bg: '#66BB6A', fg: '#fff' }],
  ['שילם', { bg: '#2E7D32', fg: '#fff' }],
  ['אמ 3', { bg: '#64B5F6', fg: '#fff' }],
  ['מעוניין מחכים לתשלום', { bg: '#FF8A65', fg: '#fff' }],
  ['לא מעוניין דמי הקמה', { bg: '#E91E63', fg: '#fff' }],
]

export const LEADS_STATUS_COLORS: Record<string, { bg: string; fg: string }> = Object.fromEntries(
  STATUS_COLOR_ENTRIES,
)

/** מזהי תצוגות סטטוס בטאב לידים — סדר הרשימה קובע סדר הטאבים */
export type LeadStatusViewId =
  | 'status-new'
  | 'status-no-answer'
  | 'status-follow-up'
  | 'status-paid'
  | 'status-not-interested'

export type LeadStatusViewConfig = {
  id: LeadStatusViewId
  label: string
  statuses: readonly string[]
}

/** קיבוץ סטטוסים לתצוגות בטאב לידים */
export const LEAD_STATUS_VIEWS: readonly LeadStatusViewConfig[] = [
  { id: 'status-new', label: 'חדש', statuses: ['חדש'] },
  { id: 'status-no-answer', label: 'אין מענה', statuses: ['אין מענה', 'אמ 2', 'אמ 3'] },
  { id: 'status-follow-up', label: 'לחזור אליו', statuses: ['לחזור אליו', 'מעוניין מחכים לתשלום'] },
  { id: 'status-paid', label: 'שילם', statuses: ['שילם', 'שילם בהעברה'] },
  { id: 'status-not-interested', label: 'לא מעוניין', statuses: ['לא מעוניין', 'לא מעוניין דמי הקמה'] },
]

const STATUS_TO_VIEW_ID = new Map<string, LeadStatusViewId>(
  LEAD_STATUS_VIEWS.flatMap((view) => view.statuses.map((status) => [status, view.id] as const)),
)

const LEAD_STATUS_VIEW_BY_ID = Object.fromEntries(
  LEAD_STATUS_VIEWS.map((view) => [view.id, view]),
) as Record<LeadStatusViewId, LeadStatusViewConfig>

export function isLeadStatusViewId(value: string | null | undefined): value is LeadStatusViewId {
  return Boolean(value && value in LEAD_STATUS_VIEW_BY_ID)
}

export function getLeadStatusViewId(status: string | null | undefined): LeadStatusViewId | null {
  return STATUS_TO_VIEW_ID.get(String(status || '').trim()) ?? null
}

export function getLeadStatusViewLabel(status: string | null | undefined): string {
  const viewId = getLeadStatusViewId(status)
  if (!viewId) return String(status || '').trim() || '—'
  return LEAD_STATUS_VIEW_BY_ID[viewId].label
}

export function leadMatchesStatusView(
  status: string | null | undefined,
  viewId: LeadStatusViewId,
): boolean {
  const view = LEAD_STATUS_VIEW_BY_ID[viewId]
  const st = String(status || '').trim()
  return view.statuses.includes(st)
}

export function getLeadStatusViewColors(viewId: LeadStatusViewId): { bg: string; fg: string } {
  const view = LEAD_STATUS_VIEW_BY_ID[viewId]
  return getLeadStatusColors(view.statuses[0])
}

export function getLeadStatusColors(status: string | null | undefined): { bg: string; fg: string } {
  return LEADS_STATUS_COLORS[String(status || '').trim()] || { bg: '#E0E0E0', fg: '#000' }
}

export function leadStatusOptionsForForm(existingStatus: string | null | undefined): string[] {
  const cur = String(existingStatus || '').trim()
  const merged = new Set<string>(LEADS_STATUS_OPTIONS)
  if (cur) merged.add(cur)
  return Array.from(merged)
}

export const LEAD_TYPE_OPTIONS = [
  'בלי אפליקציה',
  'עם אפליקציה ולא עשה חבילה',
  'רכש חבילה',
] as const

export type LeadTypeOption = (typeof LEAD_TYPE_OPTIONS)[number]

const LEAD_TYPE_COLOR_ENTRIES: [LeadTypeOption, { bg: string; fg: string }][] = [
  ['בלי אפליקציה', { bg: '#90A4AE', fg: '#fff' }],
  ['עם אפליקציה ולא עשה חבילה', { bg: '#FFA726', fg: '#fff' }],
  ['רכש חבילה', { bg: '#2E7D32', fg: '#fff' }],
]

export const LEAD_TYPE_COLORS: Record<LeadTypeOption, { bg: string; fg: string }> = Object.fromEntries(
  LEAD_TYPE_COLOR_ENTRIES,
) as Record<LeadTypeOption, { bg: string; fg: string }>

export function getLeadTypeColors(leadType: string | null | undefined): { bg: string; fg: string } {
  const key = String(leadType || '').trim() as LeadTypeOption
  return LEAD_TYPE_COLORS[key] || { bg: '#E0E0E0', fg: '#000' }
}

export function formatLeadPhoneDisplay(val: string | null | undefined): string {
  const s = String(val || '').trim()
  if (!s) return '—'
  const normalized = s.replace(/^\+?\s*972/, '0')
  const digits = normalized.replace(/\D/g, '')
  if (digits.startsWith('05') && digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return normalized
}

export const leadFieldInputSx = {
  mt: 0.5,
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: 'background.paper',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
    '&:hover fieldset': { borderColor: LEADS_DIALOG_ACCENT },
    '&.Mui-focused fieldset': { borderColor: LEADS_DIALOG_ACCENT, borderWidth: 2 },
  },
} as const

export function leadTableScrollbarSx(theme: Theme) {
  const dark = theme.palette.mode === 'dark'
  const track = dark ? 'rgba(255,255,255,0.2)' : '#ffffff'
  const thumb = dark ? 'rgba(255,255,255,0.6)' : '#e2e8f0'
  const thumbHover = dark ? 'rgba(255,255,255,0.85)' : '#cbd5e1'
  return {
    scrollbarGutter: 'stable',
    scrollbarWidth: 'auto',
    scrollbarColor: `${thumb} ${track}`,
    paddingBottom: '12px',
    boxSizing: 'border-box',
    '&::-webkit-scrollbar': { height: 16, width: 16 },
    '&::-webkit-scrollbar-track': {
      backgroundColor: track,
      borderRadius: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: thumb,
      borderRadius: 8,
      border: '3px solid transparent',
      backgroundClip: 'padding-box',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: thumbHover,
    },
    '&::-webkit-scrollbar-corner': {
      backgroundColor: track,
    },
  }
}
