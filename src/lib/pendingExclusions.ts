import type { Job } from '../api/csApi'

export function normalizeExclusionApproved(
  value: boolean | number | string | null | undefined,
): boolean | null {
  if (value === true || value === 1 || value === '1') return true
  if (value === false || value === 0 || value === '0') return false
  return null
}

/** החרגה שעדיין לא טופלה במשרד */
export function isPendingExclusion(job: Pick<Job, 'exclusionReason' | 'exclusionApproved'>): boolean {
  const e = String(job.exclusionReason || '').trim()
  if (!e || e === 'ללא החרגות') return false
  const approved = normalizeExclusionApproved(job.exclusionApproved)
  if (approved === true || approved === false) return false
  return !e.startsWith('מאושר החרגה')
}

export function isPendingExclusionRow(
  job: Pick<Job, 'exclusionReason' | 'exclusionApproved' | 'statusLabel'>,
): boolean {
  return String(job.statusLabel || '').trim() !== 'לא נספר' && isPendingExclusion(job)
}
