import type { Job } from '../api/csApi'
import { isoDatePrefix, jerusalemYmd, jobStatusChipColors } from './caliberUi'
import { jerusalemMonthStartYmd, jerusalemWeekStartYmd } from './leadsDashboard'

export type JobStatusBreakdownItem = {
  label: string
  count: number
  color: string
  percentage: number
}

const JOB_STATUS_DASHBOARD_ORDER = [
  'פניות ללא ספקים',
  'ממתין לאישור ספק',
  'פניות מאושרות',
  'פניות שנדחו',
  'נתפס על ידי ספק אחר',
] as const

function dashboardJobStatusLabel(raw: string): string {
  const label = String(raw || '').trim() || 'לא מוגדר'
  if (label === 'פנייה חדשה' || label === 'חדשה') return 'פניות ללא ספקים'
  if (label === 'ממתין') return 'ממתין לאישור ספק'
  if (label === 'מאושר') return 'פניות מאושרות'
  if (label === 'נדחה') return 'פניות שנדחו'
  if (label === 'נתפס') return 'נתפס על ידי ספק אחר'
  return label
}

function jobStatusDashboardSortIndex(label: string): number {
  const idx = JOB_STATUS_DASHBOARD_ORDER.indexOf(label as (typeof JOB_STATUS_DASHBOARD_ORDER)[number])
  return idx === -1 ? JOB_STATUS_DASHBOARD_ORDER.length : idx
}

export function jobCreatedYmd(job: Job): string | null {
  return isoDatePrefix(job.created)
}

export function countJobsSince(jobs: Job[], fromYmd: string | null): number {
  if (!fromYmd) return jobs.length
  return jobs.filter((job) => {
    const created = jobCreatedYmd(job)
    return Boolean(created && created >= fromYmd)
  }).length
}

export function countJobsToday(jobs: Job[]): number {
  const todayYmd = jerusalemYmd()
  return jobs.filter((job) => jobCreatedYmd(job) === todayYmd).length
}

export function countJobsThisWeek(jobs: Job[]): number {
  return countJobsSince(jobs, jerusalemWeekStartYmd())
}

export function countJobsThisMonth(jobs: Job[]): number {
  return countJobsSince(jobs, jerusalemMonthStartYmd())
}

export function countJobsTotal(jobs: Job[]): number {
  return jobs.length
}

export function getJobsByStatus(jobs: Job[]): JobStatusBreakdownItem[] {
  const counts = new Map<string, number>()

  for (const job of jobs) {
    const label = dashboardJobStatusLabel(String(job.statusLabel || ''))
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const total = jobs.length

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      color: jobStatusChipColors(label === 'לא מוגדר' ? null : label).bg,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => {
      const orderDiff = jobStatusDashboardSortIndex(a.label) - jobStatusDashboardSortIndex(b.label)
      if (orderDiff !== 0) return orderDiff
      return b.count - a.count || a.label.localeCompare(b.label, 'he')
    })
}
