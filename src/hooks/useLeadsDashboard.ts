import { useCallback, useEffect, useMemo, useState } from 'react'
import { getLeads, type Lead } from '../api/csApi'
import {
  countLeadsThisMonth,
  countLeadsThisWeek,
  countLeadsToday,
  countLeadsTotal,
} from '../lib/leadsDashboard'

export function useLeadsDashboard(enabled = true) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLeads()
      setLeads(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת לידים')
      setLeads([])
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
      today: countLeadsToday(leads),
      week: countLeadsThisWeek(leads),
      month: countLeadsThisMonth(leads),
      total: countLeadsTotal(leads),
    }),
    [leads],
  )

  return { leads, loading, error, load, counts }
}
