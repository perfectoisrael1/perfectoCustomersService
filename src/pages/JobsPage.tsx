import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
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
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  formatCsPhoneDisplay,
  isCreatedTodayJerusalem,
  jobStatusChipColors,
} from '../lib/caliberUi'
import {
  approveJobExclusion,
  broadcastInquiryByDomainAndCity,
  getJobs,
  type Job,
} from '../api/csApi'

type JobsTab = 'today' | 'exceptions' | 'search'

const VALID_SEGMENTS: JobsTab[] = ['today', 'exceptions', 'search']

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
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const tab = segmentToTab(segment)

  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Job | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [broadcastDraft, setBroadcastDraft] = useState<{
    job: Job
    domain: string
    city: string
  } | null>(null)
  const [broadcastingId, setBroadcastingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
      setApprovingId(job.id)
      setError(null)
      try {
        await approveJobExclusion(job.id)
        await load({ silent: true })
        setDetail((d) => (d?.id === job.id ? null : d))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה באישור ההחרגה')
      } finally {
        setApprovingId(null)
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

  const counts = useMemo(() => {
    return {
      today: filterJobsForTab(allJobs, 'today').length,
      exceptions: filterJobsForTab(allJobs, 'exceptions').length,
      search: allJobs.length,
    }
  }, [allJobs])

  return (
    <>
      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              פניות
            </Typography>

            <Tabs
              value={tab}
              onChange={(_e, v) => setTab(v as JobsTab)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab value="today" label={`פניות היום (${counts.today})`} />
              <Tab value="exceptions" label={`החרגות (${counts.exceptions})`} />
              <Tab value="search" label={`כל הפניות (${counts.search})`} />
            </Tabs>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <TextField
                size="small"
                placeholder="חיפוש לפי לקוח, טלפון, תוכן, סטטוס…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 200 }}
              />
              <Button variant="contained" onClick={() => void load()}>
                רענון
              </Button>
            </Stack>

            {successMessage ? (
              <Alert severity="success" onClose={() => setSuccessMessage(null)}>
                {successMessage}
              </Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  מוצגות {filtered.length} רשומות
                  {query.trim() ? ` מתוך ${tabRows.length} בטאב` : ''}
                </Typography>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>שם / עסק (לקוח)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>טלפון</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>תוכן הפניה</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>בעל מקצוע</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>תחום</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>סטטוס</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>החרגות</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>נוצר</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, minWidth: 130 }}>
                          פעולה
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setDetail(row)}
                        >
                          <TableCell>{row.businessName || row.accountName}</TableCell>
                          <TableCell>{formatCsPhoneDisplay(row.phoneNumber)}</TableCell>
                          <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.description}
                          </TableCell>
                          <TableCell>{row.accountName}</TableCell>
                          <TableCell>{row.specialtiesCategory}</TableCell>
                          <TableCell>
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
                          <TableCell sx={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.exclusionReason || '—'}
                          </TableCell>
                          <TableCell>{row.created}</TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            {tab === 'exceptions' ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                disabled={approvingId === row.id}
                                onClick={(e) => void onApproveExclusion(row, e)}
                              >
                                {approvingId === row.id ? <CircularProgress size={18} color="inherit" /> : 'אישור'}
                              </Button>
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
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                            אין נתונים להצגה
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          פנייה #{detail?.id}
          <IconButton onClick={() => setDetail(null)} aria-label="סגור">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
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
            <TextField
              label="תחום"
              fullWidth
              size="small"
              value={broadcastDraft?.domain ?? ''}
              onChange={(e) =>
                setBroadcastDraft((prev) =>
                  prev ? { ...prev, domain: e.target.value } : prev,
                )
              }
            />
            <TextField
              label="עיר"
              fullWidth
              size="small"
              value={broadcastDraft?.city ?? ''}
              onChange={(e) =>
                setBroadcastDraft((prev) =>
                  prev ? { ...prev, city: e.target.value } : prev,
                )
              }
              helperText="אם התיאור בפורמט «תחום: …. עיר: ….» — השדות ימולאו אוטומטית"
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
