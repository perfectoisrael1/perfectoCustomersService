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
  formatCsDateTime,
  isCreatedTodayJerusalem,
  jobStatusChipColors,
} from '../lib/caliberUi'
import {
  approveJobExclusion,
  broadcastInquiryByDomainAndCity,
  deleteJob,
  deleteJobCampaign,
  getCities,
  getJobCampaigns,
  getJobs,
  getServices,
  rejectJobExclusion,
  type City,
  type Job,
  type JobCampaign,
  type Service,
} from '../api/csApi'
import CsDialogTitleWithMenu from '../components/CsDialogTitleWithMenu'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import {
  CsTableRowCheckboxCell,
  CsTableSelectAllHeaderCell,
  CsTableSelectionBar,
  CsTableSelectionDeleteButton,
  useCsTableSelection,
} from '../components/CsTableSelection'
import { deleteSelectedIds, prependSelectedNotInList } from '../lib/csTableListHelpers'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'

type JobsTab = 'today' | 'exceptions' | 'unassigned' | 'search' | 'leave' | 'campaigns'

type CampaignSortColumn =
  | 'id'
  | 'domain'
  | 'city'
  | 'customerName'
  | 'statusLabel'
  | 'dispatched'
  | 'nextDripAt'
  | 'claimedByAccountName'
  | 'created'

/** עמודות מיון לטבלת פניות (תואם עמודות תצוגה) */
type JobsSortColumn =
  | 'id'
  | 'customerDisplay'
  | 'phoneNumber'
  | 'description'
  | 'accountName'
  | 'specialtiesCategory'
  | 'city'
  | 'statusLabel'
  | 'exclusionReason'
  | 'created'

function isUnassignedJob(row: Job): boolean {
  return row.accountId == null
}

function jobCustomerDisplay(row: Job): string {
  return String(row.businessName || row.accountName || row.customerName || '').trim()
}

function jobProDisplay(row: Job): string {
  if (isUnassignedJob(row)) return 'לא משויך'
  return String(row.accountName || '').trim()
}

function jobDomainDisplay(row: Job): string {
  return String(row.leadDomain || row.specialtiesCategory || '').trim()
}

function jobCityDisplay(row: Job): string {
  return String(row.city || '').trim()
}

function jobSortValue(row: Job, col: JobsSortColumn): string {
  if (col === 'id') {
    return String(row.id ?? '')
  }
  if (col === 'customerDisplay') {
    return jobCustomerDisplay(row)
  }
  if (col === 'accountName') {
    return jobProDisplay(row)
  }
  if (col === 'specialtiesCategory') {
    return jobDomainDisplay(row)
  }
  if (col === 'city') {
    return jobCityDisplay(row)
  }
  return String(row[col] ?? '').trim()
}

const VALID_SEGMENTS: JobsTab[] = [
  'today',
  'exceptions',
  'unassigned',
  'search',
  'leave',
  'campaigns',
]

const CAMPAIGN_STATUS_CHIP: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'info',
  claimed: 'success',
  exhausted: 'warning',
  unassigned: 'default',
}

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
  if (tab === 'unassigned') {
    return Boolean(
      String(job.leadDomain || '').trim() ||
        parseDomainCityFromDescription(job.description),
    )
  }
  if (tab !== 'today' && tab !== 'search') return false
  return !String(job.leadDomain || '').trim()
}

function formatBroadcastSuccessMessage(res: {
  matchedAccounts: number
  createdJobs: number
}): string {
  if (res.createdJobs <= 0) {
    return 'לא נוצרו פניות.'
  }
  if (res.matchedAccounts <= 0) {
    return 'נוצרה פנייה ללא ספק (אין התאמות). ניתן לראות אותה בטאב «פניות ללא ספקים».'
  }
  return `נוצרו ${res.createdJobs} פניות (${res.matchedAccounts} התאמות).`
}

const filterAutocompleteOptions = createFilterOptions<string>({
  limit: 80,
  ignoreCase: true,
  stringify: (option) => option,
})

/** מספר עמודות בטבלת פניות (כולל צ'קבוקס + «פעולה») — ל־colSpan בשורת «אין נתונים» */
const JOBS_TABLE_COL_SPAN = 13

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

