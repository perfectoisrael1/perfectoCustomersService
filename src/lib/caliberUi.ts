/** ערכים ועיצובים מיושרים עם שירות הלקוחות של קליבר */

export function formatCsPhoneDisplay(val: string | null | undefined): string {
  const s = String(val || '').trim()
  if (!s) return '—'
  return s.replace(/^\+?\s*972/, '0')
}

export function jerusalemYmd(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function isoDatePrefix(value: string | null | undefined): string | null {
  if (!value) return null
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

export function isCreatedTodayJerusalem(isoLike: string | null | undefined): boolean {
  const p = isoDatePrefix(isoLike)
  return Boolean(p && p === jerusalemYmd())
}

export function isFollowUpTodayOrBefore(value: string | null | undefined): boolean {
  const ymd = isoDatePrefix(value)
  if (!ymd) return false
  return ymd <= jerusalemYmd()
}

export const TICKET_STATUS_DONE = 'בוצע'
export const TICKET_STATUS_NOT_RELEVANT = 'לא רלוונטי'
export const TICKET_STATUS_NO_ANSWER_3 = 'אין מענה פעם 3'
export const ISSUE_TYPE_INVOICE = 'לא קיבל חשבונית'

export const CS_STATUS_OPTIONS = [
  'חדשה',
  'בטיפול',
  'אמ 1',
  'אמ 2',
  'אין מענה פעם 3',
  'לחזור אליו',
  'מחכה ללקוח',
  'לא רלוונטי',
  'בוצע',
] as const

export const CS_ISSUE_TYPE_OPTIONS: { label: string; bg: string; fg: string }[] = [
  { label: 'הדרכה לשליח', bg: '#EF9A9A', fg: '#FFF' },
  { label: 'השארת אשראי', bg: '#80DEEA', fg: '#FFF' },
  { label: 'הוספת ערים', bg: '#CE93D8', fg: '#FFF' },
  { label: 'מחלקת מכירות', bg: '#A1887F', fg: '#FFF' },
  { label: 'בעיה בהתראות', bg: '#FFA726', fg: '#FFF' },
  { label: 'הסבר טכני באפליקציה', bg: '#26A69A', fg: '#FFF' },
  { label: 'החזר כספי', bg: '#42A5F5', fg: '#FFF' },
  { label: 'עדיין אין פרופיל', bg: '#78909C', fg: '#FFF' },
  { label: 'בעיה בהרשמה', bg: '#AB47BC', fg: '#FFF' },
  { label: 'לא קיבל חשבונית', bg: '#424242', fg: '#FFF' },
  { label: 'מחפש בעל מקצוע', bg: '#66BB6A', fg: '#FFF' },
  { label: 'זמינות', bg: '#2E7D32', fg: '#FFF' },
  { label: 'הגדרת פרופיל תקין', bg: '#E91E63', fg: '#FFF' },
  { label: 'מחיקת חשבון', bg: '#D4E157', fg: '#FFF' },
  { label: 'עסק רשום - בעיה בה', bg: '#5D4037', fg: '#FFF' },
  { label: 'עזרה בדירוגים', bg: '#FFAB91', fg: '#FFF' },
  { label: 'ערעור על פנייה', bg: '#1A237E', fg: '#FFF' },
  { label: 'שינוי של תחום / עיר', bg: '#B0BEC5', fg: '#FFF' },
  { label: 'עשה בדיקה עם עצמו', bg: '#00695C', fg: '#FFF' },
  { label: 'אין פניות', bg: '#8BC34A', fg: '#FFF' },
  { label: 'בעיה בתשלום', bg: '#FDD835', fg: '#FFF' },
  { label: 'אחר', bg: '#90A4AE', fg: '#FFF' },
]

const ISSUE_MAP = Object.fromEntries(CS_ISSUE_TYPE_OPTIONS.map((o) => [o.label, o]))

export function issueTypeChipColors(label: string | null | undefined) {
  return ISSUE_MAP[String(label || '').trim()] || { bg: '#E0E0E0', fg: '#FFF' }
}

export const TICKET_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  בוצע: { bg: '#4CAF50', fg: '#fff' },
  'אמ 1': { bg: '#E53935', fg: '#fff' },
  'אמ 2': { bg: '#9C27B0', fg: '#fff' },
  'אין מענה פעם 3': { bg: '#212121', fg: '#fff' },
  'לחזור אליו': { bg: '#00BCD4', fg: '#fff' },
  בטיפול: { bg: '#FF9800', fg: '#fff' },
  חדשה: { bg: '#BDBDBD', fg: '#fff' },
  'מחכה ללקוח': { bg: '#0D47A1', fg: '#fff' },
  'לא רלוונטי': { bg: '#7B1FA2', fg: '#fff' },
}

export function ticketStatusChipColors(status: string | null | undefined) {
  const s = String(status || '').trim()
  return TICKET_STATUS_COLORS[s] || { bg: '#9E9E9E', fg: '#fff' }
}

const JOBS_NEUTRAL = '#C4C4C4'

export const JOB_STATUS_CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  חדשה: { bg: JOBS_NEUTRAL, fg: '#fff' },
  'פנייה חדשה': { bg: JOBS_NEUTRAL, fg: '#fff' },
  'פנייה חדשה (התאמה)': { bg: JOBS_NEUTRAL, fg: '#fff' },
  'ממתין ללקוח': { bg: '#FDB85A', fg: '#fff' },
  'הצעת מחיר': { bg: '#2691C0', fg: '#fff' },
  'בהצעת מחיר': { bg: '#2691C0', fg: '#fff' },
  'עבודה התחילה': { bg: '#e98b13', fg: '#fff' },
  בוטל: { bg: '#DF2F4A', fg: '#fff' },
  'לא נספר': { bg: '#AC6AE2', fg: '#fff' },
  'בוצעה לא שולם': { bg: '#9CD326', fg: '#fff' },
  'פנייה סגורה': { bg: '#00C875', fg: '#fff' },
  'נסגר על ידי נותן שירות': { bg: '#00C875', fg: '#fff' },
  'נסגר אוטומטית': { bg: '#00C875', fg: '#fff' },
  'בוטל לבקשת לקוח': { bg: '#DF2F4A', fg: '#fff' },
  'לא ידוע': { bg: '#9E9E9E', fg: '#fff' },
}

