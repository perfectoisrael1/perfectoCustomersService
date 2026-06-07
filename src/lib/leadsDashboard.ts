import type { Lead } from '../api/csApi'
import { isoDatePrefix, jerusalemYmd } from './caliberUi'

export function jerusalemWeekStartYmd(d = new Date()): string {
  const dateStr = jerusalemYmd(d)
  const [y, m, day] = dateStr.split('-').map(Number)
  const today = new Date(y, m - 1, day)
  const dayOfWeek = today.getDay()
  const weekStart = new Date(y, m - 1, day - dayOfWeek)
  return jerusalemYmd(weekStart)
}

export function jerusalemMonthStartYmd(d = new Date()): string {
  const dateStr = jerusalemYmd(d)
  const [y, m] = dateStr.split('-')
  return `${y}-${m}-01`
}

export function leadCreatedYmd(lead: Lead): string | null {
  return isoDatePrefix(lead.created)
}

export function countLeadsSince(leads: Lead[], fromYmd: string | null): number {
  if (!fromYmd) return leads.length
  return leads.filter((lead) => {
    const created = leadCreatedYmd(lead)
    return Boolean(created && created >= fromYmd)
  }).length
}

export function countLeadsThisWeek(leads: Lead[]): number {
  return countLeadsSince(leads, jerusalemWeekStartYmd())
}

export function countLeadsToday(leads: Lead[]): number {
  const todayYmd = jerusalemYmd()
  return leads.filter((lead) => leadCreatedYmd(lead) === todayYmd).length
}

export function countLeadsThisMonth(leads: Lead[]): number {
  return countLeadsSince(leads, jerusalemMonthStartYmd())
}

export function countLeadsTotal(leads: Lead[]): number {
  return leads.length
}
