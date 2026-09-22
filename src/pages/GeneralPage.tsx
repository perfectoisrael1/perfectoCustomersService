import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Card,
  CardContent,
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
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
  GAP_BELOW_INNER_NAV_PX,
} from '../layout/headerLayout'
import { getOutgoingCalls, type OutgoingCall } from '../api/csApi'
import {
  outgoingCallMatchesFilter,
  outgoingCallStatusChip,
  outgoingCallStatusLabel,
  type OutgoingCallStatusFilter,
} from '../lib/outgoingCallsUi'
import BlacklistEntriesTab from '../components/BlacklistEntriesTab'
import BlacklistAttemptsTab from '../components/BlacklistAttemptsTab'
import MembershipFeeSettingsTab from '../components/MembershipFeeSettingsTab'

type GeneralTab = 'scheduled-lead-calls' | 'blacklist' | 'blacklist-attempts' | 'membership-fee'

const GENERAL_TABS: GeneralTab[] = [
  'scheduled-lead-calls',
  'blacklist',
  'blacklist-attempts',
  'membership-fee',
]

const STATUS_TABS: { id: OutgoingCallStatusFilter; label: string }[] = [
  { id: 'all', label: 'הכל' },
  { id: 'pending', label: 'ממתין' },
  { id: 'completed', label: 'חויג' },
  { id: 'failed', label: 'נכשל' },
]

type SortCol = 'full_name' | 'phone' | 'lead_id' | 'scheduled_for' | 'status' | 'called_at'
type SortDir = 'asc' | 'desc'

function segmentToTab(segment: string | undefined): GeneralTab {
  const s = String(segment || '').trim()
  if (s === 'blacklist' || s === 'list') return 'blacklist'
  if (s === 'blacklist-attempts' || s === 'attempts') return 'blacklist-attempts'
  if (s === 'membership-fee' || s === 'setup-fee' || s === 'דמי-הקמה') return 'membership-fee'
  return 'scheduled-lead-calls'
}

function tabToPath(tab: GeneralTab): string {
  return `/general/${tab}`
}

export default function GeneralPage() {
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()
  const tab = segmentToTab(segment)

  useEffect(() => {
    const s = String(segment || '').trim()
    if (s === 'list') {
      navigate(tabToPath('blacklist'), { replace: true })
      return
    }
    if (s === 'attempts') {
      navigate(tabToPath('blacklist-attempts'), { replace: true })
      return
    }
    if (s && !GENERAL_TABS.includes(s as GeneralTab)) {
      navigate(tabToPath('scheduled-lead-calls'), { replace: true })
    }
  }, [segment, navigate])

  return (
    <Box sx={{ mx: -2 }}>
      <Card
        elevation={1}
        sx={{
          borderRadius: 3,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: CS_PAGE_FILL_MIN_HEIGHT_CSS,
        }}
      >
        <CardContent
          sx={{ px: 2, pb: 2, pt: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Stack spacing={0} sx={{ flex: 1, minHeight: 0, direction: 'rtl', textAlign: 'right' }}>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {tab === 'scheduled-lead-calls' ? <ScheduledLeadCallsTab /> : null}
              {tab === 'blacklist' ? <BlacklistEntriesTab /> : null}
              {tab === 'blacklist-attempts' ? <BlacklistAttemptsTab /> : null}
              {tab === 'membership-fee' ? <MembershipFeeSettingsTab /> : null}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function ScheduledLeadCallsTab() {
  const theme = useTheme()
  const [rows, setRows] = useState<OutgoingCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OutgoingCallStatusFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: 'scheduled_for',
    dir: 'desc',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getOutgoingCalls())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת שיחות מתוזמנות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const tabRows = useMemo(
    () => rows.filter((r) => outgoingCallMatchesFilter(r, statusFilter)),
    [rows, statusFilter],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    const qd = q.replace(/\D/g, '')
    return tabRows.filter((r) => {
      const blob = [
        r.full_name,
        r.phone_number,
        r.lead_id,
        r.status,
        outgoingCallStatusLabel(r.status),
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const phone = String(r.phone_number || '').replace(/\D/g, '')
      return blob.includes(q) || (qd.length > 0 && phone.includes(qd))
    })
  }, [query, tabRows])

  useEffect(() => {
    setPage(0)
  }, [statusFilter, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let va = ''
      let vb = ''
      switch (sort.col) {
        case 'full_name':
          va = String(a.full_name || '')
          vb = String(b.full_name || '')
          break
        case 'phone':
          va = String(a.phone_number || '')
          vb = String(b.phone_number || '')
          break
        case 'lead_id':
          va = String(a.lead_id || '')
          vb = String(b.lead_id || '')
          break
        case 'status':
          va = outgoingCallStatusLabel(a.status)
          vb = outgoingCallStatusLabel(b.status)
          break
        case 'called_at':
          va = String(a.called_at || '')
          vb = String(b.called_at || '')
          break
        default:
          va = String(a.scheduled_for || '')
          vb = String(b.scheduled_for || '')
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
        : { col, dir: col === 'scheduled_for' || col === 'called_at' ? 'desc' : 'asc' },
    )
  }, [])

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Tabs
          value={statusFilter}
          onChange={(_, v: OutgoingCallStatusFilter) => setStatusFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0 } }}
        >
          {STATUS_TABS.map((t) => (
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
                    <TableCell align="center" sortDirection={sort.col === 'full_name' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'full_name'}
                        direction={sort.col === 'full_name' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('full_name')}
                      >
                        שם
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
                    <TableCell align="center" sortDirection={sort.col === 'lead_id' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'lead_id'}
                        direction={sort.col === 'lead_id' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('lead_id')}
                      >
                        ליד
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={sort.col === 'scheduled_for' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'scheduled_for'}
                        direction={sort.col === 'scheduled_for' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('scheduled_for')}
                      >
                        מתוזמן ל
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
                    <TableCell align="center" sortDirection={sort.col === 'called_at' ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.col === 'called_at'}
                        direction={sort.col === 'called_at' ? sort.dir : 'asc'}
                        onClick={() => onSortColumn('called_at')}
                      >
                        חויג ב
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        אין שיחות מתוזמנות
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((row) => {
                      const chip = outgoingCallStatusChip(row.status)
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell align="center">{row.full_name || '—'}</TableCell>
                          <TableCell
                            align="center"
                            sx={{ direction: 'ltr', fontWeight: 600 }}
                          >
                            {formatCsPhoneDisplay(row.phone_number)}
                          </TableCell>
                          <TableCell align="center">{row.lead_id || '—'}</TableCell>
                          <TableCell align="center">{formatCsDateTime(row.scheduled_for)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={outgoingCallStatusLabel(row.status)}
                              sx={{ bgcolor: chip.bg, color: chip.fg, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center">{formatCsDateTime(row.called_at)}</TableCell>
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
