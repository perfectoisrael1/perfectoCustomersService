import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getTickets, type Ticket } from '../api/csApi'

export default function TicketsPage() {
  const [rows, setRows] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getTickets())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת שירות לקוחות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="שירות לקוחות"
      subtitle="טבלת קריאות שירות ומעקב טיפול"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['name', 'phoneNumber', 'issueType', 'status', 'responsible']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'name', label: 'name', minWidth: 150, render: (row) => row.name },
        { key: 'phoneNumber', label: 'phoneNumber', render: (row) => row.phoneNumber },
        { key: 'issueType', label: 'issueType', render: (row) => row.issueType },
        { key: 'status', label: 'status', render: (row) => row.status },
        { key: 'responsible', label: 'responsible', render: (row) => row.responsible },
        { key: 'followUpDate', label: 'followUpDate', render: (row) => row.followUpDate },
      ]}
    />
  )
}
