export const ISRAEL_TIMEZONE = 'Asia/Jerusalem'

export function getIsraelDateStamp(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE })
}

export function getIsraelDayBoundsIso(dateStamp?: string): { from: string; to: string } {
  const stamp =
    dateStamp && /^\d{4}-\d{2}-\d{2}$/.test(dateStamp) ? dateStamp : getIsraelDateStamp()
  const [y, m, d] = stamp.split('-').map(Number)
  const from = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString()
  const to = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString()
  return { from, to }
}

export function formatDateInIsrael(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' },
): string {
  if (value == null || value === '') return '—'
  const d = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE, ...options })
}
