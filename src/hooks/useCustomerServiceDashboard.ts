import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTickets, type Ticket } from '../api/csApi'
import {
  countTicketsThisMonth,
  countTicketsThisWeek,
  countTicketsToday,
  countTicketsTotal,
  getTicketsByIssueType,
} from '../lib/ticketsDashboard'

export function useCustomerServiceDashboard(enabled = true) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTickets()
      setTickets(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת קריאות')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void load()
  }, [enabled, load])

  const counts = useMemo(
    () => ({
      today: countTicketsToday(tickets),
      week: countTicketsThisWeek(tickets),
      month: countTicketsThisMonth(tickets),
      total: countTicketsTotal(tickets),
    }),
    [tickets],
  )

  const issueTypeBreakdown = useMemo(() => getTicketsByIssueType(tickets), [tickets])

  return { tickets, loading, error, load, counts, issueTypeBreakdown }
}
