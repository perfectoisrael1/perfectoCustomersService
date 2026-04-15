import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getJobs, type Job } from '../api/csApi'

export default function JobsPage() {
  const [rows, setRows] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getJobs())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פניות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="פניות"
      subtitle="רשימת הפניות האחרונות מהמערכת"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['accountName', 'phoneNumber', 'businessName', 'description', 'statusLabel']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'accountName', label: 'שם לקוח', minWidth: 160, render: (row) => row.accountName },
        { key: 'phoneNumber', label: 'טלפון', render: (row) => row.phoneNumber },
        { key: 'businessName', label: 'עסק', minWidth: 160, render: (row) => row.businessName },
        { key: 'specialtiesCategory', label: 'קטגוריה', render: (row) => row.specialtiesCategory },
        { key: 'statusLabel', label: 'סטטוס', render: (row) => row.statusLabel },
        { key: 'created', label: 'נוצר', render: (row) => row.created },
      ]}
    />
  )
}
