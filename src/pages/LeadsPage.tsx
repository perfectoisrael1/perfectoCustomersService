import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import LeadEditDialog from '../components/LeadEditDialog'
import {
  LEAD_PHONE_EMPHASIS,
  STANDARD_TABLE_BODY_FONT_PX,
  formatLeadPhoneDisplay,
  getLeadStatusColors,
  leadTableScrollbarSx,
} from '../lib/leadsUi'
import { useAuth } from '../context/useAuth'
import {
  createLead,
  deleteLead,
  getLeads,
  patchLead,
  type Lead,
  type LeadInput,
} from '../api/csApi'

type LeadTab = 'all' | 'today' | 'mine'

const STDTBL_PAD = 6

export default function LeadsPage() {
  const theme = useTheme()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = useMemo<LeadTab>(() => {
    const v = searchParams.get('view')
    if (v === 'all') return 'all'
    if (v === 'today') return 'today'
    return 'mine'
  }, [searchParams])

  const setLeadTab = (next: LeadTab) => {
    if (next === 'mine') setSearchParams({}, { replace: true })
    else if (next === 'today') setSearchParams({ view: 'today' }, { replace: true })
    else setSearchParams({ view: 'all' }, { replace: true })
  }

  const [allRows, setAllRows] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Lead | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<LeadInput>({})

  const pad = `${STDTBL_PAD}px`
  const padImportant = `${STDTBL_PAD}px !important`

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAllRows(await getLeads())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת לידים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const tabRows = useMemo(() => {
    if (tab === 'today') {
      const todayIso = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
      return allRows.filter((r) => String(r.created || '').startsWith(todayIso))
    }
    if (tab === 'mine' && user) {
      const me = [user.fullName, user.username].map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
      return allRows.filter((r) => {
        const resp = String(r.responsible || '').trim().toLowerCase()
        return me.some((m) => resp === m || resp.includes(m))
      })
    }
    return allRows
  }, [allRows, tab, user])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    return tabRows.filter((r) => {
      const blob = [r.name, r.phone, r.businessName, r.status, r.responsible, r.category, r.details]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const qd = q.replace(/\D/g, '')
      const phone = String(r.phone || '').replace(/\D/g, '')
      return blob.includes(q) || (qd && phone.includes(qd))
    })
  }, [query, tabRows])

  const openNew = () => {
    setForm({
      name: '',
      phone: '',
      businessName: '—',
      status: 'חדש',
      responsible: user?.fullName || user?.username || '',
      isPaid: false,
    })
    setEditor('new')
  }

  const openEdit = (row: Lead) => {
    setForm({
      name: row.name,
      phone: row.phone,
      businessName: row.businessName || '',
      email: row.email,
      category: row.category,
      status: row.status,
      responsible: row.responsible,
      details: row.details,
      amount: row.amount,
      bonus: row.bonus,
      isPaid: row.isPaid,
      followUpDate: row.followUpDate ? String(row.followUpDate).slice(0, 10) : null,
      leadSource: row.leadSource,
    })
    setEditor(row)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editor === 'new') {
        await createLead(form)
      } else if (editor) {
        await patchLead(editor.id, form)
      }
      setEditor(null)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (editor == null || editor === 'new') return
    if (!window.confirm('למחוק ליד זה?')) return
    setSaving(true)
    setError(null)
    try {
      await deleteLead(editor.id)
      setEditor(null)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    } finally {
      setSaving(false)
    }
  }

  const tableContainerSx = {
    backgroundColor: 'background.paper',
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
    overflowX: 'auto',
    overflowY: 'auto',
    direction: 'rtl',
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 340px)',
    ...leadTableScrollbarSx(theme),
  }

  const tableSx = {
    width: '100%',
    tableLayout: 'fixed' as const,
    minWidth: 0,
    direction: 'rtl' as const,
    borderCollapse: 'separate' as const,
    borderSpacing: 0,
    '& th, & td': {
      height: '30px',
      maxHeight: '30px',
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingLeft: pad,
      paddingRight: pad,
      boxSizing: 'border-box',
    },
    '& thead': {
      position: 'sticky',
      top: 0,
      zIndex: 12,
      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#E1EFF2 !important',
    },
    '& thead .MuiTableCell-head': {
      color: 'text.primary',
      fontWeight: 800,
      fontSize: 17,
      borderColor: theme.palette.divider,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      backgroundColor: 'transparent !important',
      borderRight: `0.5px solid ${theme.palette.divider}`,
      borderBottom: `0.5px solid ${theme.palette.divider}`,
      paddingLeft: padImportant,
      paddingRight: padImportant,
    },
    '& td': {
      color: 'text.primary',
      borderColor: theme.palette.divider,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: 1.2,
      verticalAlign: 'middle',
      fontSize: STANDARD_TABLE_BODY_FONT_PX,
      borderRight: `0.5px solid ${theme.palette.divider}`,
      borderBottom: `0.5px solid ${theme.palette.divider}`,
      paddingLeft: padImportant,
      paddingRight: padImportant,
    },
    '& tbody tr': { backgroundColor: 'background.paper', height: '30px', maxHeight: '30px' },
    '& tbody tr:hover': {
      backgroundColor: 'rgba(11,114,133,0.04) !important',
    },
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
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  לידים
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                ליד חדש
              </Button>
            </Stack>

            <Tabs value={tab} onChange={(_e, v) => setLeadTab(v as LeadTab)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab value="mine" label="הלידים שלי" />
              <Tab value="today" label="לידים מהיום" />
              <Tab value="all" label="כל הלידים" />
            </Tabs>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField size="small" placeholder="חיפוש…" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1 }} />
              <Button variant="outlined" onClick={() => void loadAll()}>רענון</Button>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {loading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>טוען…</Box>
              ) : (
                <TableContainer sx={tableContainerSx}>
                  <Table stickyHeader size="small" sx={tableSx}>
                    <TableHead>
                      <TableRow sx={{ direction: 'rtl' }}>
                        <TableCell sx={{ width: '11%', minWidth: 0, textAlign: 'center' }}>שם מלא</TableCell>
                        <TableCell sx={{ width: '9%', minWidth: 0, maxWidth: '11%', px: 0.25, textAlign: 'center' }}>טלפון</TableCell>
                        <TableCell sx={{ width: '10%', minWidth: 0, textAlign: 'right' }}>תחום</TableCell>
                        <TableCell sx={{ width: '16%', minWidth: '158px', maxWidth: '19%', textAlign: 'center' }}>תאריך פולואפ</TableCell>
                        <TableCell sx={{ width: '10%', minWidth: 0, textAlign: 'center' }}>סטטוס</TableCell>
                        <TableCell sx={{ width: '20%', minWidth: 0, textAlign: 'right' }}>הערות</TableCell>
                        <TableCell sx={{ width: '8%', minWidth: 0, textAlign: 'right' }}>נוצר</TableCell>
                        <TableCell sx={{ width: '6%', minWidth: 0, textAlign: 'right' }}>אחראי</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((row) => {
                        const statusColors = getLeadStatusColors(row.status)
                        return (
                          <TableRow
                            key={row.id}
                            hover
                            sx={{
                              direction: 'rtl',
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(11,114,133,0.04) !important' },
                            }}
                            onClick={() => openEdit(row)}
                          >
                            <TableCell align="center" sx={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <Box
                                sx={{
                                  fontSize: 15,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  width: '100%',
                                }}
                              >
                                {row.name || '—'}
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ px: 0.25, minWidth: 0, textAlign: 'center', verticalAlign: 'middle' }}>
                              <Box
                                sx={{
                                  direction: 'ltr',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  width: '100%',
                                  fontSize: 15,
                                  color: LEAD_PHONE_EMPHASIS,
                                  fontWeight: 400,
                                }}
                              >
                                {formatLeadPhoneDisplay(row.phone)}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  fontSize: 15,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  width: '100%',
                                }}
                              >
                                {row.category || '—'}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              {row.followUpDate ? String(row.followUpDate).slice(0, 10) : '—'}
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                backgroundColor: `${statusColors.bg} !important`,
                                color: `${statusColors.fg} !important`,
                                textAlign: 'center !important',
                                verticalAlign: 'middle',
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                '&&': {
                                  paddingLeft: 0,
                                  paddingRight: 0,
                                  paddingTop: 0,
                                  paddingBottom: 0,
                                },
                              }}
                            >
                              {row.status || '—'}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                minWidth: 0,
                                overflow: 'hidden',
                                verticalAlign: 'middle',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.details || '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ minWidth: 0, maxWidth: 45, width: 45, overflow: 'hidden' }}>
                              <Box
                                sx={{
                                  fontSize: 15,
                                  color: 'text.secondary',
                                  whiteSpace: 'nowrap',
                                  direction: 'ltr',
                                  textAlign: 'right',
                                }}
                              >
                                {row.created
                                  ? new Date(row.created).toLocaleDateString('he-IL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: '2-digit',
                                    })
                                  : '—'}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ minWidth: 0, overflow: 'hidden', verticalAlign: 'middle' }}>
                              {row.responsible || '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                            אין נתונים
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <LeadEditDialog
        open={!!editor}
        editor={editor}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setEditor(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}
