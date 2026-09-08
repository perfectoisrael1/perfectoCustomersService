import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { formatCsDateTime, formatCsPhoneDisplay } from '../lib/caliberUi'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import CsTableContainer from '../components/CsStandardTable'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'
import { getPaymentLinks, type PaymentLinkRow } from '../api/csApi'
import {
  paymentAttemptMatchesFilter,
  paymentAttemptMethodLabel,
  paymentAttemptPurposeLabel,
  paymentAttemptStatusChip,
  paymentAttemptStatusLabel,
  type PaymentAttemptStatusFilter,
} from '../lib/paymentAttemptsUi'

type SortCol = 'created' | 'account' | 'phone' | 'purpose' | 'amount' | 'status'
type SortDir = 'asc' | 'desc'

const TABS: { id: PaymentAttemptStatusFilter; label: string }[] = [
  { id: 'all', label: 'הכל' },
  { id: 'failed', label: 'נכשל' },
  { id: 'paid', label: 'הצליח' },
  { id: 'pending', label: 'ממתין' },
  { id: 'expired', label: 'לא הושלם' },
]

function jobIdFromPackageKey(key: string | null | undefined): string {
  const m = String(key ?? '').match(/^job-(\d+)$/)
  return m ? m[1] : '—'
}

export default function PaymentAttemptsPage() {
  const theme = useTheme()
  const [rows, setRows] = useState<PaymentLinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<PaymentAttemptStatusFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: 'created',
    dir: 'desc',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getPaymentLinks())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת ניסיונות תשלום')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const tabRows = useMemo(
    () => rows.filter((r) => paymentAttemptMatchesFilter(r, tab)),
    [rows, tab],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    const qd = q.replace(/\D/g, '')
    return tabRows.filter((r) => {
      const blob = [
        r.accountName,
        r.phoneNumber,
        r.accountId,
        r.purpose,
        paymentAttemptPurposeLabel(r.purpose),
        r.status,
        paymentAttemptStatusLabel(r.status),
        r.paymentMethod,
        paymentAttemptMethodLabel(r.paymentMethod),
        r.errorLabel,
        r.errorCode,
        r.linkId,
        r.packageKey,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const phone = String(r.phoneNumber || '').replace(/\D/g, '')
      return blob.includes(q) || (qd.length > 0 && phone.includes(qd))
    })
  }, [query, tabRows])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let va = ''
      let vb = ''
      switch (sort.col) {
        case 'account':
          va = String(a.accountName || a.accountId)
          vb = String(b.accountName || b.accountId)
          break
        case 'phone':
          va = String(a.phoneNumber || '')
          vb = String(b.phoneNumber || '')
          break
        case 'purpose':
          va = paymentAttemptPurposeLabel(a.purpose)
          vb = paymentAttemptPurposeLabel(b.purpose)
          break
        case 'amount':
          va = String(a.amount ?? 0)
          vb = String(b.amount ?? 0)
          break
        case 'status':
          va = paymentAttemptStatusLabel(a.status)
          vb = paymentAttemptStatusLabel(b.status)
          break
        default:
          va = String(a.created || '')
          vb = String(b.created || '')
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
        : { col, dir: col === 'created' ? 'desc' : 'asc' },
    )
  }, [])

  return (
    <Box
      sx={{
        minHeight: CS_PAGE_FILL_MIN_HEIGHT_CSS,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
          zIndex: 2,
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Tabs
            value={tab}
            onChange={(_, v: PaymentAttemptStatusFilter) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0 } }}
          >
            {TABS.map((t) => (
              <Tab key={t.id} value={t.id} label={t.label} />
            ))}
          </Tabs>
          <TextField
            size="small"
            placeholder="חיפוש שם / טלפון / ליד"
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
            }}
            sx={{
              width: { xs: 180, sm: 240 },
              '& .MuiOutlinedInput-root': { borderRadius: 999, backgroundColor: 'background.paper' },
            }}
          />
        </Box>
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
                    <TableCell align="center" sortDirection={sort.col === 'created' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'created'}
                        direction={sort.col === 'created' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('created')}
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
                        ליד
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'account' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'account'}
                        direction={sort.col === 'account' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('account')}
                      >
                        שם
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sort.col === 'purpose' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'purpose'}
                        direction={sort.col === 'purpose' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('purpose')}
                      >
                        סוג
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">אמצעי</TableCell>
                    <TableCell align="center">פנייה</TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'amount' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'amount'}
                        direction={sort.col === 'amount' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('amount')}
                      >
                        סכום
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'status' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'status'}
                        direction={sort.col === 'status' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('status')}
                      >
                        סטטוס
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>פירוט</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        אין ניסיונות תשלום
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((row) => {
                      const chip = paymentAttemptStatusChip(row.status)
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell align="center">{formatCsDateTime(row.created)}</TableCell>
                          <TableCell
                            align="center"
                            title={row.accountId ? `חשבון ${row.accountId}` : undefined}
                            sx={{ direction: 'ltr', fontWeight: 600 }}
                          >
                            {formatCsPhoneDisplay(row.phoneNumber)}
                          </TableCell>
                          <TableCell align="center">{row.accountName || '—'}</TableCell>
                          <TableCell>{paymentAttemptPurposeLabel(row.purpose)}</TableCell>
                          <TableCell align="center">{paymentAttemptMethodLabel(row.paymentMethod)}</TableCell>
                          <TableCell align="center">{jobIdFromPackageKey(row.packageKey)}</TableCell>
                          <TableCell align="center">
                            {Number.isFinite(Number(row.amount)) ? `${Number(row.amount)} ₪` : '—'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={paymentAttemptStatusLabel(row.status)}
                              sx={{ bgcolor: chip.bg, color: chip.fg, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>{row.errorLabel || '—'}</TableCell>
                        </TableRow>
                      )
                    })
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
    </Box>
  )
}
