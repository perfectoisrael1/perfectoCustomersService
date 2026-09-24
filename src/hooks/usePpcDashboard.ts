import { useCallback, useEffect, useState } from 'react'
import { getPpcJobCount } from '../api/csApi'

export function usePpcDashboard(enabled = true) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPpcJobCount()
      setCount(Number(data?.count) || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פניות PPC')
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void load()
  }, [enabled, load])

  return { count, loading, error, load }
}
