import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getLeads, type Lead } from '../api/csApi'

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getLeads())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת לידים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="לידים"
      subtitle="מעקב אחרי לידים, אחריות ותשלומים"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['name', 'phone', 'businessName', 'status', 'responsible']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'name', label: 'שם', minWidth: 160, render: (row) => row.name },
        { key: 'phone', label: 'טלפון', render: (row) => row.phone },
        { key: 'businessName', label: 'עסק', minWidth: 160, render: (row) => row.businessName },
        { key: 'status', label: 'סטטוס', render: (row) => row.status },
        { key: 'responsible', label: 'אחראי', render: (row) => row.responsible },
        { key: 'amount', label: 'סכום', render: (row) => row.amount ?? '' },
        { key: 'created', label: 'נוצר', render: (row) => row.created },
      ]}
    />
  )
}
