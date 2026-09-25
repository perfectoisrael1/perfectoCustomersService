import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getPpcDashboard,
  type Job,
  type PpcDashboardRows,
  type PpcDashboardSummary,
} from '../api/csApi'
import { jerusalemYmd } from '../lib/caliberUi'
import { jerusalemMonthStartYmd } from '../lib/leadsDashboard'
import {
  revenuePeriodRange,
  type RevenuePeriodId,
} from '../lib/paymentLinksDashboard'
import { parsePpcPeriod } from '../lib/ppcDashboardRoutes'

const EMPTY_ROWS: PpcDashboardRows = {
  ppcLeads: [],
  ppcApproved: [],
  followUpsCreated: [],
  followUpsApproved: [],
  profit: [],
}

const EMPTY_SUMMARY: PpcDashboardSummary = {
  ppcLeads: 0,
  ppcApproved: 0,
  followUpsCreated: 0,
  followUpsApproved: 0,
  profit: 0,
  rows: EMPTY_ROWS,
}

function asJobList(value: unknown): Job[] {
  return Array.isArray(value) ? value : []
}

export function usePpcDashboard(enabled = true) {
  const [searchParams, setSearchParams] = useSearchParams()
  const period = parsePpcPeriod(searchParams.get('period')) ?? 'month'
  const [customFrom, setCustomFromState] = useState(
    () => searchParams.get('from')?.slice(0, 10) || jerusalemMonthStartYmd(),
  )
  const [customTo, setCustomToState] = useState(
    () => searchParams.get('to')?.slice(0, 10) || jerusalemYmd(),
  )
  const [summary, setSummary] = useState<PpcDashboardSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const setPeriod = useCallback(
    (next: RevenuePeriodId) => {
      if (!enabled) return
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('period', next)
          if (next === 'custom') {
            params.set('from', customFrom)
            params.set('to', customTo)
          } else {
            params.delete('from')
            params.delete('to')
          }
          return params
        },
        { replace: true },
      )
    },
    [customFrom, customTo, enabled, setSearchParams],
  )

  const setCustomFrom = useCallback(
    (value: string) => {
      setCustomFromState(value)
      if (!enabled || period !== 'custom') return
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('period', 'custom')
          params.set('from', value)
          params.set('to', customTo)
          return params
        },
        { replace: true },
      )
    },
    [customTo, enabled, period, setSearchParams],
  )

  const setCustomTo = useCallback(
    (value: string) => {
      setCustomToState(value)
      if (!enabled || period !== 'custom') return
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('period', 'custom')
          params.set('from', customFrom)
          params.set('to', value)
          return params
        },
        { replace: true },
      )
    },
    [customFrom, enabled, period, setSearchParams],
  )

  const { fromYmd, toYmd } = useMemo(
    () => revenuePeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPpcDashboard(fromYmd, toYmd)
      setSummary({
        ppcLeads: Number(data?.ppcLeads) || 0,
        ppcApproved: Number(data?.ppcApproved) || 0,
        followUpsCreated: Number(data?.followUpsCreated) || 0,
        followUpsApproved: Number(data?.followUpsApproved) || 0,
        profit: Number(data?.profit) || 0,
        rows: {
          ppcLeads: asJobList(data?.rows?.ppcLeads),
          ppcApproved: asJobList(data?.rows?.ppcApproved),
          followUpsCreated: asJobList(data?.rows?.followUpsCreated),
          followUpsApproved: asJobList(data?.rows?.followUpsApproved),
          profit: asJobList(data?.rows?.profit),
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת דשבורד PPC')
      setSummary(EMPTY_SUMMARY)
    } finally {
      setLoading(false)
    }
  }, [fromYmd, toYmd])

  useEffect(() => {
    if (!enabled) return
    void load()
  }, [enabled, load])

  return {
    summary,
    loading,
    error,
    load,
    period,
    setPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
  }
}
