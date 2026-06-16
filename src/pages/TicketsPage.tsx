import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  InputAdornment,
  MenuItem,
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
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import {
  CS_STATUS_OPTIONS,
  DEFAULT_TICKET_RESPONSIBLE,
  buildTicketIssueTypeFormOptions,
  isInvoiceIssueType,
  loadCustomTicketIssueTypes,
  saveCustomTicketIssueTypes,
  formatCsPhoneDisplay,
  issueTypeChipColors,
  isFollowUpTodayOrBefore,
  ticketStatusChipColors,
  TICKET_STATUS_DONE,
  TICKET_STATUS_NO_ANSWER_3,
  TICKET_STATUS_NOT_RELEVANT,
} from '../lib/caliberUi'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import CsDialogTitleWithMenu from '../components/CsDialogTitleWithMenu'
import { useAuth } from '../context/useAuth'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'
import {
  createTicket,
  deleteTicket,
  getPerfectoCustomerServiceUsers,
  getTickets,
  patchTicket,
  type PerfectoCustomerServiceUser,
  type Ticket,
  type TicketInput,
} from '../api/csApi'

type CsTab = 'myTasks' | 'all'

type TicketsSortColumn =
  | 'name'
  | 'phoneNumber'
  | 'issueType'
  | 'status'
  | 'responsible'
  | 'followUpDate'
  | 'details'

function ticketSortValue(row: Ticket, col: TicketsSortColumn): string {
  switch (col) {
    case 'name':
      return String(row.name ?? '')
    case 'phoneNumber':
      return String(row.phoneNumber ?? '')
    case 'issueType':
      return String(row.issueType ?? '')
    case 'status':
      return String(row.status ?? '')
    case 'responsible':
      return String(row.responsible ?? '')
    case 'followUpDate':
      return row.followUpDate ? String(row.followUpDate).slice(0, 19) : ''
    case 'details':
      return String(row.details ?? '')
    default:
      return ''
  }
}

const VALID_TICKET_TABS = new Set<CsTab>(['myTasks', 'all'])

function ticketOpenForMyTasks(r: Ticket): boolean {
  const status = String(r.status || '').trim()
  if (
    !status
    || status === 'status'
    || status === TICKET_STATUS_DONE
    || status === TICKET_STATUS_NOT_RELEVANT
    || status === TICKET_STATUS_NO_ANSWER_3
  ) {
    return false
  }
  const issue = String(r.issueType || '').trim()
  if (isInvoiceIssueType(issue)) return false
  return isFollowUpTodayOrBefore(r.followUpDate ? String(r.followUpDate) : null)
}

function userDisplayName(user: PerfectoCustomerServiceUser): string {
  return String(user.fullName || user.username || '').trim()
}

