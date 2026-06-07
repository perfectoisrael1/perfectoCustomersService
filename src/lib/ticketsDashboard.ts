import type { Ticket } from '../api/csApi'
import { isoDatePrefix, issueTypeChipColors, jerusalemYmd } from './caliberUi'
import { jerusalemMonthStartYmd, jerusalemWeekStartYmd } from './leadsDashboard'

export type IssueTypeBreakdownItem = {
  label: string
  count: number
  color: string
  percentage: number
}

export function ticketCreatedYmd(ticket: Ticket): string | null {
  return isoDatePrefix(ticket.created)
}

export function countTicketsSince(tickets: Ticket[], fromYmd: string | null): number {
  if (!fromYmd) return tickets.length
  return tickets.filter((ticket) => {
    const created = ticketCreatedYmd(ticket)
    return Boolean(created && created >= fromYmd)
  }).length
}

export function countTicketsToday(tickets: Ticket[]): number {
  const todayYmd = jerusalemYmd()
  return tickets.filter((ticket) => ticketCreatedYmd(ticket) === todayYmd).length
}

export function countTicketsThisWeek(tickets: Ticket[]): number {
  return countTicketsSince(tickets, jerusalemWeekStartYmd())
}

export function countTicketsThisMonth(tickets: Ticket[]): number {
  return countTicketsSince(tickets, jerusalemMonthStartYmd())
}

export function countTicketsTotal(tickets: Ticket[]): number {
  return tickets.length
}

export function getTicketsByIssueType(tickets: Ticket[]): IssueTypeBreakdownItem[] {
  const counts = new Map<string, number>()

  for (const ticket of tickets) {
    const label = String(ticket.issueType || '').trim() || 'לא מוגדר'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const total = tickets.length

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      color: issueTypeChipColors(label === 'לא מוגדר' ? null : label).bg,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'he'))
}
