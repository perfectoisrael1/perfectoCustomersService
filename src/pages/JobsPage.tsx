import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { createFilterOptions } from '@mui/material/Autocomplete'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import {
  formatCsPhoneDisplay,
  isCreatedTodayJerusalem,
  jobStatusChipColors,
} from '../lib/caliberUi'
import {
  approveJobExclusion,
  broadcastInquiryByDomainAndCity,
  deleteJob,
  getCities,
  getJobs,
  getServices,
  rejectJobExclusion,
  type City,
  type Job,
  type Service,
} from '../api/csApi'
import CsDialogTitleWithMenu from '../components/CsDialogTitleWithMenu'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'

type JobsTab = 'today' | 'exceptions' | 'search' | 'leave'

/** עמודות מיון לטבלת פניות (תואם עמודות תצוגה) */
type JobsSortColumn =
  | 'customerDisplay'
  | 'phoneNumber'
  | 'description'
  | 'accountName'
  | 'specialtiesCategory'
  | 'statusLabel'
  | 'exclusionReason'
  | 'created'

function jobSortValue(row: Job, col: JobsSortColumn): string {
  if (col === 'customerDisplay') {
    return String(row.businessName || row.accountName || '').trim()
  }
  return String(row[col] ?? '').trim()
}

const VALID_SEGMENTS: JobsTab[] = ['today', 'exceptions', 'search', 'leave']

function segmentToTab(segment: string | undefined): JobsTab {
  const s = String(segment || '').trim()
  return (VALID_SEGMENTS.includes(s as JobsTab) ? s : 'today') as JobsTab
}

function tabToPath(tab: JobsTab): string {
  return `/jobs/${tab}`
}

/** החרגה שעדיין לא אושרה במשרד (לא «מאושר החרגה - …») */
function isPendingExclusion(exclusionReason: string | undefined | null): boolean {
  const e = String(exclusionReason || '').trim()
  if (!e || e === 'ללא החרגות') return false
  return !e.startsWith('מאושר החרגה')
}

/** תבנית ברירת־מחדל מהוובהוק: `… תחום: X. עיר: Y.` */
function parseDomainCityFromDescription(description: string | undefined | null): {
  domain: string
  city: string
} | null {
  const s = String(description || '').trim()
  const m = s.match(/תחום:\s*([^.]+?)\s*\.\s*עיר:\s*([^.]+?)\s*\./u)
  if (!m) return null
  const domain = m[1].replace(/\s+/g, ' ').trim()
  const city = m[2].replace(/\s+/g, ' ').trim()
  if (!domain || !city) return null
  return { domain, city }
}

function showBroadcastToAccountsButton(job: Job, tab: JobsTab): boolean {
  if (tab !== 'today' && tab !== 'search') return false
  return !String(job.leadDomain || '').trim()
}

const filterAutocompleteOptions = createFilterOptions<string>({
  limit: 80,
  ignoreCase: true,
  stringify: (option) => option,
})

/** מספר עמודות בטבלת פניות (כולל «פעולה») — ל־colSpan בשורת «אין נתונים» */
const JOBS_TABLE_COL_SPAN = 10