function catalogLookupKey(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildCatalogLookupSet(options: string[]): Set<string> {
  return new Set(options.map(catalogLookupKey).filter(Boolean))
}

/** בטאב ללא ספקים: תחום/עיר שלא קיימים בקטלוג — הדגשת השורה */
function isUnassignedCatalogMismatch(
  row: Job,
  domainSet: Set<string>,
  citySet: Set<string>,
): boolean {
  // בלי קטלוג טעון — לא מסמנים (נמנעים מסימון שווא)
  if (domainSet.size === 0 && citySet.size === 0) return false
  const domain = jobDomainDisplay(row)
  const city = jobCityDisplay(row)
  const domainKnown = Boolean(domain) && domainSet.has(catalogLookupKey(domain))
  const cityKnown = Boolean(city) && citySet.has(catalogLookupKey(city))
  return !domainKnown || !cityKnown
}

/** אדום בהיר — חייב !important מול `& tbody tr { background }` ב־csDataTableSx */
const UNASSIGNED_CATALOG_MISMATCH_ROW_SX = {
  bgcolor: 'rgba(244, 67, 54, 0.14) !important',
  '&:hover': {
    bgcolor: 'rgba(244, 67, 54, 0.22) !important',
  },
  '&.Mui-selected, &.Mui-selected:hover': {
    bgcolor: 'rgba(244, 67, 54, 0.22) !important',
  },
} as const

const autocompleteTextFieldSx = {
  '& .MuiInputBase-input': { textAlign: 'right', direction: 'rtl' as const },
}

function filterJobsForTab(all: Job[], tab: JobsTab): Job[] {
  if (tab === 'campaigns') return []
  if (tab === 'today') return all.filter((r) => isCreatedTodayJerusalem(r.created))
  if (tab === 'exceptions') {
    return all.filter((r) => {
      // כל פנייה עם החרגה ממתינה (לא מוגבל ל«שליחויות» — בפרפקטו התחום הוא לרוב שם מקצוע/שירות)
      const status = String(r.statusLabel || '').trim()
      return status !== 'לא נספר' && isPendingExclusion(r.exclusionReason)
    })
  }
  if (tab === 'unassigned') return all.filter(isUnassignedJob)
  return all
}

export default function JobsPage() {
  const theme = useTheme()
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const tab = segmentToTab(segment)

  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [allCampaigns, setAllCampaigns] = useState<JobCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
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
  const [campaignSort, setCampaignSort] = useState<{
    col: CampaignSortColumn
    dir: 'asc' | 'desc'
  }>({
    col: 'created',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const rowSelection = useCsTableSelection()
  const campaignRowSelection = useCsTableSelection()

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
  const domainCatalogSet = useMemo(
    () => buildCatalogLookupSet(domainOptions),
    [domainOptions],
  )
  const cityCatalogSet = useMemo(
    () => buildCatalogLookupSet(cityOptions),
    [cityOptions],
  )

  useEffect(() => {
    const s = String(segment || '').trim()
    if (s && !VALID_SEGMENTS.includes(s as JobsTab)) {
      navigate('/jobs/today', { replace: true })
    }
  }, [segment, navigate])

  const loadCampaigns = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setCampaignsLoading(true)
    setError(null)
    try {
      setAllCampaigns(await getJobCampaigns())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת קמפיינים')
    } finally {
      if (!silent) setCampaignsLoading(false)
    }
  }, [])

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
    const domain =
      String(job.leadDomain || '').trim() ||
      parsed?.domain ||
      String(job.specialtiesCategory || '').trim()
    const city = String(job.city || '').trim() || parsed?.city || ''
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
        phone: String(job.customerPhone || job.phoneNumber || '').trim() || undefined,
        customerName: String(job.customerName || '').trim() || undefined,
      })
      setBroadcastDraft(null)
      await load({ silent: true })
      setSuccessMessage(formatBroadcastSuccessMessage(res))
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
      setSuccessMessage(formatBroadcastSuccessMessage(res))
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
    void loadCampaigns({ silent: true })
    if (tab === 'campaigns') {
      rowSelection.clearSelection()
      void loadCampaigns()
      return
    }
    campaignRowSelection.clearSelection()
    if (tab !== 'leave') {
      void load()
    }
  }, [tab, load, loadCampaigns])

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
        r.id,
        r.accountName,
        r.customerName,
        r.customerPhone,
        r.phoneNumber,
        r.businessName,
        r.description,
        r.statusLabel,
        r.specialtiesCategory,
        r.leadDomain,
        r.city,
        r.exclusionReason,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const digits = q.replace(/\D/g, '')
      const phone = String(r.phoneNumber || r.customerPhone || '').replace(/\D/g, '')
      return blob.includes(q) || (digits.length > 0 && phone.includes(digits))
    })
  }, [query, tabRows])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir, campaignSort.col, campaignSort.dir])

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

  const displayRows = useMemo(
    () => prependSelectedNotInList(sortedRows, allJobs, rowSelection.selectedIds, (r) => r.id),
    [sortedRows, allJobs, rowSelection.selectedIds],
  )

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return displayRows.slice(start, start + rowsPerPage)
  }, [displayRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: JobsSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'created' || col === 'id' ? 'desc' : 'asc' },
    )
  }, [])

  const counts = useMemo(() => {
    return {
      today: filterJobsForTab(allJobs, 'today').length,
      exceptions: filterJobsForTab(allJobs, 'exceptions').length,
      unassigned: filterJobsForTab(allJobs, 'unassigned').length,
      search: allJobs.length,
      campaigns: allCampaigns.length,
    }
  }, [allJobs, allCampaigns])

  const filteredCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCampaigns
    return allCampaigns.filter((c) => {
      const blob = [
        c.id,
        c.domain,
        c.city,
        c.customerName,
        c.customerPhone,
        c.description,
        c.statusLabel,
        c.claimedByAccountName,
        c.claimedJobId,
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ')
      const digits = q.replace(/\D/g, '')
      const phone = String(c.customerPhone || '').replace(/\D/g, '')
      return blob.includes(q) || (digits.length > 0 && phone.includes(digits))
    })
  }, [allCampaigns, query])

  const sortedCampaigns = useMemo(() => {
    const rows = [...filteredCampaigns]
    const { col, dir } = campaignSort
    rows.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (col === 'dispatched') {
        av = a.dispatchedCount
        bv = b.dispatchedCount
      } else if (col === 'id') {
        av = a.id
        bv = b.id
      } else {
        av = String(a[col] ?? '').trim()
        bv = String(b[col] ?? '').trim()
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return dir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv), 'he')
      return dir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [filteredCampaigns, campaignSort])

  const campaignDisplayRows = useMemo(
    () =>
      prependSelectedNotInList(
        sortedCampaigns,
        allCampaigns,
        campaignRowSelection.selectedIds,
        (r) => r.id,
      ),
    [sortedCampaigns, allCampaigns, campaignRowSelection.selectedIds],
  )

  const campaignPageRows = useMemo(() => {
    const start = page * rowsPerPage
    return campaignDisplayRows.slice(start, start + rowsPerPage)
  }, [campaignDisplayRows, page, rowsPerPage])

  const onSortCampaignColumn = useCallback((col: CampaignSortColumn) => {
    setCampaignSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'created' || col === 'dispatched' ? 'desc' : 'asc' },
    )
  }, [])

  const bulkDeleteCampaigns = useCallback(async () => {
    setError(null)
    const ids = campaignRowSelection.selectedIds
    try {
      for (const rawId of Array.from(ids)) {
        const id = String(rawId ?? '').trim()
        if (id) await deleteJobCampaign(id)
      }
      campaignRowSelection.clearSelection()
      await Promise.all([loadCampaigns({ silent: true }), load({ silent: true })])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת קמפיינים')
      throw err
    }
  }, [load, loadCampaigns, campaignRowSelection])

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

  const bulkDeleteSelected = useCallback(async () => {
    setError(null)
    const ids = rowSelection.selectedIds
    try {
      await deleteSelectedIds(ids, deleteJob)
      setDetail((d) => (d && ids.has(d.id) ? null : d))
      rowSelection.clearSelection()
      await load({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת פניות')
      throw err
    }
  }, [load, rowSelection])

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
                  <Tab value="unassigned" label={`פניות ללא ספקים (${counts.unassigned})`} />
                  <Tab value="search" label={`כל הפניות (${counts.search})`} />
                  <Tab value="leave" label="השארת פנייה" />
                  <Tab value="campaigns" label={`קמפיינים (${counts.campaigns})`} />
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
                      onClick={() =>
                        void (tab === 'campaigns' ? loadCampaigns() : load())
                      }
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
            ) : tab === 'campaigns' ? (
              campaignsLoading ? (
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
                            <CsTableSelectAllHeaderCell
                              pageRows={campaignPageRows}
                              selectedIds={campaignRowSelection.selectedIds}
                              onTogglePage={() =>
                                campaignRowSelection.toggleAllOnPage(campaignPageRows)
                              }
                            />
                            <TableCell sortDirection={campaignSort.col === 'id' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'id'}
                                direction={campaignSort.col === 'id' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('id')}
                              >
                                מזהה
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={campaignSort.col === 'domain' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'domain'}
                                direction={campaignSort.col === 'domain' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('domain')}
                              >
                                תחום
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={campaignSort.col === 'city' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'city'}
                                direction={campaignSort.col === 'city' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('city')}
                              >
                                עיר
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={campaignSort.col === 'customerName' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'customerName'}
                                direction={campaignSort.col === 'customerName' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('customerName')}
                              >
                                לקוח
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>טלפון</TableCell>
                            <TableCell sortDirection={campaignSort.col === 'statusLabel' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'statusLabel'}
                                direction={campaignSort.col === 'statusLabel' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('statusLabel')}
                              >
                                סטטוס
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={campaignSort.col === 'dispatched' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'dispatched'}
                                direction={campaignSort.col === 'dispatched' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('dispatched')}
                              >
                                נשלחו
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={campaignSort.col === 'nextDripAt' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'nextDripAt'}
                                direction={campaignSort.col === 'nextDripAt' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('nextDripAt')}
                              >
                                drip הבא
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={campaignSort.col === 'claimedByAccountName' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'claimedByAccountName'}
                                direction={campaignSort.col === 'claimedByAccountName' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('claimedByAccountName')}
                              >
                                נלקח על ידי
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>פנייה #</TableCell>
                            <TableCell sortDirection={campaignSort.col === 'created' ? campaignSort.dir : false}>
                              <TableSortLabel
                                active={campaignSort.col === 'created'}
                                direction={campaignSort.col === 'created' ? campaignSort.dir : 'asc'}
                                onClick={() => onSortCampaignColumn('created')}
                              >
                                נוצר
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {campaignPageRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                  אין קמפיינים להצגה
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            campaignPageRows.map((c) => (
                              <TableRow key={c.id} hover selected={campaignRowSelection.isSelected(c.id)}>
                                <CsTableRowCheckboxCell
                                  rowId={c.id}
                                  selected={campaignRowSelection.isSelected(c.id)}
                                  onToggle={campaignRowSelection.toggleRow}
                                />
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                  {c.id.slice(0, 8)}…
                                </TableCell>
                                <TableCell>{c.domain || '—'}</TableCell>
                                <TableCell>{c.city || '—'}</TableCell>
                                <TableCell>{c.customerName || '—'}</TableCell>
                                <TableCell dir="ltr" sx={{ textAlign: 'right' }}>
                                  {formatCsPhoneDisplay(c.customerPhone) || '—'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={c.statusLabel}
                                    color={CAMPAIGN_STATUS_CHIP[c.status] ?? 'default'}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  {c.dispatchedCount}/{c.candidateCount}
                                </TableCell>
                                <TableCell>{formatCsDateTime(c.nextDripAt)}</TableCell>
                                <TableCell>{c.claimedByAccountName || '—'}</TableCell>
                                <TableCell>{c.claimedJobId ?? '—'}</TableCell>
                                <TableCell>{formatCsDateTime(c.created)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CsTableContainer>
                    <CsTablePaginationFooter
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      count={campaignDisplayRows.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={(_e, next) => setPage(next)}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(Number.parseInt(e.target.value, 10))
                        setPage(0)
                      }}
                    />
                  </Box>
                </Box>
              )
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
                        <CsTableSelectAllHeaderCell
                          pageRows={pageRows}
                          selectedIds={rowSelection.selectedIds}
                          onTogglePage={() => rowSelection.toggleAllOnPage(pageRows)}
                        />
                        <TableCell sortDirection={sort.col === 'id' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'id'}
                            direction={sort.col === 'id' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('id')}
                          >
                            מספר הפניה
                          </TableSortLabel>
                        </TableCell>
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
                        <TableCell sortDirection={sort.col === 'city' ? sort.dir : false}>
                          <TableSortLabel
                            active={sort.col === 'city'}
                            direction={sort.col === 'city' ? sort.dir : 'asc'}
                            onClick={() => onSortColumn('city')}
                          >
                            עיר
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
                      {pageRows.map((row) => {
                        const highlightUnassignedMismatch =
                          tab === 'unassigned' &&
                          !catalogLoading &&
                          isUnassignedCatalogMismatch(row, domainCatalogSet, cityCatalogSet)
                        return (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{
                            cursor: 'pointer',
                            ...(highlightUnassignedMismatch
                              ? UNASSIGNED_CATALOG_MISMATCH_ROW_SX
                              : null),
                          }}
                          onClick={() => setDetail(row)}
                        >
                          <CsTableRowCheckboxCell
                            rowId={row.id}
                            selected={rowSelection.isSelected(row.id)}
                            onToggle={rowSelection.toggleRow}
                          />
                          <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.id}</TableCell>
                          <TableCell title={jobCustomerDisplay(row)}>
                            {jobCustomerDisplay(row) || '—'}
                          </TableCell>
                          <TableCell>
                            {formatCsPhoneDisplay(
                              row.customerPhone || row.phoneNumber,
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 260 }} title={row.description}>
                            {row.description}
                          </TableCell>
                          <TableCell title={jobProDisplay(row)}>
                            {jobProDisplay(row) || '—'}
                          </TableCell>
                          <TableCell>
                            {jobDomainDisplay(row) || '—'}
                          </TableCell>
                          <TableCell>{jobCityDisplay(row) || '—'}</TableCell>
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
                          <TableCell>{formatCsDateTime(row.created)}</TableCell>
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openBroadcastDialog(row)
                                }}
                              >
                                {tab === 'unassigned' ? 'שידור לרלוונטים' : 'יצירת פניות'}
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        )
                      })}
                      {displayRows.length === 0 ? (
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
                  count={displayRows.length}
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
              <Typography>
                <strong>לקוח:</strong>{' '}
                {detail.customerName || detail.accountName || '—'}
              </Typography>
              <Typography>
                <strong>טלפון:</strong>{' '}
                {formatCsPhoneDisplay(detail.customerPhone || detail.phoneNumber)}
              </Typography>
              <Typography>
                <strong>בעל מקצוע:</strong> {jobProDisplay(detail)}
              </Typography>
              <Typography>
                <strong>עסק:</strong> {detail.businessName || '—'}
              </Typography>
              <Typography>
                <strong>תחום:</strong>{' '}
                {detail.leadDomain || detail.specialtiesCategory || '—'}
              </Typography>
              <Typography>
                <strong>עיר:</strong> {detail.city || '—'}
              </Typography>
              {detail.leadDomain ? (
                <Typography variant="body2" color="text.secondary">
                  נשלח לרלוונטים (תחום לחיוב): {detail.leadDomain}
                </Typography>
              ) : null}
              <Typography><strong>סטטוס:</strong> {detail.statusLabel}</Typography>
              <Typography><strong>החרגות:</strong> {detail.exclusionReason || '—'}</Typography>
              <Typography><strong>תיאור:</strong> {detail.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                נוצר: {formatCsDateTime(detail.created)} · עודכן: {formatCsDateTime(detail.updated)}
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

      <CsTableSelectionBar
        open={tab === 'campaigns' ? campaignRowSelection.selectedCount > 0 : rowSelection.selectedCount > 0}
        selectedCount={
          tab === 'campaigns' ? campaignRowSelection.selectedCount : rowSelection.selectedCount
        }
        onClear={
          tab === 'campaigns' ? campaignRowSelection.clearSelection : rowSelection.clearSelection
        }
      >
        {tab === 'campaigns' ? (
          <CsTableSelectionDeleteButton
            selectedCount={campaignRowSelection.selectedCount}
            entityLabel="קמפיינים"
            onDelete={bulkDeleteCampaigns}
          />
        ) : (
          <CsTableSelectionDeleteButton
            selectedCount={rowSelection.selectedCount}
            entityLabel="פניות"
            onDelete={bulkDeleteSelected}
          />
        )}
      </CsTableSelectionBar>
    </>
  )
}
