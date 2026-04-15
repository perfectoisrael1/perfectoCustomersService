import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getCities, type City } from '../api/csApi'

export default function CitiesPage() {
  const [rows, setRows] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getCities())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ערים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="אזורים וערים"
      subtitle="קטלוג הערים והאזורים של Perfecto"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['region', 'city']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'region', label: 'אזור', minWidth: 180, render: (row) => row.region },
        { key: 'city', label: 'עיר', minWidth: 180, render: (row) => row.city },
        { key: 'slug', label: 'slug', render: (row) => row.slug ?? '' },
      ]}
    />
  )
}