export function jobStatusChipColors(statusLabel: string | null | undefined) {
  const s = String(statusLabel || '').trim()
  return JOB_STATUS_CHIP_COLORS[s] || { bg: '#757575', fg: '#fff' }
}

const PERFECTO_STATUS_HE: Record<string, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  suspended: 'בהשעיה',
  pending: 'ממתין',
}

export function mapAccountStatusLabel(raw: string | null | undefined): string {
  const s = String(raw || '').trim()
  if (!s) return '—'
  const k = s.toLowerCase()
  return PERFECTO_STATUS_HE[k] || s
}

export const ACCOUNT_STATUS_CELL_BG: Record<string, string> = {
  פעיל: '#e8f5e9',
  'לא פעיל': '#e3f2fd',
  בהשעיה: '#ffe0b2',
  ממתין: '#fff9c4',
}

export function accountStatusCellBg(statusDisplay: string | null | undefined): string | undefined {
  const s = String(statusDisplay || '').trim()
  return ACCOUNT_STATUS_CELL_BG[s]
}

export const TASK_STATUS_OPTIONS = ['חדשה', 'עובדים על זה', 'תקוע', 'בדיקות', 'בוצע'] as const

export const TASK_PROJECT_OPTIONS = [
  'פרפקטו',
  'מייק',
  'אתר',
  'מאני צאט',
  'שיפורים',
] as const

/** צבעי תא פרויקט — מיושר עם קליבר + שמות ישנים */
export function taskProjectChipColors(project: string | null | undefined): { bg: string; fg: string } {
  const raw = String(project || '').trim()
  const p = raw === 'סוניה' ? 'שיפורים' : raw === 'מאניצאט' ? 'מאני צאט' : raw
  switch (p) {
    case 'קליבר ספקים':
      return { bg: '#E0F7FA', fg: '#006064' }
    case 'קליבר לקוחות':
      return { bg: '#E1F5FE', fg: '#01579B' }
    case 'יקירוס':
      return { bg: '#F3E5F5', fg: '#4A148C' }
    case 'אתר':
      return { bg: '#FFF8E1', fg: '#FF6F00' }
    case 'מייק':
      return { bg: '#FCE4EC', fg: '#880E4F' }
    case 'פרפקטו':
      return { bg: '#E8F5E9', fg: '#1B5E20' }
    case 'מאני צאט':
      return { bg: '#E8EAF6', fg: '#283593' }
    case 'שיפורים':
      return { bg: '#FBE9E7', fg: '#BF360C' }
    default:
      return { bg: '#F5F5F5', fg: '#757575' }
  }
}

export const DEFAULT_TICKET_RESPONSIBLE = ''
