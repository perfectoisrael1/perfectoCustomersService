import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

type Column<T> = {
  key: string
  label: string
  minWidth?: number
  render: (row: T) => string | number | boolean | null | undefined
}

type Props<T> = {
  title: string
  subtitle?: string
  rows: T[]
  columns: Column<T>[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  searchFields?: (keyof T)[]
  rowKey: (row: T) => string | number
}

function toSearchValue(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'כן' : 'לא'
  return String(value)
}

export default function DataTablePage<T extends object>({
  title,
  subtitle,
  rows,
  columns,
  loading,
  error,
  onRefresh,
  searchFields,
  rowKey,
}: Props<T>) {
  const [query, setQuery] = useState('')

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((row) => {
      const values = searchFields?.length
        ? searchFields.map((field) => row[field])
        : Object.values(row)
      return values.some((value) => toSearchValue(value).toLowerCase().includes(q))
    })
  }, [query, rows, searchFields])

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            mb: 2,
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש"
              size="small"
              sx={{ minWidth: { sm: 240 } }}
            />
            <Button variant="contained" onClick={onRefresh}>
              רענון
            </Button>
          </Stack>
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {loading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              מוצגות {filteredRows.length} רשומות
            </Typography>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 260px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        sx={{ fontWeight: 800, minWidth: column.minWidth }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={rowKey(row)} hover>
                      {columns.map((column) => (
                        <TableCell key={column.key}>{toSearchValue(column.render(row))}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                        אין נתונים להצגה
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