function buildDomainOptions(services: Service[]): string[] {
  const set = new Set<string>()
  for (const s of services) {
    const cat = String(s.category || '').trim()
    const svc = String(s.service || '').trim()
    if (cat) set.add(cat)
    if (svc) set.add(svc)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
}

function buildCityOptions(cities: City[]): string[] {
  const set = new Set<string>()
  for (const c of cities) {
    const name = String(c.city || '').trim()
    if (name) set.add(name)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
}

const autocompleteTextFieldSx = {
  '& .MuiInputBase-input': { textAlign: 'right', direction: 'rtl' as const },
}

function filterJobsForTab(all: Job[], tab: JobsTab): Job[] {
  if (tab === 'today') return all.filter((r) => isCreatedTodayJerusalem(r.created))
  if (tab === 'exceptions') {
    return all.filter((r) => {
      // כל פנייה עם החרגה ממתינה (לא מוגבל ל«שליחויות» — בפרפקטו התחום הוא לרוב שם מקצוע/שירות)
      const status = String(r.statusLabel || '').trim()
      return status !== 'לא נספר' && isPendingExclusion(r.exclusionReason)
    })
  }
  return all
}

export default function JobsPage() {
  const theme = useTheme()
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const tab = segmentToTab(segment)

  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Job | null>(null)
  const [exceptionsBusyJobId, setExceptionsBusyJobId] = useState<number | null>(null)
  const [broadcastDraft, setBroadcastDraft] = useState<{
    job: Job
    domain: string
    city: string
  } | null>(null)
  const [broadcastingId, setBroadcastingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [detailDeleting, setDetailDeleting] = useState(false)

  const [sort, setSort] = useState<{ col: JobsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'created',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [leaveDomain, setLeaveDomain] = useState('')
  const [leaveCity, setLeaveCity] = useState('')
  const [leavePhone, setLeavePhone] = useState('')
  const [leaveCustomerName, setLeaveCustomerName] = useState('')
  const [leaveDescription, setLeaveDescription] = useState('')
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)

  const [catalogServices, setCatalogServices] = useState<Service[]>([])
  const [catalogCities, setCatalogCities] = useState<City[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCatalogLoading(true)
      setCatalogError(null)
      try {
        const [svc, cty] = await Promise.all([getServices(), getCities()])
        if (cancelled) return
        setCatalogServices(Array.isArray(svc) ? svc : [])
        setCatalogCities(Array.isArray(cty) ? cty : [])
      } catch (err) {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : 'שגיאה בטעינת רשימות תחום/עיר',
          )
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const domainOptions = useMemo(
    () => buildDomainOptions(catalogServices),
    [catalogServices],
  )
  const cityOptions = useMemo(
    () => buildCityOptions(catalogCities),
    [catalogCities],
  )

  useEffect(() => {
    const s = String(segment || '').trim()
    if (s && !VALID_SEGMENTS.includes(s as JobsTab)) {
      navigate('/jobs/today', { replace: true })
    }
  }, [segment, navigate])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setLoading(true)
    setError(null)
    try {
      setAllJobs(await getJobs())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פניות')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const onApproveExclusion = useCallback(
    async (job: Job, e: MouseEvent) => {
      e.stopPropagation()
      setExceptionsBusyJobId(job.id)
      setError(null)
      try {
        await approveJobExclusion(job.id)
        await load({ silent: true })
        setDetail((d) => (d?.id === job.id ? null : d))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה באישור ההחרגה')
      } finally {
        setExceptionsBusyJobId(null)
      }
    },
    [load],
  )

  const onRejectExclusion = useCallback(
    async (job: Job, e: MouseEvent) => {
      e.stopPropagation()
      setExceptionsBusyJobId(job.id)
      setError(null)
      try {
        await rejectJobExclusion(job.id)
        await load({ silent: true })
        setDetail((d) => (d?.id === job.id ? null : d))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בדחיית ההחרגה')
      } finally {
        setExceptionsBusyJobId(null)
      }
    },
    [load],
  )

  const openBroadcastDialog = useCallback((job: Job) => {
    const parsed = parseDomainCityFromDescription(job.description)
    const domain = parsed?.domain || String(job.specialtiesCategory || '').trim()
    const city = parsed?.city || ''
    setBroadcastDraft({ job, domain, city })
  }, [])

  const submitBroadcast = useCallback(async () => {
    if (!broadcastDraft) return
    const { job, domain, city } = broadcastDraft
    const d = domain.trim()
    const c = city.trim()
    if (!d || !c) return
    setBroadcastingId(job.id)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await broadcastInquiryByDomainAndCity({
        domain: d,
        city: c,
        description: String(job.description || '').trim() || undefined,
      })
      setBroadcastDraft(null)
      await load({ silent: true })
      setSuccessMessage(
        res.createdJobs > 0
          ? `נוצרו ${res.createdJobs} פניות (${res.matchedAccounts} התאמות).`
          : 'לא נמצאו בעלי מקצוע תואמים לתחום ולעיר.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת הפניות')
    } finally {
      setBroadcastingId(null)
    }
  }, [broadcastDraft, load])

  const submitLeaveInquiry = useCallback(async () => {
    const d = leaveDomain.trim()
    const c = leaveCity.trim()
    if (!d || !c) return
    setLeaveSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await broadcastInquiryByDomainAndCity({
        domain: d,
        city: c,
        description: leaveDescription.trim() || undefined,
        phone: leavePhone.trim() || undefined,
        customerName: leaveCustomerName.trim() || undefined,
      })
      setSuccessMessage(
        res.createdJobs > 0
          ? `נוצרו ${res.createdJobs} פניות (${res.matchedAccounts} התאמות).`
          : 'לא נמצאו בעלי מקצוע תואמים לתחום ולעיר.',
      )
      void load({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הפניות')
    } finally {
      setLeaveSubmitting(false)
    }
  }, [
    leaveCity,
    leaveCustomerName,
    leaveDescription,
    leaveDomain,
    leavePhone,
    load,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const setTab = (next: JobsTab) => {
    const path = tabToPath(next)
    if (location.pathname !== path) navigate(path)
  }

  const tabRows = useMemo(() => filterJobsForTab(allJobs, tab), [allJobs, tab])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    return tabRows.filter((r) => {
      const blob = [
        r.accountName,
        r.phoneNumber,
        r.businessName,
        r.description,
        r.statusLabel,
        r.specialtiesCategory,
        r.exclusionReason,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const digits = q.replace(/\D/g, '')
      const phone = String(r.phoneNumber || '').replace(/\D/g, '')
      return blob.includes(q) || (digits.length > 0 && phone.includes(digits))
    })
  }, [query, tabRows])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const rows = [...filtered]
    const { col: sortColumn, dir: sortDir } = sort
    rows.sort((a, b) => {
      const va = jobSortValue(a, sortColumn)
      const vb = jobSortValue(b, sortColumn)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: JobsSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'created' ? 'desc' : 'asc' },
    )
  }, [])

  const counts = useMemo(() => {
    return {
      today: filterJobsForTab(allJobs, 'today').length,
      exceptions: filterJobsForTab(allJobs, 'exceptions').length,
      search: allJobs.length,
    }
  }, [allJobs])

  const removeDetailJob = async () => {
    if (!detail) return
    if (!window.confirm('האם אתה בטוח?')) return
    setDetailDeleting(true)
    setError(null)
    try {
      await deleteJob(detail.id)
      setDetail(null)
      await load({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת הפנייה')
    } finally {
      setDetailDeleting(false)
    }
  }

  return (
    <>
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
            sx={{ px: 2, pb: 2, pt: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <Stack spacing={0} sx={{ flex: 1, minHeight: 0, direction: 'rtl', textAlign: 'right' }}>
            <Box
              sx={{
                position: 'sticky',
                top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
                zIndex: (theme) => theme.zIndex.appBar - 1,
                bgcolor: 'background.paper',
                mx: -2,
                px: 2,
                py: 0,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  direction: 'rtl',
                  width: '100%',
                }}
              >
                <Tabs
                  value={tab}
                  onChange={(_e, v) => setTab(v as JobsTab)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  sx={{
                    flex: '1 1 auto',
                    minWidth: { xs: 'min(100%, 280px)', sm: 120 },
                    borderBottom: 'none',
                    minHeight: 48,
                    '& .MuiTabs-indicator': { height: 3 },
                  }}
                >
                  <Tab value="today" label={`פניות היום (${counts.today})`} />
                  <Tab value="exceptions" label={`החרגות (${counts.exceptions})`} />
                  <Tab value="search" label={`כל הפניות (${counts.search})`} />
                  <Tab value="leave" label="השארת פנייה" />
                </Tabs>

                {tab === 'leave' ? null : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexShrink: 0,
                      flexWrap: 'nowrap',
                    }}
                  >
                    <TextField
                      size="small"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="חיפוש"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                          endAdornment: query ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setQuery('')}
                                sx={{ p: 0.2 }}
                                aria-label="ניקוי חיפוש"
                              >
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        },
                      }}
                      sx={{
                        width: { xs: 160, sm: 190 },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 999,
                          backgroundColor: 'background.paper',
                          fontSize: 14,
                          '& fieldset': { borderColor: 'rgba(0,0,0,0.18)' },
                          '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.35)' },
                          '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                        },
                        '& .MuiInputBase-input': {
                          textAlign: 'right',
                          py: '7px',
                          direction: 'rtl',
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => void load()}
                      sx={{
                        backgroundColor: '#1565c0',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      רענון
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>

            {(successMessage || error) ? (
              <Stack sx={{ gap: `${GAP_BELOW_INNER_NAV_PX}px`, mt: `${GAP_BELOW_INNER_NAV_PX}px` }}>
                {successMessage ? (
                  <Alert severity="success" onClose={() => setSuccessMessage(null)}>
                    {successMessage}
                  </Alert>
                ) : null}
                {error ? <Alert severity="error">{error}</Alert> : null}
              </Stack>
            ) : null}

            {tab === 'leave' ? (
              <Stack spacing={2} sx={{ pt: `${GAP_BELOW_INNER_NAV_PX}px`, maxWidth: 560 }}>
                <Typography variant="body2" color="text.secondary">
                  מילוי תחום ועיר חובה. שאר השדות אופציונליים — יתווספו לתיאור הפנייה שנשלח לבעלי המקצוע
                  הרלוונטיים (אותו מנגנון כמו וובהוק יצירת פניות). אפשר לבחור מהרשימה או להקליד ערך חופשי.
                </Typography>
                {catalogLoading ? (
                  <Typography variant="caption" color="text.secondary">
                    טוען רשימות תחומים וערים מהמערכת…
                  </Typography>
                ) : null}
                {catalogError ? (
                  <Alert severity="warning" sx={{ py: 0.5 }}>
                    {catalogError} — ניתן עדיין להקליד תחום ועיר ידנית.
                  </Alert>
                ) : null}
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={domainOptions}
                  value={leaveDomain}
                  onChange={(_e, v) => setLeaveDomain(typeof v === 'string' ? v : '')}
                  inputValue={leaveDomain}
                  onInputChange={(_e, v) => setLeaveDomain(v)}
                  filterOptions={filterAutocompleteOptions}
                  slotProps={{ listbox: { style: { maxHeight: 280 } } }}
                  noOptionsText="אין התאמות — אפשר להמשיך להקליד"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="תחום"
                      required
                      size="small"
                      sx={autocompleteTextFieldSx}
                    />
                  )}
                />
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={cityOptions}
                  value={leaveCity}
                  onChange={(_e, v) => setLeaveCity(typeof v === 'string' ? v : '')}
                  inputValue={leaveCity}
                  onInputChange={(_e, v) => setLeaveCity(v)}
                  filterOptions={filterAutocompleteOptions}
                  slotProps={{ listbox: { style: { maxHeight: 280 } } }}
                  noOptionsText="אין התאמות — אפשר להמשיך להקליד"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="עיר"
                      required
                      size="small"
                      sx={autocompleteTextFieldSx}
                    />
                  )}
                />
                <TextField
                  label="טלפון לקוח"
                  type="tel"
                  fullWidth
                  size="small"
                  value={leavePhone}
                  onChange={(e) => setLeavePhone(e.target.value)}
                />
                <TextField
                  label="שם לקוח"
                  fullWidth
                  size="small"
                  value={leaveCustomerName}
                  onChange={(e) => setLeaveCustomerName(e.target.value)}
                />
                <TextField
                  label="תיאור / הערות"
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  value={leaveDescription}
                  onChange={(e) => setLeaveDescription(e.target.value)}
                />
                <Box>
                  <Button
                    variant="contained"
                    disabled={
                      leaveSubmitting ||
                      !leaveDomain.trim() ||
                      !leaveCity.trim()
                    }
                    onClick={() => void submitLeaveInquiry()}
                  >
                    {leaveSubmitting ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      'יצירה'
                    )}
                  </Button>
                </Box>
              </Stack>
            ) : loading ? (
              <Box
                sx={{
                  mt: `${GAP_BELOW_INNER_NAV_PX}px`,
                  py: 8,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
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
                        <TableCell sortDirection={sort.col === 'customerDisplay' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'customerDisplay'}
                            direction={sort.col === 'customerDisplay' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('customerDisplay')}
                          >
                            שם / עסק (לקוח)
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'phoneNumber' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'phoneNumber'}
                            direction={sort.col === 'phoneNumber' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('phoneNumber')}
                          >
                            טלפון
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'description' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'description'}
                            direction={sort.col === 'description' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('description')}
                          >
                            תוכן הפניה
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'accountName' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'accountName'}
                            direction={sort.col === 'accountName' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('accountName')}
                          >
                            בעל מקצוע
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'specialtiesCategory' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'specialtiesCategory'}
                            direction={sort.col === 'specialtiesCategory' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('specialtiesCategory')}
                          >
                            תחום
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'statusLabel' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'statusLabel'}
                            direction={sort.col === 'statusLabel' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('statusLabel')}
                          >
                            סטטוס
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'exclusionReason' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'exclusionReason'}
                            direction={sort.col === 'exclusionReason' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('exclusionReason')}
                          >
                            החרגות
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.col === 'created' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'created'}
                            direction={sort.col === 'created' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('created')}
                          >
                            נוצר
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, minWidth: 200 }}>
                          פעולה
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageRows.map((row) => (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setDetail(row)}
                        >
                          <TableCell title={row.businessName || row.accountName}>
                            {row.businessName || row.accountName}
                          </TableCell>
                          <TableCell>{formatCsPhoneDisplay(row.phoneNumber)}</TableCell>
                          <TableCell sx={{ maxWidth: 260 }} title={row.description}>
                            {row.description}
                          </TableCell>
                          <TableCell title={row.accountName}>{row.accountName}</TableCell>
                          <TableCell>{row.specialtiesCategory}</TableCell>
                          <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                            <Chip
                              size="small"
                              label={row.statusLabel || '—'}
                              sx={{
                                bgcolor: jobStatusChipColors(row.statusLabel).bg,
                                color: jobStatusChipColors(row.statusLabel).fg,
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 180 }} title={row.exclusionReason || ''}>
                            {row.exclusionReason || '—'}
                          </TableCell>
                          <TableCell>{row.created}</TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()} sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                            {tab === 'exceptions' ? (
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  disabled={exceptionsBusyJobId === row.id}
                                  onClick={(e) => void onApproveExclusion(row, e)}
                                >
                                  {exceptionsBusyJobId === row.id ? (
                                    <CircularProgress size={18} color="inherit" />
                                  ) : (
                                    'אישור'
                                  )}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  disabled={exceptionsBusyJobId === row.id}
                                  onClick={(e) => void onRejectExclusion(row, e)}
                                >
                                  לא מאשר
                                </Button>
                              </Stack>
                            ) : showBroadcastToAccountsButton(row, tab) ? (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={broadcastingId === row.id}
                                onClick={() => openBroadcastDialog(row)}
                              >
                                יצירת פניות
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={JOBS_TABLE_COL_SPAN} align="center" sx={{ py: 6 }}>
                            אין נתונים להצגה
                          </TableCell>
                        </TableRow>
                      ) : null}
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
          </Stack>
        </CardContent>
        </Card>
      </Box>

      <Dialog open={!!detail} onClose={() => !detailDeleting && setDetail(null)} maxWidth="md" fullWidth>
        <CsDialogTitleWithMenu
          heading={`פנייה #${detail?.id ?? ''}`}
          onClose={() => !detailDeleting && setDetail(null)}
          closeDisabled={detailDeleting}
          onRequestDelete={() => void removeDetailJob()}
          menuDisabled={detailDeleting}
        />
        <DialogContent dividers>
          {detail ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography><strong>לקוח:</strong> {detail.accountName}</Typography>
              <Typography><strong>טלפון:</strong> {formatCsPhoneDisplay(detail.phoneNumber)}</Typography>
              <Typography><strong>עסק:</strong> {detail.businessName}</Typography>
              <Typography><strong>תחום:</strong> {detail.specialtiesCategory}</Typography>
              {detail.leadDomain ? (
                <Typography variant="body2" color="text.secondary">
                  נשלח לרלוונטים (תחום לחיוב): {detail.leadDomain}
                </Typography>
              ) : null}
              <Typography><strong>סטטוס:</strong> {detail.statusLabel}</Typography>
              <Typography><strong>החרגות:</strong> {detail.exclusionReason || '—'}</Typography>
              <Typography><strong>תיאור:</strong> {detail.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                נוצר: {detail.created} · עודכן: {detail.updated}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!broadcastDraft}
        onClose={() => {
          if (broadcastingId != null) return
          setBroadcastDraft(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>יצירת פניות לרלוונטים</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              לפי התחום והעיר נוצרות פניות לכל בעלי המקצוע התואמים (אותו תהליך כמו הוובהוק). אפשר לערוך את
              הערכים לפני השליחה.
            </Typography>
            <Autocomplete
              fullWidth
              freeSolo
              options={domainOptions}
              value={broadcastDraft?.domain ?? ''}
              onChange={(_e, v) =>
                setBroadcastDraft((prev) =>
                  prev ? { ...prev, domain: typeof v === 'string' ? v : '' } : prev,
                )
              }
              inputValue={broadcastDraft?.domain ?? ''}
              onInputChange={(_e, v) =>
                setBroadcastDraft((prev) =>
                  prev ? { ...prev, domain: v } : prev,
                )
              }
              filterOptions={filterAutocompleteOptions}
              slotProps={{ listbox: { style: { maxHeight: 280 } } }}
              noOptionsText="אין התאמות — אפשר להמשיך להקליד"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="תחום"
                  size="small"
                  sx={autocompleteTextFieldSx}
                />
              )}
            />
            <Autocomplete
              fullWidth
              freeSolo
              options={cityOptions}
              value={broadcastDraft?.city ?? ''}
              onChange={(_e, v) =>
                setBroadcastDraft((prev) =>
                  prev ? { ...prev, city: typeof v === 'string' ? v : '' } : prev,
                )
              }
              inputValue={broadcastDraft?.city ?? ''}
              onInputChange={(_e, v) =>
                setBroadcastDraft((prev) =>
                  prev ? { ...prev, city: v } : prev,
                )
              }
              filterOptions={filterAutocompleteOptions}
              slotProps={{ listbox: { style: { maxHeight: 280 } } }}
              noOptionsText="אין התאמות — אפשר להמשיך להקליד"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="עיר"
                  size="small"
                  sx={autocompleteTextFieldSx}
                  helperText="אם התיאור בפורמט «תחום: …. עיר: ….» — השדות ימולאו אוטומטית"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBroadcastDraft(null)} disabled={broadcastingId != null}>
            ביטול
          </Button>
          <Button
            variant="contained"
            disabled={
              broadcastingId != null ||
              !String(broadcastDraft?.domain || '').trim() ||
              !String(broadcastDraft?.city || '').trim()
            }
            onClick={() => void submitBroadcast()}
          >
            {broadcastingId != null ? <CircularProgress size={22} color="inherit" /> : 'שליחה'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
