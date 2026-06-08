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
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
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
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import LeadEditDialog from '../components/LeadEditDialog'
import {
  LEAD_PHONE_EMPHASIS,
  LEAD_TYPE_OPTIONS,
  formatLeadPhoneDisplay,
  getLeadStatusColors,
  getLeadTypeColors,
} from '../lib/leadsUi'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import CsTableContainer from '../components/CsStandardTable'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'
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

type LeadsSortColumn =
  | 'name'
  | 'phone'
  | 'category'
  | 'followUpDate'
  | 'status'
  | 'leadType'
  | 'details'
  | 'created'
  | 'responsible'

function leadSortValue(row: Lead, col: LeadsSortColumn): string {
  switch (col) {
    case 'name':
      return String(row.name ?? '')
    case 'phone':
      return String(row.phone ?? '')
    case 'category':
      return String(row.category ?? '')
    case 'followUpDate':
      return row.followUpDate ? String(row.followUpDate).slice(0, 19) : ''
    case 'status':
      return String(row.status ?? '')
    case 'leadType':
      return String(row.leadType ?? '')
    case 'details':
      return String(row.details ?? '')
    case 'created':
      return String(row.created ?? '')
    case 'responsible':
      return String(row.responsible ?? '')
    default:
      return ''
  }
}

