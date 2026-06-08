import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DownloadIcon from '@mui/icons-material/Download'
import { useAuth } from '../context/useAuth'
import { getPerfectoCustomerServiceUsers, listMyPayslips, listUserPayslips } from '../api/csApi'
import { listAttendance } from '../api/attendanceApi'
import { formatDateInIsrael } from '../lib/israelTime'
import { formatTime, isAdminOrSuperadminRole } from '../lib/attendanceUtils'
import {
  downloadPayslipUrl,
  getPayslipDownloadFilename,
  mergeAndSortPayslipUrls,
  monthYearLabelFromPayslipUrl,
} from '../lib/payslipsUi'
import { STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS } from '../layout/headerLayout'
import { csDataTableSx } from '../lib/csTableUi'

const RANGE_OPTIONS = [
  { value: 'week', label: 'השבוע' },
  { value: 'month', label: 'החודש' },
  { value: 'year', label: 'השנה' },
  { value: 'all', label: 'כל הזמנים' },
] as const

const INNER_TABS = [
  { slug: 'attendance', label: 'נוכחות' },
  { slug: 'data', label: 'נתונים' },
  { slug: 'payslips', label: 'תלושים' },
] as const

type RangeValue = (typeof RANGE_OPTIONS)[number]['value']
type InnerSlug = (typeof INNER_TABS)[number]['slug']

function getDateRange(range: RangeValue) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const [y, m, d] = dateStr.split('-').map(Number)
  if (range === 'all') return { fromDate: null as Date | null, toDate: null as Date | null }
  let fromDate: Date
  if (range === 'week') {
    const today = new Date(y, m - 1, d)
    const dayOfWeek = today.getDay()
    fromDate = new Date(y, m - 1, d - dayOfWeek, 0, 0, 0, 0)
  } else if (range === 'month') {
    fromDate = new Date(y, m - 1, 1, 0, 0, 0, 0)
  } else {
    fromDate = new Date(y, 0, 1, 0, 0, 0, 0)
  }
  const toDate = new Date(now.getTime())
  toDate.setHours(23, 59, 59, 999)
  return { fromDate, toDate }
}

type Props = { routeBase?: string }

