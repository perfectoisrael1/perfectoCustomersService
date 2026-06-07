import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJobs, type Job } from '../api/csApi'
import {
  countJobsThisMonth,
  countJobsThisWeek,
  countJobsToday,
  countJobsTotal,
  getJobsByStatus,
} from '../lib/jobsDashboard'

export function useInquiriesDashboard(enabled = true) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getJobs()
      setJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פניות')
      setJobs([])
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
      today: countJobsToday(jobs),
      week: countJobsThisWeek(jobs),
      month: countJobsThisMonth(jobs),
      total: countJobsTotal(jobs),
    }),
    [jobs],
  )

  const statusBreakdown = useMemo(() => getJobsByStatus(jobs), [jobs])

  return { jobs, loading, error, load, counts, statusBreakdown }
}