function isMineRow(row: Lead, user: ReturnType<typeof useAuth>['user']): boolean {
  if (!user) return false
  const me = [user.fullName, user.username]
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean)
  const resp = String(row.responsible || '').trim().toLowerCase()
  return me.some((m) => resp === m || resp.includes(m))
}

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

  const [sort, setSort] = useState<{ col: LeadsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'created',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

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

  const counts = useMemo(() => {
    const todayIso = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    const todayRows = allRows.filter((r) => String(r.created || '').startsWith(todayIso))
    const mineRows = user ? allRows.filter((r) => isMineRow(r, user)) : []
    return {
      mine: mineRows.length,
      today: todayRows.length,
      all: allRows.length,
    }
  }, [allRows, user])

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
      return allRows.filter((r) => isMineRow(r, user))
    }
    return allRows
  }, [allRows, tab, user])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    return tabRows.filter((r) => {
      const blob = [r.name, r.phone, r.businessName, r.status, r.responsible, r.category, r.details, r.leadType]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      const qd = q.replace(/\D/g, '')
      const phone = String(r.phone || '').replace(/\D/g, '')
      return blob.includes(q) || (qd.length > 0 && phone.includes(qd))
    })
  }, [query, tabRows])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const rows = [...filtered]
    const { col: sortColumn, dir: sortDir } = sort
    rows.sort((a, b) => {
      const va = leadSortValue(a, sortColumn)
      const vb = leadSortValue(b, sortColumn)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: LeadsSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'created' ? 'desc' : 'asc' },
    )
  }, [])

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
    if (!window.confirm('האם אתה בטוח?')) return
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

  const colSpan = 9

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
                    onChange={(_e, v) => setLeadTab(v as LeadTab)}
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
                    <Tab value="mine" label={`הלידים שלי (${counts.mine})`} />
                    <Tab value="today" label={`לידים מהיום (${counts.today})`} />
                    <Tab value="all" label={`כל הלידים (${counts.all})`} />
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
                      ליד חדש
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => void loadAll()}
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
                          <TableCell align="center" sortDirection={sort.col === 'name' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'name'}
                              direction={sort.col === 'name' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('name')}
                            >
                              שם מלא
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
                          <TableCell sortDirection={sort.col === 'category' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'category'}
                              direction={sort.col === 'category' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('category')}
                            >
                              תחום
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center" sortDirection={sort.col === 'followUpDate' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'followUpDate'}
                              direction={sort.col === 'followUpDate' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('followUpDate')}
                            >
                              תאריך פולואפ
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
                          <TableCell align="center" sortDirection={sort.col === 'leadType' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'leadType'}
                              direction={sort.col === 'leadType' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('leadType')}
                            >
                              סוג הליד
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'details' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'details'}
                              direction={sort.col === 'details' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('details')}
                            >
                              הערות
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
                          <TableCell sortDirection={sort.col === 'responsible' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'responsible'}
                              direction={sort.col === 'responsible' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('responsible')}
                            >
                              אחראי
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row) => {
                          const statusColors = getLeadStatusColors(row.status)
                          const leadTypeValue = row.leadType || 'בלי אפליקציה'
                          const leadTypeColors = getLeadTypeColors(leadTypeValue)
                          return (
                            <TableRow
                              key={row.id}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => openEdit(row)}
                            >
                              <TableCell align="center" title={row.name || ''}>
                                {row.name || '—'}
                              </TableCell>
                              <TableCell
                                align="center"
                                title={formatLeadPhoneDisplay(row.phone)}
                                sx={{
                                  '&, & .MuiTypography-root': {
                                    direction: 'ltr',
                                    fontFeatureSettings: 'normal',
                                  },
                                  fontWeight: 400,
                                  color: LEAD_PHONE_EMPHASIS,
                                }}
                              >
                                {formatLeadPhoneDisplay(row.phone)}
                              </TableCell>
                              <TableCell title={row.category || ''}>{row.category || '—'}</TableCell>
                              <TableCell align="center">
                                {row.followUpDate ? String(row.followUpDate).slice(0, 10) : '—'}
                              </TableCell>
                              <TableCell align="center" sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                                <Chip
                                  size="small"
                                  label={row.status || '—'}
                                  sx={{
                                    bgcolor: statusColors.bg,
                                    color: statusColors.fg,
                                    fontWeight: 700,
                                  }}
                                />
                              </TableCell>
                              <TableCell
                                align="center"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                sx={{
                                  backgroundColor: `${leadTypeColors.bg} !important`,
                                  color: `${leadTypeColors.fg} !important`,
                                  textAlign: 'center !important',
                                  py: 0.5,
                                  px: 0.5,
                                  verticalAlign: 'middle',
                                  overflow: 'hidden',
                                  minWidth: 180,
                                  '& > *': { backgroundColor: 'transparent !important' },
                                }}
                              >
                                <Select
                                  size="small"
                                  value={leadTypeValue}
                                  disabled
                                  variant="standard"
                                  disableUnderline
                                  sx={{
                                    color: 'inherit',
                                    fontWeight: 'normal',
                                    fontSize: 14,
                                    width: '100%',
                                    '& .MuiSelect-select': {
                                      py: 0,
                                      textAlign: 'center',
                                      pr: '0 !important',
                                      pl: '0 !important',
                                    },
                                    '& .MuiSelect-icon': { display: 'none' },
                                    '&.Mui-disabled': { color: 'inherit', WebkitTextFillColor: 'inherit' },
                                  }}
                                >
                                  {LEAD_TYPE_OPTIONS.map((opt) => {
                                    const colors = getLeadTypeColors(opt)
                                    return (
                                      <MenuItem
                                        key={opt}
                                        value={opt}
                                        sx={{
                                          backgroundColor: colors.bg,
                                          color: colors.fg,
                                          fontWeight: 'normal',
                                          fontSize: 14,
                                          borderRadius: 1.5,
                                          minHeight: 44,
                                          justifyContent: 'center',
                                          textAlign: 'center',
                                          whiteSpace: 'normal',
                                          px: 1,
                                        }}
                                      >
                                        {opt}
                                      </MenuItem>
                                    )
                                  })}
                                </Select>
                              </TableCell>
                              <TableCell sx={{ maxWidth: 280 }} title={row.details || ''}>
                                {row.details || '—'}
                              </TableCell>
                              <TableCell sx={{ direction: 'ltr', textAlign: 'right', color: 'text.secondary' }}>
                                {row.created
                                  ? new Date(row.created).toLocaleDateString('he-IL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: '2-digit',
                                    })
                                  : '—'}
                              </TableCell>
                              <TableCell title={row.responsible || ''}>{row.responsible || '—'}</TableCell>
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