export default function TicketsPage() {
  const theme = useTheme()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = useMemo(() => {
    const t = searchParams.get('tab')
    if (t && VALID_TICKET_TABS.has(t as CsTab)) return t as CsTab
    return 'myTasks'
  }, [searchParams])

  const setTicketTab = (next: CsTab) => {
    if (next === 'myTasks') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: next }, { replace: true })
  }

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && !VALID_TICKET_TABS.has(t as CsTab)) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const [rows, setRows] = useState<Ticket[]>([])
  const [systemUsers, setSystemUsers] = useState<PerfectoCustomerServiceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Ticket | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TicketInput>({})
  const [customIssueTypes, setCustomIssueTypes] = useState<string[]>(() => loadCustomTicketIssueTypes())
  const [addIssueTypeDialogOpen, setAddIssueTypeDialogOpen] = useState(false)
  const [newIssueTypeName, setNewIssueTypeName] = useState('')

  const issueTypeOptions = useMemo(
    () =>
      buildTicketIssueTypeFormOptions(
        customIssueTypes,
        rows.map((r) => String(r.issueType || '')),
        form.issueType,
      ),
    [customIssueTypes, rows, form.issueType],
  )

  const [sort, setSort] = useState<{ col: TicketsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'followUpDate',
    dir: 'asc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const t = await getTickets()
      setRows(Array.isArray(t) ? t : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const data = await getPerfectoCustomerServiceUsers()
        setSystemUsers(Array.isArray(data) ? data : [])
      } catch {
        setSystemUsers([])
      }
    })()
  }, [])

  const responsibleOptions = useMemo(() => {
    const names = new Set<string>()
    for (const u of systemUsers) {
      const name = userDisplayName(u)
      if (name) names.add(name)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'he'))
  }, [systemUsers])

  const pickResponsible = useCallback(
    (preferred?: string | null) => {
      const pref = String(preferred || '').trim()
      if (pref && responsibleOptions.includes(pref)) return pref
      if (responsibleOptions.includes(DEFAULT_TICKET_RESPONSIBLE)) {
        return DEFAULT_TICKET_RESPONSIBLE
      }
      const me = user
        ? userDisplayName({
            id: user.id ?? 0,
            fullName: user.fullName,
            username: user.username,
          })
        : ''
      if (me && responsibleOptions.includes(me)) return me
      return responsibleOptions[0] || ''
    },
    [responsibleOptions, user],
  )

  const baseRows = useMemo(() => {
    if (tab === 'myTasks') return rows.filter(ticketOpenForMyTasks)
    return rows
  }, [rows, tab])

  const filteredTickets = useMemo(() => {
    const list = baseRows
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const blob = [r.name, r.phoneNumber, r.issueType, r.status, r.responsible, r.details]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const qd = q.replace(/\D/g, '')
      const phone = String(r.phoneNumber || '').replace(/\D/g, '')
      return blob.includes(q) || (qd.length > 0 && phone.includes(qd))
    })
  }, [baseRows, query])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const list = [...filteredTickets]
    const { col: sortColumn, dir: sortDir } = sort
    list.sort((a, b) => {
      const va = ticketSortValue(a, sortColumn)
      const vb = ticketSortValue(b, sortColumn)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredTickets, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: TicketsSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    )
  }, [])

  const counts = useMemo(
    () => ({
      myTasks: rows.filter(ticketOpenForMyTasks).length,
      all: rows.length,
    }),
    [rows],
  )

  const openNew = () => {
    setForm({
      name: '',
      phoneNumber: '',
      issueType: '',
      details: '',
      status: 'חדשה',
      responsible: pickResponsible(),
      followUpDate: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setEditor('new')
  }

  const openEdit = (row: Ticket) => {
    setForm({
      name: row.name,
      phoneNumber: row.phoneNumber,
      issueType: row.issueType,
      details: row.details,
      status: row.status,
      responsible: pickResponsible(row.responsible),
      followUpDate: row.followUpDate ? String(row.followUpDate).slice(0, 10) : null,
      notes: row.notes,
    })
    setEditor(row)
  }

  const openAddIssueTypeDialog = () => {
    setNewIssueTypeName('')
    setAddIssueTypeDialogOpen(true)
  }

  const closeAddIssueTypeDialog = () => {
    setAddIssueTypeDialogOpen(false)
    setNewIssueTypeName('')
  }

  const confirmAddIssueType = () => {
    const trimmed = newIssueTypeName.replace(/\s+/g, ' ').trim()
    if (!trimmed) return
    setCustomIssueTypes((prev) => {
      const next = prev.includes(trimmed) ? prev : [...prev, trimmed]
      saveCustomTicketIssueTypes(next)
      return next
    })
    setForm((f) => ({ ...f, issueType: trimmed }))
    closeAddIssueTypeDialog()
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editor === 'new') await createTicket(form)
      else if (editor) await patchTicket(editor.id, form)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (editor == null || editor === 'new') return
    if (!window.confirm('האם אתה בטוח?')) return
    setSaving(true)
    try {
      await deleteTicket(editor.id)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    } finally {
      setSaving(false)
    }
  }

  const colSpan = 7

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
                  zIndex: (t) => t.zIndex.appBar - 1,
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
                    onChange={(_e, v) => setTicketTab(v as CsTab)}
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
                    <Tab value="myTasks" label={`המשימות שלי (${counts.myTasks})`} />
                    <Tab value="all" label={`כל הקריאות (${counts.all})`} />
                  </Tabs>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexShrink: 0,
                      flexWrap: 'nowrap',
                    }}
                  >
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ whiteSpace: 'nowrap' }}>
                      קריאה חדשה
                    </Button>
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
                  </Box>
                </Box>
              </Box>

              {error ? (
                <Stack sx={{ gap: `${GAP_BELOW_INNER_NAV_PX}px`, mt: `${GAP_BELOW_INNER_NAV_PX}px` }}>
                  <Alert severity="error">{error}</Alert>
                </Stack>
              ) : null}

              {loading ? (
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
                          <TableCell sortDirection={sort.col === 'name' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'name'}
                              direction={sort.col === 'name' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('name')}
                            >
                              שם
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
                          <TableCell sortDirection={sort.col === 'issueType' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'issueType'}
                              direction={sort.col === 'issueType' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('issueType')}
                            >
                              סוג הבעיה
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'status' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'status'}
                              direction={sort.col === 'status' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('status')}
                            >
                              סטטוס
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'responsible' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'responsible'}
                              direction={sort.col === 'responsible' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('responsible')}
                            >
                              אחראי
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center" sortDirection={sort.col === 'followUpDate' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'followUpDate'}
                              direction={sort.col === 'followUpDate' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('followUpDate')}
                            >
                              פולואפ
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'details' ? sort.dir : false}>
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
                        {pageRows.map((row) => {
                          const ic = issueTypeChipColors(row.issueType)
                          const sc = ticketStatusChipColors(row.status)
                          return (
                            <TableRow
                              key={row.id}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => openEdit(row)}
                            >
                              <TableCell title={row.name || ''}>{row.name || '—'}</TableCell>
                              <TableCell>{formatCsPhoneDisplay(row.phoneNumber)}</TableCell>
                              <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                                <Chip
                                  size="small"
                                  label={row.issueType || '—'}
                                  sx={{ bgcolor: ic.bg, color: ic.fg, fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                                <Chip
                                  size="small"
                                  label={row.status || '—'}
                                  sx={{ bgcolor: sc.bg, color: sc.fg, fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell>{row.responsible || '—'}</TableCell>
                              <TableCell align="center">
                                {row.followUpDate ? String(row.followUpDate).slice(0, 10) : '—'}
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.details || ''}>
                                {row.details || '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {sortedRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
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

      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} maxWidth="md" fullWidth>
        <CsDialogTitleWithMenu
          heading={editor === 'new' ? 'קריאה חדשה' : `קריאה #${(editor as Ticket)?.id}`}
          onClose={() => !saving && setEditor(null)}
          closeDisabled={saving}
          onRequestDelete={editor && editor !== 'new' ? () => void remove() : undefined}
          menuDisabled={saving}
        />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Stack direction="row" spacing={2} sx={{ width: '100%', direction: 'rtl' }}>
            <TextField
              label="שם"
              value={form.name || ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
            />
            <TextField
              label="טלפון"
              value={form.phoneNumber || ''}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
            />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ width: '100%', direction: 'rtl', alignItems: 'center' }}>
            <TextField
              select
              label="סוג הבעיה"
              value={form.issueType || ''}
              onChange={(e) => setForm((f) => ({ ...f, issueType: e.target.value }))}
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
            >
              {issueTypeOptions.map((label) => (
                <MenuItem key={label} value={label}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <IconButton
              onClick={openAddIssueTypeDialog}
              aria-label="הוספת סוג בעיה"
              sx={{
                flexShrink: 0,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                width: 38,
                height: 38,
                borderRadius: 2,
                '&:hover': { backgroundColor: 'primary.dark' },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField select label="סטטוס" value={form.status || 'חדשה'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} fullWidth>
            {CS_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="אחראי" value={form.responsible || ''} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))} fullWidth>
            {responsibleOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="פולואפ"
            type="date"
            value={form.followUpDate || ''}
            onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value || null }))}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField label="פרטים" value={form.details || ''} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} fullWidth multiline minRows={2} />
          <TextField label="הערות" value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditor(null)} disabled={saving}>
              ביטול
            </Button>
            <Button variant="contained" onClick={() => void save()} disabled={saving}>
              {saving ? 'שומר…' : 'שמירה'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addIssueTypeDialogOpen}
        onClose={() => !saving && closeAddIssueTypeDialog()}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ direction: 'rtl', textAlign: 'right' }}>הוספת סוג בעיה</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="שם סוג הבעיה"
            value={newIssueTypeName}
            onChange={(e) => setNewIssueTypeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmAddIssueType()
              }
            }}
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { dir: 'rtl', style: { textAlign: 'right' } } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, direction: 'rtl' }}>
          <Button onClick={closeAddIssueTypeDialog}>ביטול</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={confirmAddIssueType}
            disabled={!newIssueTypeName.trim()}
          >
            הוספה
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
