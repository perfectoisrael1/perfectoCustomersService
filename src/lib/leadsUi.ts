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

export function getLeadStatusColors(status: string | null | undefined): { bg: string; fg: string } {
  return LEADS_STATUS_COLORS[String(status || '').trim()] || { bg: '#E0E0E0', fg: '#000' }
}

export function leadStatusOptionsForForm(existingStatus: string | null | undefined): string[] {
  const cur = String(existingStatus || '').trim()
  const merged = new Set<string>(LEADS_STATUS_OPTIONS)
  if (cur) merged.add(cur)
  return Array.from(merged)
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
