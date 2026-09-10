import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
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
  deleteExpense,
  getExpenses,
  openExpenseInvoiceView,
  type Expense,
} from '../api/csApi'
import { formatExpenseAmount, formatExpenseDate } from '../lib/expensesUi'
import CreateExpenseDialog from './CreateExpenseDialog'

type SortCol = 'expenseName' | 'receiptDate' | 'amount' | 'accountName'
type SortDir = 'asc' | 'desc'

export default function ExpensesTab() {
  const theme = useTheme()
  const [rows, setRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: 'receiptDate',
    dir: 'desc',
  })
  const rowSelection = useCsTableSelection()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getExpenses())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הוצאות')
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
    return rows.filter((r) => {
      const blob = [r.expenseName, r.receiptDate, r.amount, r.currency, r.accountName]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [query, rows])

  useEffect(() => {
    setPage(0)
  }, [query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let va = ''
      let vb = ''
      switch (sort.col) {
        case 'expenseName':
          va = String(a.expenseName || '')
          vb = String(b.expenseName || '')
          break
        case 'accountName':
          va = String(a.accountName || '')
          vb = String(b.accountName || '')
          break
        case 'amount':
          va = String(a.amount ?? 0)
          vb = String(b.amount ?? 0)
          break
        default:
          va = String(a.receiptDate || '')
          vb = String(b.receiptDate || '')
      }
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: SortCol) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'receiptDate' || col === 'amount' ? 'desc' : 'asc' },
    )
  }, [])

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => setDialogOpen(true)} sx={{ fontWeight: 700 }}>
          +
        </Button>
        <Button variant="contained" onClick={() => void load()} disabled={loading} sx={{ fontWeight: 700 }}>
          רענון
        </Button>
        <TextField
          size="small"
          placeholder="חיפוש שם / תאריך / סכום / ספק"
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
            '& .MuiInputBase-input::placeholder': { textAlign: 'right', direction: 'rtl' },
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
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            mt: `${GAP_BELOW_INNER_NAV_PX}px`,
          }}
        >
          <Box sx={csPagedTableOuterBoxSx(theme)}>
            <CsTableContainer sx={csTableInnerPagedScrollSx}>
              <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
                <TableHead>
                  <TableRow>
                    <CsTableSelectAllHeaderCell
                      pageRows={pageRows}
                      getRowId={(r) => (r as Expense).id}
                      selectedIds={rowSelection.selectedIds}
                      onTogglePage={() => rowSelection.toggleAllOnPage(pageRows)}
                    />
                    <TableCell align="center" sortDirection={sort.col === 'expenseName' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'expenseName'}
                        direction={sort.col === 'expenseName' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('expenseName')}
                      >
                        שם ההוצאה
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'receiptDate' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'receiptDate'}
                        direction={sort.col === 'receiptDate' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('receiptDate')}
                      >
                        תאריך
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
                    <TableCell align="center" sortDirection={sort.col === 'accountName' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'accountName'}
                        direction={sort.col === 'accountName' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('accountName')}
                      >
                        שיוך
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">חשבונית</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        אין הוצאות
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
                        <TableCell align="center">{row.expenseName || '—'}</TableCell>
                        <TableCell align="center">{formatExpenseDate(row.receiptDate)}</TableCell>
                        <TableCell align="center">{formatExpenseAmount(row)}</TableCell>
                        <TableCell align="center">{row.accountName || '—'}</TableCell>
                        <TableCell align="center">
                          {row.invoiceUrl ? (
                            <Link
                              component="button"
                              type="button"
                              onClick={() => void openExpenseInvoiceView(row.id)}
                              sx={{ fontWeight: 700 }}
                            >
                              צפייה
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
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
        </Box>
      )}

      <CsTableSelectionBar
        open={rowSelection.selectedCount > 0}
        selectedCount={rowSelection.selectedCount}
        onClear={rowSelection.clearSelection}
      >
        <CsTableSelectionDeleteButton
          selectedCount={rowSelection.selectedCount}
          entityLabel="הוצאות"
          dialogTitle="מחיקת הוצאות"
          onDelete={async () => {
            await deleteSelectedIds(rowSelection.selectedIds, deleteExpense)
            rowSelection.clearSelection()
            await load()
          }}
        />
      </CsTableSelectionBar>

      <CreateExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </Box>
  )
}
