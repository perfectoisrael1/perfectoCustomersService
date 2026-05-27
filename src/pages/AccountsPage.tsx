import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { useTheme } from '@mui/material/styles'
import {
  ACCOUNT_STATUS_CELL_BG,
  formatCsPhoneDisplay,
  isCreatedTodayJerusalem,
  mapAccountStatusLabel,
} from '../lib/caliberUi'
import {
  getAccounts,
  deleteAccount,
  patchAccount,
  getCities,
  getServices,
  type Account,
  type AccountInput,
  type City,
  type Service,
} from '../api/csApi'
import AccountEditDialog from '../components/AccountEditDialog'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'

type AccountTab = 'customers' | 'today'

type AccountsSortColumn =
  | 'accountName'
  | 'phoneNumber'
  | 'specialtiesCategory'
  | 'status'
  | 'credits'
  | 'updatedAt'

function accountStatusChipColors(statusDisp: string): { bg: string; fg: string } {
  const s = String(statusDisp || '').trim()
  const bg = ACCOUNT_STATUS_CELL_BG[s as keyof typeof ACCOUNT_STATUS_CELL_BG]
  if (!bg) return { bg: '#757575', fg: '#fff' }
  const fgMap: Record<string, string> = {
    פעיל: '#1B5E20',
    'לא פעיל': '#1565C0',
    בהשעיה: '#BF360C',
    ממתין: '#827717',
  }
  return { bg, fg: fgMap[s] || '#263238' }
}

function accountSortValue(row: Account, col: AccountsSortColumn): string {
  if (col === 'status') return mapAccountStatusLabel(row.perfectoStatus || row.accountStatus)
  if (col === 'credits') return String(Number(row.credits ?? -1e18))
  if (col === 'specialtiesCategory') return String(row.specialtiesCategory ?? '')
  if (col === 'accountName') return String(row.accountName ?? '')
  if (col === 'phoneNumber') return String(row.phoneNumber ?? '')
  if (col === 'updatedAt') return String(row.updatedAt ?? '')
  return ''
}

