import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getTasks, type Task } from '../api/csApi'

export default function TasksPage() {
  const [rows, setRows] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getTasks())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="משימות"
      subtitle="טבלת משימות פנימיות של הצוות"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['task_name', 'project_name', 'responsible', 'status']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'task_name', label: 'משימה', minWidth: 180, render: (row) => row.task_name },
        { key: 'project_name', label: 'פרויקט', render: (row) => row.project_name },
        { key: 'sprint_number', label: 'ספרינט', render: (row) => row.sprint_number },
        { key: 'responsible', label: 'אחראי', render: (row) => row.responsible },
        { key: 'status', label: 'סטטוס', render: (row) => row.status },
        { key: 'execution_date', label: 'תאריך ביצוע', render: (row) => row.execution_date },
      ]}
    />
  )
}
