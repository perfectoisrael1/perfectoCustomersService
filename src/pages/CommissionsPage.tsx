import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getServices, type Service } from '../api/csApi'

export default function CommissionsPage() {
  const [rows, setRows] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getServices())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת מחירון')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="מחירון עמלות"
      subtitle="רשימת שירותים ומחירים מתוך קטלוג Perfecto"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['category', 'service', 'subService']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'category', label: 'קטגוריה', minWidth: 180, render: (row) => row.category },
        { key: 'service', label: 'שירות', minWidth: 180, render: (row) => row.service },
        { key: 'subService', label: 'תת שירות', minWidth: 180, render: (row) => row.subService ?? '' },
        { key: 'price', label: 'מחיר', render: (row) => row.price ?? '' },
      ]}
    />
  )
}