export default function AttendanceHoursPage({ routeBase = '/personal-area/attendance' }: Props) {
  const theme = useTheme()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { subTab } = useParams<{ subTab?: string }>()
  const innerTab: InnerSlug = INNER_TABS.some((t) => t.slug === subTab) ? (subTab as InnerSlug) : 'attendance'
  const pathBase = routeBase.replace(/\/$/, '')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [range, setRange] = useState<RangeValue>('month')
  const [rosterUsers, setRosterUsers] = useState<Array<{ id: number; fullName?: string; username?: string; status?: string }>>([])
  const [viewedUserId, setViewedUserId] = useState<number | null>(null)
  const [payslipsLoading, setPayslipsLoading] = useState(false)
  const [payslipsFromApi, setPayslipsFromApi] = useState<string[]>([])
  const [payslipsError, setPayslipsError] = useState<string | null>(null)

  const canSelectViewedUser = isAdminOrSuperadminRole(user?.role)
  const selfNumericId = user?.id ?? null

  const viewingOtherUser = useMemo(() => {
    if (!canSelectViewedUser || selfNumericId == null || viewedUserId == null) return false
    return Number(viewedUserId) !== Number(selfNumericId)
  }, [canSelectViewedUser, selfNumericId, viewedUserId])

  const payslipSubjectName = useMemo(() => {
    if (viewingOtherUser && viewedUserId != null) {
      const u = rosterUsers.find((x) => Number(x.id) === Number(viewedUserId))
      if (u) return u.fullName || u.username || 'משתמש'
    }
    return user?.fullName || user?.username || 'התלושים שלי'
  }, [viewingOtherUser, viewedUserId, rosterUsers, user?.fullName, user?.username])

  const mergedPayslipUrls = useMemo(
    () => mergeAndSortPayslipUrls(payslipsFromApi),
    [payslipsFromApi],
  )

  useEffect(() => {
    if (!canSelectViewedUser) {
      setViewedUserId(null)
      return
    }
    if (selfNumericId != null) {
      setViewedUserId((prev) => (prev == null ? selfNumericId : prev))
    }
  }, [canSelectViewedUser, selfNumericId])

  useEffect(() => {
    if (!canSelectViewedUser || !token) return
    void (async () => {
      try {
        const list = await getPerfectoCustomerServiceUsers()
        setRosterUsers(Array.isArray(list) ? list : [])
      } catch {
        setRosterUsers([])
      }
    })()
  }, [canSelectViewedUser, token])

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const dateRange = getDateRange(range)
      const opts: Parameters<typeof listAttendance>[1] = {}
      if (dateRange.fromDate) opts.fromDate = dateRange.fromDate.toISOString()
      if (dateRange.toDate) opts.toDate = dateRange.toDate.toISOString()
      if (canSelectViewedUser && viewedUserId != null) opts.userId = viewedUserId
      const res = await listAttendance(token, opts)
      setItems(Array.isArray(res?.items) ? res.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת שעות נוכחות')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, range, canSelectViewedUser, viewedUserId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const fetchPayslips = useCallback(async () => {
    if (!token) return
    setPayslipsLoading(true)
    setPayslipsError(null)
    try {
      const res =
        viewingOtherUser && viewedUserId != null
          ? await listUserPayslips(token, viewedUserId)
          : await listMyPayslips(token)
      setPayslipsFromApi(Array.isArray(res?.urls) ? res.urls : [])
    } catch (e) {
      setPayslipsFromApi([])
      setPayslipsError(e instanceof Error ? e.message : 'שגיאה בטעינת תלושים')
    } finally {
      setPayslipsLoading(false)
    }
  }, [token, viewingOtherUser, viewedUserId])

  useEffect(() => {
    if (innerTab === 'payslips') void fetchPayslips()
  }, [innerTab, fetchPayslips])

  const monthlyHoursTotal = useMemo(() => {
    const now = new Date()
    const currMonthStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
    const [currY, currM] = currMonthStr.split('-').map(Number)
    let total = 0
    for (const r of items) {
      const created = r.createdAt ?? r.created_at
      if (!created) continue
      const itemDateStr = new Date(String(created)).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
      const [itemY, itemM] = itemDateStr.split('-').map(Number)
      if (itemY === currY && itemM === currM) {
        total += Number(r.totalSeconds ?? r.total_seconds) || 0
      }
    }
    return total
  }, [items])

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of items) {
      const created = r.createdAt ?? r.created_at
      if (!created) continue
      const day = new Date(String(created)).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
      map.set(day, (map.get(day) || 0) + (Number(r.totalSeconds ?? r.total_seconds) || 0))
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [items])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', direction: 'rtl' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          position: 'sticky',
          top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          bgcolor: 'background.paper',
          py: 1,
        }}
      >
        <Tabs
          value={innerTab}
          onChange={(_, v: InnerSlug) => navigate(`${pathBase}/${v}`, { replace: true })}
          sx={{ bgcolor: 'background.paper', borderRadius: 2, px: 1 }}
        >
          {INNER_TABS.map((t) => (
            <Tab key={t.slug} value={t.slug} label={t.label} sx={{ fontWeight: 700 }} />
          ))}
        </Tabs>

        <FormControl size="small" sx={{ minWidth: 140, display: innerTab === 'payslips' ? 'none' : undefined }}>
          <InputLabel>טווח</InputLabel>
          <Select label="טווח" value={range} onChange={(e) => setRange(e.target.value as RangeValue)}>
            {RANGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {canSelectViewedUser && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>משתמש</InputLabel>
            <Select
              label="משתמש"
              value={viewedUserId != null ? String(viewedUserId) : ''}
              onChange={(e) => setViewedUserId(Number(e.target.value))}
            >
              {selfNumericId != null && (
                <MenuItem value={String(selfNumericId)}>
                  אני ({user?.fullName || user?.username})
                </MenuItem>
              )}
              {rosterUsers
                .filter((u) => u.id !== selfNumericId && String(u.status || '').toLowerCase() === 'active')
                .map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>
                    {u.fullName || u.username}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}

        <Button
          variant="contained"
          disabled={innerTab === 'payslips' ? payslipsLoading : loading}
          onClick={() => void (innerTab === 'payslips' ? fetchPayslips() : fetchData())}
        >
          {innerTab === 'payslips'
            ? payslipsLoading
              ? 'מרענן...'
              : 'רענון'
            : loading
              ? 'מרענן...'
              : 'רענון'}
        </Button>
      </Box>

      {error && innerTab !== 'payslips' ? <Alert severity="error">{error}</Alert> : null}
      {payslipsError && innerTab === 'payslips' ? <Alert severity="error">{payslipsError}</Alert> : null}

      {innerTab === 'payslips' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'right' }}>
              מסמכים שעלו
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
              {payslipSubjectName}
            </Typography>
          </Box>

          {payslipsLoading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <TableContainer
              sx={{
                maxHeight: 480,
                overflow: 'auto',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Table size="small" stickyHeader dir="rtl" sx={csDataTableSx(theme)}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      חודש
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 56 }} align="center">
                      פתיחה
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 56 }} align="center">
                      הורדה
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mergedPayslipUrls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        אין תלושים — אחרי העלאה, הם יופיעו כאן
                      </TableCell>
                    </TableRow>
                  ) : (
                    mergedPayslipUrls.map((url, idx) => (
                      <TableRow key={`${url}-${idx}`} hover>
                        <TableCell align="right">{monthYearLabelFromPayslipUrl(url)}</TableCell>
                        <TableCell align="center">
                              <IconButton
                                component="a"
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                sx={{ p: 0.5 }}
                                title="פתח מסמך"
                              >
                                <OpenInNewIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                onClick={() => downloadPayslipUrl(url, getPayslipDownloadFilename(url))}
                                size="small"
                                sx={{ p: 0.5 }}
                                aria-label="הורדה"
                              >
                                <DownloadIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      ) : innerTab === 'data' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
            סה״כ שעות החודש: {formatTime(monthlyHoursTotal)}
          </Typography>
          <TableContainer>
            <Table size="small" dir="rtl" sx={csDataTableSx(theme)}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }} align="right">תאריך</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">שעות מצטברות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyTotals.map(([day, sec]) => (
                  <TableRow key={day}>
                    <TableCell align="right">{day}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatTime(sec)}</TableCell>
                  </TableRow>
                ))}
                {!dailyTotals.length && !loading && (
                  <TableRow>
                    <TableCell colSpan={2} align="center">אין נתונים</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small" dir="rtl" sx={csDataTableSx(theme)}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }} align="right">זמן כניסה</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">שעות מצטברות</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">סטטוס</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">בונוס</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell align="right">{formatDateInIsrael(String(r.createdAt ?? r.created_at ?? ''))}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {formatTime(Number(r.totalSeconds ?? r.total_seconds) || 0)}
                  </TableCell>
                  <TableCell align="right">{String(r.attendanceStatus ?? r.attendance_status ?? '—')}</TableCell>
                  <TableCell align="right">{Math.trunc(Number(r.bonus) || 0)}</TableCell>
                </TableRow>
              ))}
              {!items.length && !loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">אין רשומות</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
