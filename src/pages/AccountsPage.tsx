import { useCallback, useEffect, useState } from 'react'
import DataTablePage from '../components/DataTablePage'
import { getAccounts, type Account } from '../api/csApi'

export default function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAccounts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת לקוחות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataTablePage
      title="לקוחות"
      subtitle="רשימת כל הלקוחות הפעילים במערכת"
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={load}
      rowKey={(row) => row.id}
      searchFields={['accountName', 'phoneNumber', 'businessName', 'email', 'specialtiesCategory']}
      columns={[
        { key: 'id', label: 'id', render: (row) => row.id },
        { key: 'accountName', label: 'שם', minWidth: 160, render: (row) => row.accountName },
        { key: 'phoneNumber', label: 'טלפון', render: (row) => row.phoneNumber },
        { key: 'businessName', label: 'עסק', minWidth: 160, render: (row) => row.businessName },
        { key: 'specialtiesCategory', label: 'קטגוריה', render: (row) => row.specialtiesCategory },
        { key: 'credits', label: 'קרדיטים', render: (row) => row.credits ?? '' },
        { key: 'updatedAt', label: 'עודכן', render: (row) => row.updatedAt },
      ]}
    />
  )
}
