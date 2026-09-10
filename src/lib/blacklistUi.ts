import type { PhoneBlacklistAttempt } from '../api/csApi'

export const blacklistRtlFieldSx = {
  direction: 'rtl',
  '& .MuiOutlinedInput-root': { direction: 'rtl' },
  '& .MuiInputBase-input': {
    textAlign: 'right',
    direction: 'rtl',
  },
  '& .MuiInputBase-input::placeholder': {
    textAlign: 'right',
    direction: 'rtl',
    opacity: 1,
  },
  '& .MuiInputLabel-root': {
    right: 28,
    left: 'auto',
    transformOrigin: 'top right',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    right: 24,
    left: 'auto',
    transformOrigin: 'top right',
  },
  '& .MuiOutlinedInput-notchedOutline legend': {
    textAlign: 'right',
    float: 'unset',
  },
  '& .MuiFormHelperText-root': {
    direction: 'rtl',
    textAlign: 'right',
    marginRight: 0,
    marginLeft: 0,
  },
} as const

export function blacklistAttemptSourceLabel(source: string | null | undefined): string {
  switch (String(source || '').trim()) {
    case 'lead':
      return 'ליד (מערכת)'
    case 'lead_webhook':
      return 'ליד (אתר)'
    case 'lead_patch':
      return 'עדכון ליד'
    case 'job':
      return 'פנייה מלקוח'
    case 'job_campaign':
      return 'פנייה (קמפיין)'
    default:
      return source || '—'
  }
}

export function blacklistAttemptMatchesQuery(
  row: PhoneBlacklistAttempt,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    row.phone,
    row.phoneCore9,
    row.attemptedName,
    row.details,
    row.source,
    blacklistAttemptSourceLabel(row.source),
  ]
    .map((value) => String(value || '').toLowerCase())
    .some((value) => value.includes(q))
}
