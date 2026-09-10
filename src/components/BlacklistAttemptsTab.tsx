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
import { formatCsDateTime } from '../lib/caliberUi'
import { formatLeadPhoneDisplay } from '../lib/leadsUi'
import { blacklistAttemptMatchesQuery, blacklistAttemptSourceLabel } from '../lib/blacklistUi'
import {
  deletePhoneBlacklistAttempt,
  getPhoneBlacklistAttempts,
  type PhoneBlacklistAttempt,
} from '../api/csApi'

type SortCol = 'phone' | 'attemptedName' | 'source' | 'details' | 'createdAt'
type SortDir = 'asc' | 'desc'

export default function BlacklistAttemptsTab() {
  const theme = useTheme()
  const [rows, setRows] = useState<PhoneBlacklistAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: 'createdAt',
    dir: 'desc',
  })
  const rowSelection = useCsTableSelection()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getPhoneBlacklistAttempts())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת ניסיונות שנחסמו')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => rows.filter((row) => blacklistAttemptMatchesQuery(row, query)),
    [query, rows],
  )

  const sortedRows = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      if (sort.col === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      }
      if (sort.col === 'source') {
        return (
          blacklistAttemptSourceLabel(a.source).localeCompare(
            blacklistAttemptSourceLabel(b.source),
            'he',
          ) * dir
        )
      }
      return String(a[sort.col] || '').localeCompare(String(b[sort.col] || ''), 'he') * dir
    })
    return copy
  }, [filtered, sort])

  const pageRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const onSortColumn = (col: SortCol) => {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    )
    setPage(0)
  }

  useEffect(() => {
    setPage(0)
  }, [query])

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => void load()} disabled={loading} sx={{ fontWeight: 700 }}>
          רענון
        </Button>
        <TextField
          size="small"
          placeholder="חיפוש מספר / שם / מקור"
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
            width: { xs: 180, sm: 260 },
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
                      getRowId={(r) => (r as PhoneBlacklistAttempt).id}
                      selectedIds={rowSelection.selectedIds}
                      onTogglePage={() => rowSelection.toggleAllOnPage(pageRows)}
                    />
                    <TableCell align="center" sortDirection={sort.col === 'createdAt' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'createdAt'}
                        direction={sort.col === 'createdAt' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('createdAt')}
                      >
                        תאריך
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'phone' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'phone'}
                        direction={sort.col === 'phone' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('phone')}
                      >
                        טלפון
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'attemptedName' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'attemptedName'}
                        direction={sort.col === 'attemptedName' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('attemptedName')}
                      >
                        שם
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'source' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'source'}
                        direction={sort.col === 'source' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('source')}
                      >
                        מקור
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'details' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'details'}
                        direction={sort.col === 'details' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('details')}
                      >
                        פרטים
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        אין ניסיונות שנחסמו
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
                        <TableCell align="center">{formatCsDateTime(row.createdAt)}</TableCell>
                        <TableCell align="center">{formatLeadPhoneDisplay(row.phone)}</TableCell>
                        <TableCell align="center">{row.attemptedName || '—'}</TableCell>
                        <TableCell align="center">{blacklistAttemptSourceLabel(row.source)}</TableCell>
                        <TableCell align="center">{row.details || '—'}</TableCell>
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
          entityLabel="ניסיונות"
          dialogTitle="מחיקת ניסיונות"
          onDelete={async () => {
            await deleteSelectedIds(rowSelection.selectedIds, deletePhoneBlacklistAttempt)
            rowSelection.clearSelection()
            await load()
          }}
        />
      </CsTableSelectionBar>
    </Box>
  )
}