export default function AccountsPage() {
  const theme = useTheme()
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    const s = String(segment || '')
    if (s && s !== 'businesses' && s !== 'today') {
      navigate('/accounts/businesses', { replace: true })
    }
  }, [segment, navigate])

  const tab: AccountTab = segment === 'today' ? 'today' : 'customers'

  const [rows, setRows] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Account | null>(null)
  const [form, setForm] = useState<AccountInput>({})
  const [saving, setSaving] = useState(false)
  const [catalogServices, setCatalogServices] = useState<Service[]>([])
  const [catalogCities, setCatalogCities] = useState<City[]>([])

  const [sort, setSort] = useState<{ col: AccountsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'accountName',
    dir: 'asc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAccounts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ספקים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [svc, cty] = await Promise.all([getServices(), getCities()])
        if (cancelled) return
        setCatalogServices(Array.isArray(svc) ? svc : [])
        setCatalogCities(Array.isArray(cty) ? cty : [])
      } catch {
        if (!cancelled) {
          setCatalogServices([])
          setCatalogCities([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tabRows = useMemo(() => {
    if (tab === 'today') return rows.filter((r) => isCreatedTodayJerusalem(r.createdAt))
    return rows
  }, [rows, tab])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    const qDigits = q.replace(/\D/g, '')
    return tabRows.filter((r) => {
      const name = String(r.accountName || '').toLowerCase()
      const phone = String(r.phoneNumber || '').replace(/\D/g, '')
      const blob = [
        r.businessName,
        r.email,
        r.specialtiesCategory,
        r.phoneNumber,
        mapAccountStatusLabel(r.perfectoStatus || r.accountStatus),
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return name.includes(q) || blob.includes(q) || (qDigits.length > 0 && phone.includes(qDigits))
    })
  }, [query, tabRows])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const list = [...filtered]
    const { col: sortColumn, dir: sortDir } = sort
    list.sort((a, b) => {
      const va = accountSortValue(a, sortColumn)
      const vb = accountSortValue(b, sortColumn)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: AccountsSortColumn) => {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    )
  }, [])

  const counts = useMemo(
    () => ({
      customers: rows.length,
      today: rows.filter((r) => isCreatedTodayJerusalem(r.createdAt)).length,
    }),
    [rows],
  )

  const openEdit = (row: Account) => {
    setForm({
      accountName: row.accountName,
      phoneNumber: row.phoneNumber,
      businessName: row.businessName,
      email: row.email,
      about: row.about,
      certificateNumber: row.certificateNumber,
      specialtiesCategory: row.specialtiesCategory,
      specialties: row.specialties,
      workingAreas: row.workingAreas,
      workingHours:
        row.workingHours == null
          ? null
          : typeof row.workingHours === 'string'
            ? row.workingHours
            : JSON.stringify(row.workingHours),
      perfectoStatus: row.perfectoStatus,
      availability:
        row.availability == null || row.availability === ''
          ? null
          : Number.parseInt(String(row.availability), 10),
      credits: row.credits,
      payPerLead: row.payPerLead,
      yearsOfExperience:
        row.yearsOfExperience == null || row.yearsOfExperience === ''
          ? null
          : Number.parseInt(String(row.yearsOfExperience), 10),
      slug: row.slug,
    })
    setEditor(row)
  }

  const handleSave = async () => {
    if (!editor) return
    setSaving(true)
    setError(null)
    try {
      await patchAccount(editor.id, form)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editor) return
    if (!window.confirm('האם אתה בטוח?')) return
    setSaving(true)
    setError(null)
    try {
      await deleteAccount(editor.id)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת הספק')
    } finally {
      setSaving(false)
    }
  }

  const colSpan = 6

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
                    onChange={(_e, v) => {
                      const next = v as AccountTab
                      navigate(next === 'today' ? '/accounts/today' : '/accounts/businesses')
                    }}
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
                    <Tab value="customers" label={`כל הספקים (${counts.customers})`} />
                    <Tab value="today" label={`הצטרפויות היום (${counts.today})`} />
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
                          <TableCell sortDirection={sort.col === 'accountName' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'accountName'}
                              direction={sort.col === 'accountName' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('accountName')}
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
                          <TableCell sortDirection={sort.col === 'specialtiesCategory' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'specialtiesCategory'}
                              direction={sort.col === 'specialtiesCategory' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('specialtiesCategory')}
                            >
                              תחום
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
                          <TableCell sortDirection={sort.col === 'credits' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'credits'}
                              direction={sort.col === 'credits' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('credits')}
                            >
                              קרדיטים
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'updatedAt' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'updatedAt'}
                              direction={sort.col === 'updatedAt' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('updatedAt')}
                            >
                              עודכן
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row) => {
                          const statusRaw = row.perfectoStatus || row.accountStatus
                          const statusDisp = mapAccountStatusLabel(statusRaw)
                          const chip = accountStatusChipColors(statusDisp)
                          return (
                            <TableRow
                              key={row.id}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => openEdit(row)}
                            >
                              <TableCell title={row.accountName}>{row.accountName}</TableCell>
                              <TableCell>{formatCsPhoneDisplay(row.phoneNumber)}</TableCell>
                              <TableCell title={String(row.specialtiesCategory || '')}>
                                {row.specialtiesCategory || '—'}
                              </TableCell>
                              <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                                <Chip
                                  size="small"
                                  label={statusDisp}
                                  sx={{
                                    bgcolor: chip.bg,
                                    color: chip.fg,
                                    fontWeight: 700,
                                  }}
                                />
                              </TableCell>
                              <TableCell>{row.credits ?? '—'}</TableCell>
                              <TableCell>{row.updatedAt}</TableCell>
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

      <AccountEditDialog
        open={!!editor}
        account={editor}
        form={form}
        setForm={setForm}
        saving={saving}
        services={catalogServices}
        cities={catalogCities}
        onClose={() => !saving && setEditor(null)}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />
    </>
  )
}
