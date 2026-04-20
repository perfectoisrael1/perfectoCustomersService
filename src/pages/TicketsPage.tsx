import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
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
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  CS_ISSUE_TYPE_OPTIONS,
  CS_STATUS_OPTIONS,
  DEFAULT_TICKET_RESPONSIBLE,
  ISSUE_TYPE_INVOICE,
  formatCsPhoneDisplay,
  issueTypeChipColors,
  isFollowUpTodayOrBefore,
  ticketStatusChipColors,
  TICKET_STATUS_DONE,
  TICKET_STATUS_NO_ANSWER_3,
  TICKET_STATUS_NOT_RELEVANT,
} from '../lib/caliberUi'
import {
  createTicket,
  deleteTicket,
  getTickets,
  patchTicket,
  type Ticket,
  type TicketInput,
} from '../api/csApi'

type CsTab = 'myTasks' | 'all'

const VALID_TICKET_TABS = new Set<CsTab>(['myTasks', 'all'])

function ticketOpenForMyTasks(r: Ticket): boolean {
  const status = String(r.status || '').trim()
  if (!status || status === 'status' || status === TICKET_STATUS_DONE || status === TICKET_STATUS_NOT_RELEVANT || status === TICKET_STATUS_NO_ANSWER_3) {
    return false
  }
  const issue = String(r.issueType || '').trim()
  if (issue === ISSUE_TYPE_INVOICE) return false
  return isFollowUpTodayOrBefore(r.followUpDate ? String(r.followUpDate) : null)
}

export default function TicketsPage() {
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Ticket | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TicketInput>({})

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
      return blob.includes(q) || (qd && phone.includes(qd))
    })
  }, [baseRows, query])

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
      responsible: DEFAULT_TICKET_RESPONSIBLE,
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
      responsible: row.responsible,
      followUpDate: row.followUpDate ? String(row.followUpDate).slice(0, 10) : null,
      notes: row.notes,
    })
    setEditor(row)
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
    if (!window.confirm('למחוק קריאה?')) return
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

  return (
    <>
      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>שירות לקוחות</Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>קריאה חדשה</Button>
            </Stack>

            <Tabs value={tab} onChange={(_e, v) => setTicketTab(v as CsTab)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab value="myTasks" label={`המשימות שלי (${counts.myTasks})`} />
              <Tab value="all" label={`כל הקריאות (${counts.all})`} />
            </Tabs>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField size="small" placeholder="חיפוש…" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1 }} />
              <Button variant="outlined" onClick={() => void load()}>רענון</Button>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>טוען…</Box>
            ) : (
              <TableContainer sx={{ maxHeight: 'calc(100vh - 340px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>שם</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>טלפון</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>סוג הבעיה</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>סטטוס</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>אחראי</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>פולואפ</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>פרטים</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTickets.map((row) => {
                      const ic = issueTypeChipColors(row.issueType)
                      const sc = ticketStatusChipColors(row.status)
                      return (
                        <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEdit(row)}>
                          <TableCell>{row.name || '—'}</TableCell>
                          <TableCell>{formatCsPhoneDisplay(row.phoneNumber)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={row.issueType || '—'} sx={{ bgcolor: ic.bg, color: ic.fg, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={row.status || '—'} sx={{ bgcolor: sc.bg, color: sc.fg, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>{row.responsible || '—'}</TableCell>
                          <TableCell>{row.followUpDate ? String(row.followUpDate).slice(0, 10) : '—'}</TableCell>
                          <TableCell sx={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.details || '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredTickets.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}>אין נתונים</TableCell></TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editor === 'new' ? 'קריאה חדשה' : `קריאה #${(editor as Ticket)?.id}`}
          <IconButton onClick={() => !saving && setEditor(null)} aria-label="סגור"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="שם" value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
          <TextField label="טלפון" value={form.phoneNumber || ''} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} fullWidth />
          <TextField select label="סוג הבעיה" value={form.issueType || ''} onChange={(e) => setForm((f) => ({ ...f, issueType: e.target.value }))} fullWidth>
            {CS_ISSUE_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.label} value={o.label}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField select label="סטטוס" value={form.status || 'חדשה'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} fullWidth>
            {CS_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          <TextField label="אחראי" value={form.responsible || ''} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))} fullWidth />
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
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Box>
            {editor && editor !== 'new' ? (
              <Button color="error" startIcon={<DeleteIcon />} onClick={() => void remove()} disabled={saving}>מחיקה</Button>
            ) : null}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditor(null)} disabled={saving}>ביטול</Button>
            <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  )
}
