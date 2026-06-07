import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPaymentLinks, type PaymentLinkRow } from '../api/csApi'
import {
  sumPaidPaymentLinksThisMonth,
  sumPaidPaymentLinksThisWeek,
  sumPaidPaymentLinksToday,
  sumPaidPaymentLinksTotal,
} from '../lib/paymentLinksDashboard'

export function useSuppliersDashboard(enabled = true) {
  const [rows, setRows] = useState<PaymentLinkRow[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPaymentLinks()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת קישורי תשלום')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void load()
  }, [enabled, load])

  const totals = useMemo(
    () => ({
      today: sumPaidPaymentLinksToday(rows),
      week: sumPaidPaymentLinksThisWeek(rows),
      month: sumPaidPaymentLinksThisMonth(rows),
      total: sumPaidPaymentLinksTotal(rows),
    }),
    [rows],
  )

  return { rows, loading, error, load, totals }
}
