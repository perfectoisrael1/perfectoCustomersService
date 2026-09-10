import { useCallback, useEffect, useState } from 'react'
import { getPaymentLinks, type PaymentLinkRow } from '../api/csApi'

export function useRevenueDashboard(enabled = true) {
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
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הכנסות')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void load()
  }, [enabled, load])

  return { rows, loading, error, load }
}
