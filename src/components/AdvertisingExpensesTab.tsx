import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { expenseRtlFieldSx, formatExpenseAmount, formatExpenseDate } from '../lib/expensesUi'
import CreateAdvertisingExpenseDialog from './CreateAdvertisingExpenseDialog'

type SortCol = 'domain' | 'expenseDate' | 'amount' | 'income' | 'netProfit'

function netProfit(row: Pick<AdvertisingExpense, 'amount' | 'income'>): number {
  return (Number(row.income) || 0) - (Number(row.amount) || 0)
}
type SortDir = 'asc' | 'desc'

function profitRowSx(row: AdvertisingExpense) {
  const expense = Number(row.amount) || 0
  const income = Number(row.income) || 0
  if (income > expense) {
    return {
      bgcolor: 'rgba(76, 175, 80, 0.16) !important',
      '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.24) !important' },
    }
  }
  if (expense > income) {
    return {
      bgcolor: 'rgba(244, 67, 54, 0.14) !important',
      '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.22) !important' },
    }
  }
  return undefined
}

function isDeletableRate(row: AdvertisingExpense): boolean {
  return !row.incomeOnly && Number(row.id) > 0
}

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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [domainFilter, setDomainFilter] = useState<string | null>(null)
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

  const domainOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const row of rows) {
      const label = domainLabel(row)
      if (label && label !== '—') labels.add(label)
    }
    return [...labels].sort((a, b) => a.localeCompare(b, 'he'))
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = dateFrom.trim().slice(0, 10)
    const to = dateTo.trim().slice(0, 10)
    return rows.filter((row) => {
      const day = String(row.expenseDate || '').slice(0, 10)
      if (from && day && day < from) return false
      if (to && day && day > to) return false
      if (domainFilter && domainLabel(row) !== domainFilter) return false
      if (!q) return true
      return [domainLabel(row), row.expenseDate, row.amount, row.income, netProfit(row)]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(q)
    })
  }, [dateFrom, dateTo, domainFilter, query, rows])

  useEffect(() => {
    setPage(0)
  }, [dateFrom, dateTo, domainFilter, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const sortValue = (row: AdvertisingExpense) => {
        if (sort.col === 'amount') return String(row.amount ?? 0)
        if (sort.col === 'income') return String(row.income ?? 0)
        if (sort.col === 'netProfit') return String(netProfit(row))
        if (sort.col === 'domain') return domainLabel(row)
        return String(row.expenseDate || '')
      }
      const va = sortValue(a)
      const vb = sortValue(b)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [page, rowsPerPage, sortedRows])

  const totals = useMemo(() => {
    let amount = 0
    let income = 0
    for (const row of filtered) {
      amount += Number(row.amount) || 0
      income += Number(row.income) || 0
    }
    return { amount, income }
  }, [filtered])

  const onSortColumn = (col: SortCol) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    )
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
        <Autocomplete
          options={domainOptions}
          value={domainFilter}
          onChange={(_e, value) => setDomainFilter(value)}
          size="small"
          clearOnEscape
          noOptionsText="אין תחומים"
          sx={{
            width: { xs: 200, sm: 260 },
            ...expenseRtlFieldSx,
            '& .MuiOutlinedInput-root': { borderRadius: 999, backgroundColor: 'background.paper' },
          }}
          slotProps={{ paper: { sx: { direction: 'rtl' } } }}
          renderInput={(params) => (
            <TextField {...params} placeholder="סינון לפי תחום" />
          )}
        />
        <TextField
          size="small"
          type="date"
          label="מתאריך"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          sx={{ ...expenseRtlFieldSx, minWidth: 160 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { dir: 'rtl' } }}
        />
        <TextField
          size="small"
          type="date"
          label="עד תאריך"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          sx={{ ...expenseRtlFieldSx, minWidth: 160 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { dir: 'rtl' } }}
        />
        <TextField
          size="small"
          placeholder="חיפוש תחום / תאריך / הוצאה"
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
        <Button
          variant="contained"
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 700, marginInlineStart: 'auto' }}
        >
          הגדרת תעריפים
        </Button>
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
            <Table
              size="small"
              sx={{
                '& tfoot': {
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 11,
                },
                '& tfoot td': {
                  fontWeight: 800,
                  borderTop: '2px solid',
                  borderColor: 'divider',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <CsTableSelectAllHeaderCell
                    pageRows={pageRows}
                    getRowId={(row) =>
                      isDeletableRate(row as AdvertisingExpense)
                        ? (row as AdvertisingExpense).id
                        : null
                    }
                    selectedIds={rowSelection.selectedIds}
                    onTogglePage={() =>
                      rowSelection.toggleAllOnPage(pageRows.filter((row) => isDeletableRate(row)))
                    }
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
                      הוצאה
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sortDirection={sort.col === 'income' ? sort.dir : false}>
                    <TableSortLabel
                      active={sort.col === 'income'}
                      direction={sort.col === 'income' ? sort.dir : 'asc'}
                      onClick={() => onSortColumn('income')}
                    >
                      הכנסה
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sortDirection={sort.col === 'netProfit' ? sort.dir : false}>
                    <TableSortLabel
                      active={sort.col === 'netProfit'}
                      direction={sort.col === 'netProfit' ? sort.dir : 'asc'}
                      onClick={() => onSortColumn('netProfit')}
                    >
                      נטו רווח
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
                    <TableCell colSpan={6} align="center">
                      אין נתונים
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => (
                    <TableRow
                      key={Number(row.id) > 0 ? row.id : `day-${row.serviceId}-${row.expenseDate}`}
                      hover
                      sx={profitRowSx(row)}
                    >
                      <CsTableRowCheckboxCell
                        rowId={row.id}
                        selected={rowSelection.isSelected(row.id)}
                        onToggle={rowSelection.toggleRow}
                        disabled={!isDeletableRate(row)}
                      />
                      <TableCell align="center">{domainLabel(row)}</TableCell>
                      <TableCell align="center">
                        {formatExpenseAmount({ amount: row.amount, currency: 'ILS' })}
                      </TableCell>
                      <TableCell align="center">
                        {formatExpenseAmount({ amount: row.income ?? 0, currency: 'ILS' })}
                      </TableCell>
                      <TableCell align="center">
                        {formatExpenseAmount({ amount: netProfit(row), currency: 'ILS' })}
                      </TableCell>
                      <TableCell align="center">{formatExpenseDate(row.expenseDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow
                  sx={{
                    ...profitRowSx({ amount: totals.amount, income: totals.income } as AdvertisingExpense),
                    '&:hover': undefined,
                  }}
                >
                  <TableCell />
                  <TableCell align="center">סיכום</TableCell>
                  <TableCell align="center">
                    {formatExpenseAmount({ amount: totals.amount, currency: 'ILS' })}
                  </TableCell>
                  <TableCell align="center">
                    {formatExpenseAmount({ amount: totals.income, currency: 'ILS' })}
                  </TableCell>
                  <TableCell align="center">
                    {formatExpenseAmount({
                      amount: totals.income - totals.amount,
                      currency: 'ILS',
                    })}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
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
            await deleteSelectedIds(
              new Set([...rowSelection.selectedIds].filter((id) => Number(id) > 0)),
              deleteAdvertisingExpense,
            )
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
