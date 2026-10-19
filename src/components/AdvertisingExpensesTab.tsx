import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import CsTableContainer from './CsStandardTable'
import CsTablePaginationFooter from './CsTablePaginationFooter'
import {
  CsTableRowCheckboxCell,
  CsTableSelectAllHeaderCell,
  CsTableSelectionBar,
  CsTableSelectionDeleteButton,
  useCsTableSelection,
} from './CsTableSelection'
import { deleteSelectedIds } from '../lib/csTableListHelpers'
import { GAP_BELOW_INNER_NAV_PX } from '../layout/headerLayout'
import {
  deleteAdvertisingExpense,
  getAdvertisingExpenses,
  type AdvertisingExpense,
} from '../api/csApi'
import { formatExpenseAmount, formatExpenseDate } from '../lib/expensesUi'
import CreateAdvertisingExpenseDialog from './CreateAdvertisingExpenseDialog'

type SortCol = 'domain' | 'expenseDate' | 'amount'
type SortDir = 'asc' | 'desc'

function domainLabel(row: AdvertisingExpense): string {
  const domain = String(row.domain || '').trim()
  const sub = String(row.subService || '').trim()
  const category = String(row.category || '').trim()
  const name = [domain, sub].filter(Boolean).join(' · ')
  if (name && category) return `${name} (${category})`
  return name || category || '—'
}

export default function AdvertisingExpensesTab() {
  const [rows, setRows] = useState<AdvertisingExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: 'expenseDate',
    dir: 'desc',
  })
  const rowSelection = useCsTableSelection()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAdvertisingExpenses())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הוצאות פרסום')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [domainLabel(row), row.expenseDate, row.amount]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(q),
    )
  }, [query, rows])

  useEffect(() => {
    setPage(0)
  }, [query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const va = sort.col === 'amount' ? String(a.amount ?? 0) : sort.col === 'domain' ? domainLabel(a) : String(a.expenseDate || '')
      const vb = sort.col === 'amount' ? String(b.amount ?? 0) : sort.col === 'domain' ? domainLabel(b) : String(b.expenseDate || '')
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [page, rowsPerPage, sortedRows])

  const onSortColumn = (col: SortCol) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    )
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          הוצאה חדשה
        </Button>
        <Button variant="outlined" onClick={() => void load()} disabled={loading}>
          רענון
        </Button>
        <TextField
          size="small"
          placeholder="חיפוש תחום / תאריך / סכום"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery('')} aria-label="ניקוי חיפוש">
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
            htmlInput: { dir: 'rtl' },
          }}
          sx={{
            width: { xs: 180, sm: 240 },
            '& .MuiOutlinedInput-root': { borderRadius: 999, backgroundColor: 'background.paper' },
            '& .MuiInputBase-input': { textAlign: 'right', direction: 'rtl' },
          }}
        />
      </Box>

      {error ? (
        <Stack sx={{ gap: `${GAP_BELOW_INNER_NAV_PX}px`, mt: `${GAP_BELOW_INNER_NAV_PX}px` }}>
          <Alert severity="error">{error}</Alert>
        </Stack>
      ) : null}

      {loading ? (
        <Box sx={{ mt: `${GAP_BELOW_INNER_NAV_PX}px`, py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', mt: `${GAP_BELOW_INNER_NAV_PX}px` }}>
          <CsTableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <CsTableSelectAllHeaderCell
                    pageRows={pageRows}
                    getRowId={(row) => (row as AdvertisingExpense).id}
                    selectedIds={rowSelection.selectedIds}
                    onTogglePage={() => rowSelection.toggleAllOnPage(pageRows)}
                  />
                  <TableCell align="center" sortDirection={sort.col === 'domain' ? sort.dir : false}>
                    <TableSortLabel
                      active={sort.col === 'domain'}
                      direction={sort.col === 'domain' ? sort.dir : 'asc'}
                      onClick={() => onSortColumn('domain')}
                    >
                      תחום
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sortDirection={sort.col === 'amount' ? sort.dir : false}>
                    <TableSortLabel
                      active={sort.col === 'amount'}
                      direction={sort.col === 'amount' ? sort.dir : 'asc'}
                      onClick={() => onSortColumn('amount')}
                    >
                      סכום
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sortDirection={sort.col === 'expenseDate' ? sort.dir : false}>
                    <TableSortLabel
                      active={sort.col === 'expenseDate'}
                      direction={sort.col === 'expenseDate' ? sort.dir : 'asc'}
                      onClick={() => onSortColumn('expenseDate')}
                    >
                      תאריך
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      אין הוצאות פרסום
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <CsTableRowCheckboxCell
                        rowId={row.id}
                        selected={rowSelection.isSelected(row.id)}
                        onToggle={rowSelection.toggleRow}
                      />
                      <TableCell align="center">{domainLabel(row)}</TableCell>
                      <TableCell align="center">
                        {formatExpenseAmount({ amount: row.amount, currency: 'ILS' })}
                      </TableCell>
                      <TableCell align="center">{formatExpenseDate(row.expenseDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CsTableContainer>
          <CsTablePaginationFooter
            rowsPerPageOptions={[10, 25, 50, 100]}
            count={sortedRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_e, next) => setPage(next)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number.parseInt(e.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage="שורות בעמוד:"
            labelDisplayedRows={({ from, to, count }) =>
              count === 0 ? '0 מתוך 0' : `${from}–${to} מתוך ${count}`
            }
          />
        </Box>
      )}

      <CsTableSelectionBar
        open={rowSelection.selectedCount > 0}
        selectedCount={rowSelection.selectedCount}
        onClear={rowSelection.clearSelection}
      >
        <CsTableSelectionDeleteButton
          selectedCount={rowSelection.selectedCount}
          entityLabel="הוצאות פרסום"
          dialogTitle="מחיקת הוצאות פרסום"
          onDelete={async () => {
            await deleteSelectedIds(rowSelection.selectedIds, deleteAdvertisingExpense)
            rowSelection.clearSelection()
            await load()
          }}
        />
      </CsTableSelectionBar>

      <CreateAdvertisingExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </Box>
  )
}
