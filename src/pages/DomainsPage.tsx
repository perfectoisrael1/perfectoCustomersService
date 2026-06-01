import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
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
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CloseIcon from '@mui/icons-material/Close'
import DnsIcon from '@mui/icons-material/Dns'
import SearchIcon from '@mui/icons-material/Search'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import CsDialogTitleWithMenu from '../components/CsDialogTitleWithMenu'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'
import {
  createDomain,
  deleteDomain,
  getDomains,
  patchDomain,
  type Domain,
  type DomainInput,
} from '../api/csApi'

type DomainTab = 'expiringThisMonth' | 'all'

type DomainsSortColumn =
  | 'domainName'
  | 'status'
  | 'purchaseDate'
  | 'renewalDate'
  | 'isCompleted'

const DOMAIN_STATUS_OPTIONS = ['פעיל', 'ממתין', 'פג תוקף', 'בביטול']

const DOMAIN_EXPIRING_THIS_MONTH_HIGHLIGHT_SX = {
  color: '#d50000',
  fontWeight: 700,
  bgcolor: '#ff8a80',
} as const

/** מיקום טקסט מימין לשמאל בשדות Outlined של דיאלוג הדומיין */
const DOMAIN_EDITOR_RTL_FIELD_SX = {
  direction: 'rtl' as const,
  '& .MuiOutlinedInput-root': {
    direction: 'rtl' as const,
  },
  '& .MuiInputBase-input': {
    textAlign: 'right',
    direction: 'rtl' as const,
  },
  '& .MuiInputBase-input::placeholder': {
    textAlign: 'right',
    opacity: 1,
    color: 'text.secondary',
  },
  '& .MuiSelect-select': {
    textAlign: 'right',
    direction: 'rtl' as const,
  },
  '& .MuiSelect-icon': {
    left: 8,
    right: 'auto',
  },
}

const DOMAIN_EDITOR_SELECT_MENU_PROPS = {
  slotProps: {
    paper: {
      sx: {
        direction: 'rtl',
        '& .MuiMenuItem-root': { justifyContent: 'flex-start', direction: 'rtl' },
      },
    },
  },
} as const

function renderSelectPlaceholder(value: string, placeholder: string) {
  if (value) return value
  return (
    <Box component="span" sx={{ color: 'text.secondary' }}>
      {placeholder}
    </Box>
  )
}

function DomainDateField({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string | null | undefined
  onChange: (next: string | null) => void
}) {
  const hasValue = Boolean(value)

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        fullWidth
        sx={{
          ...DOMAIN_EDITOR_RTL_FIELD_SX,
          '& input[type="date"]': {
            paddingInlineStart: '1.75rem',
          },
          '& input[type="date"]::-webkit-calendar-picker-indicator': {
            marginInlineStart: '10px',
            cursor: 'pointer',
          },
          ...(hasValue
            ? {}
            : {
                '& input[type="date"]::-webkit-datetime-edit': { opacity: 0 },
                '& input[type="date"]::-webkit-datetime-edit-fields-wrapper': { opacity: 0 },
              }),
        }}
        slotProps={{ htmlInput: { dir: 'rtl', 'aria-label': placeholder } }}
      />
      {!hasValue ? (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: '50%',
            right: 48,
            left: 14,
            transform: 'translateY(-50%)',
            color: 'text.secondary',
            pointerEvents: 'none',
            direction: 'rtl',
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {placeholder}
        </Box>
      ) : null}
    </Box>
  )
}

function domainSortValue(row: Domain, col: DomainsSortColumn): string {
  switch (col) {
    case 'domainName':
      return String(row.domainName ?? '')
    case 'status':
      return String(row.status ?? '')
    case 'purchaseDate':
      return row.purchaseDate ? String(row.purchaseDate).slice(0, 10) : ''
    case 'renewalDate':
      return row.renewalDate ? String(row.renewalDate).slice(0, 10) : ''
    case 'isCompleted':
      return row.isCompleted ? '1' : '0'
    default:
      return ''
  }
}

function formatDateCell(value: string | null | undefined): string {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function currentMonthKeyJerusalem(): string {
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return todayIso.slice(0, 7)
}

function isRenewalThisMonth(renewalDate: string | null | undefined): boolean {
  if (!renewalDate) return false
  return String(renewalDate).slice(0, 7) === currentMonthKeyJerusalem()
}

function addOneYearToDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  const base = String(isoDate).slice(0, 10)
  const d = new Date(`${base}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function domainTabLabel(icon: React.ReactNode, text: string) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        direction: 'rtl',
      }}
    >
      {icon}
      <span>{text}</span>
    </Box>
  )
}

export default function DomainsPage() {
  const theme = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = useMemo<DomainTab>(() => {
    const t = searchParams.get('tab')
    return t === 'all' ? 'all' : 'expiringThisMonth'
  }, [searchParams])

  const setDomainTab = (next: DomainTab) => {
    if (next === 'expiringThisMonth') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: 'all' }, { replace: true })
  }

  const [rows, setRows] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Domain | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<DomainInput>({})
  const [paymentConfirm, setPaymentConfirm] = useState<Domain | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<{
    domainName: string
    nextRenewalDate: string
  } | null>(null)
  const [paymentSaving, setPaymentSaving] = useState(false)

  const [sort, setSort] = useState<{ col: DomainsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'renewalDate',
    dir: 'asc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getDomains()
      setRows(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת דומיינים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const baseRows = useMemo(() => {
    if (tab === 'expiringThisMonth') return rows.filter((r) => isRenewalThisMonth(r.renewalDate))
    return rows
  }, [rows, tab])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baseRows
    return baseRows.filter((r) => {
      const blob = [r.domainName, r.status, r.purchaseDate, r.renewalDate]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [baseRows, query])

  useEffect(() => {
    setPage(0)
  }, [tab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const list = [...filteredRows]
    const { col: sortColumn, dir: sortDir } = sort
    list.sort((a, b) => {
      const va = domainSortValue(a, sortColumn)
      const vb = domainSortValue(b, sortColumn)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredRows, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: DomainsSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    )
  }, [])

  const counts = useMemo(
    () => ({
      expiringThisMonth: rows.filter((r) => isRenewalThisMonth(r.renewalDate)).length,
      all: rows.length,
    }),
    [rows],
  )

  const openNew = () => {
    setForm({
      domainName: '',
      status: '',
      purchaseDate: null,
      renewalDate: null,
    })
    setEditor('new')
  }

  const openEdit = (row: Domain) => {
    setForm({
      domainName: row.domainName,
      status: row.status,
      purchaseDate: row.purchaseDate ? String(row.purchaseDate).slice(0, 10) : null,
      renewalDate: row.renewalDate ? String(row.renewalDate).slice(0, 10) : null,
    })
    setEditor(row)
  }

  const buildSaveBody = (): DomainInput => ({
    domainName: String(form.domainName || '').trim(),
    status: form.status ?? null,
    purchaseDate: form.purchaseDate ?? null,
    renewalDate: form.renewalDate ?? null,
  })

  const save = async () => {
    const domainName = String(form.domainName || '').trim()
    if (!domainName) {
      setError('שם דומיין נדרש')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = buildSaveBody()
      if (editor === 'new') await createDomain(body)
      else if (editor) await patchDomain(editor.id, body)
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
      await deleteDomain(editor.id)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    } finally {
      setSaving(false)
    }
  }

  const handleCompletedToggle = (row: Domain, nextChecked: boolean) => {
    if (nextChecked) {
      if (!row.renewalDate) {
        setError('חסר תאריך חידוש לדומיין')
        return
      }
      setPaymentConfirm(row)
      return
    }
    void (async () => {
      setPaymentSaving(true)
      setError(null)
      try {
        await patchDomain(row.id, { isCompleted: false })
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
      } finally {
        setPaymentSaving(false)
      }
    })()
  }

  const confirmDomainPayment = async () => {
    if (!paymentConfirm) return
    const nextRenewalDate = addOneYearToDate(paymentConfirm.renewalDate)
    if (!nextRenewalDate) {
      setError('תאריך חידוש לא תקין')
      return
    }
    setPaymentSaving(true)
    setError(null)
    try {
      await patchDomain(paymentConfirm.id, {
        renewalDate: nextRenewalDate,
        isCompleted: false,
      })
      setPaymentSuccess({
        domainName: paymentConfirm.domainName,
        nextRenewalDate,
      })
      setPaymentConfirm(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
    } finally {
      setPaymentSaving(false)
    }
  }

  const colSpan = 5

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
                    onChange={(_e, v) => setDomainTab(v as DomainTab)}
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
                    <Tab
                      value="expiringThisMonth"
                      label={domainTabLabel(
                        <CalendarMonthIcon sx={{ fontSize: 18, opacity: 0.9 }} />,
                        `תפוגה החודש (${counts.expiringThisMonth})`,
                      )}
                    />
                    <Tab
                      value="all"
                      label={domainTabLabel(
                        <DnsIcon sx={{ fontSize: 18, opacity: 0.9 }} />,
                        `כל הדומיינים (${counts.all})`,
                      )}
                    />
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
                    <Button
                      variant="contained"
                      endIcon={<AddIcon />}
                      onClick={openNew}
                      sx={{
                        whiteSpace: 'nowrap',
                        '& .MuiButton-endIcon': {
                          marginInlineStart: '10px',
                          marginInlineEnd: 0,
                        },
                      }}
                    >
                      דומיין חדש
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
                            <TableCell sortDirection={sort.col === 'domainName' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'domainName'}
                                direction={sort.col === 'domainName' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('domainName')}
                              >
                                שם
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
                            <TableCell sortDirection={sort.col === 'purchaseDate' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'purchaseDate'}
                                direction={sort.col === 'purchaseDate' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('purchaseDate')}
                              >
                                תאריך רכישה
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={sort.col === 'renewalDate' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'renewalDate'}
                                direction={sort.col === 'renewalDate' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('renewalDate')}
                              >
                                תאריך חידוש
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={sort.col === 'isCompleted' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'isCompleted'}
                                direction={sort.col === 'isCompleted' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('isCompleted')}
                              >
                                בוצע
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((row) => {
                            const highlightExpiringThisMonth =
                              tab === 'all' && isRenewalThisMonth(row.renewalDate)
                            return (
                            <TableRow
                              key={row.id}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => openEdit(row)}
                            >
                              <TableCell
                                title={row.domainName}
                                sx={highlightExpiringThisMonth ? DOMAIN_EXPIRING_THIS_MONTH_HIGHLIGHT_SX : undefined}
                              >
                                {row.domainName || '—'}
                              </TableCell>
                              <TableCell>{row.status || '—'}</TableCell>
                              <TableCell>{formatDateCell(row.purchaseDate)}</TableCell>
                              <TableCell
                                sx={highlightExpiringThisMonth ? DOMAIN_EXPIRING_THIS_MONTH_HIGHLIGHT_SX : undefined}
                              >
                                {formatDateCell(row.renewalDate)}
                              </TableCell>
                              <TableCell
                                sx={{ overflow: 'visible', textOverflow: 'clip' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Switch
                                  checked={row.isCompleted}
                                  disabled={paymentSaving && paymentConfirm?.id === row.id}
                                  onChange={(e) => handleCompletedToggle(row, e.target.checked)}
                                  size="small"
                                />
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

      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} maxWidth="sm" fullWidth>
        <CsDialogTitleWithMenu
          heading={editor === 'new' ? 'דומיין חדש' : `דומיין #${(editor as Domain)?.id}`}
          onClose={() => !saving && setEditor(null)}
          closeDisabled={saving}
          onRequestDelete={editor && editor !== 'new' ? () => void remove() : undefined}
          menuDisabled={saving}
        />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, direction: 'rtl', textAlign: 'right' }}>
          <TextField
            placeholder="שם"
            value={form.domainName || ''}
            onChange={(e) => setForm((f) => ({ ...f, domainName: e.target.value }))}
            fullWidth
            required
            sx={DOMAIN_EDITOR_RTL_FIELD_SX}
            slotProps={{ htmlInput: { dir: 'rtl' } }}
          />
          <TextField
            select
            value={form.status || ''}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value || null }))}
            fullWidth
            sx={DOMAIN_EDITOR_RTL_FIELD_SX}
            slotProps={{
              select: {
                displayEmpty: true,
                renderValue: (selected) =>
                  renderSelectPlaceholder(String(selected ?? ''), 'סטטוס'),
                MenuProps: DOMAIN_EDITOR_SELECT_MENU_PROPS,
              },
            }}
          >
            <MenuItem value="">—</MenuItem>
            {DOMAIN_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <DomainDateField
            placeholder="תאריך רכישה"
            value={form.purchaseDate}
            onChange={(next) => setForm((f) => ({ ...f, purchaseDate: next }))}
          />
          <DomainDateField
            placeholder="תאריך חידוש"
            value={form.renewalDate}
            onChange={(next) => setForm((f) => ({ ...f, renewalDate: next }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, direction: 'rtl' }}>
          <Button onClick={() => setEditor(null)} disabled={saving}>
            ביטול
          </Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? 'שומר…' : 'שמירה'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentConfirm != null}
        onClose={() => !paymentSaving && setPaymentConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ direction: 'rtl', textAlign: 'right' }}>אישור תשלום</DialogTitle>
        <DialogContent sx={{ direction: 'rtl', textAlign: 'right' }}>
          <Typography>
            האם אתה בטוח ששילמת על הדומיין{' '}
            <strong>{paymentConfirm?.domainName}</strong> למה שכתוב בתאריך התפוגה{' '}
            <strong>{formatDateCell(paymentConfirm?.renewalDate)}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, direction: 'rtl' }}>
          <Button onClick={() => setPaymentConfirm(null)} disabled={paymentSaving}>
            ביטול
          </Button>
          <Button variant="contained" onClick={() => void confirmDomainPayment()} disabled={paymentSaving}>
            {paymentSaving ? 'מעדכן…' : 'אישור'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentSuccess != null}
        onClose={() => setPaymentSuccess(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ direction: 'rtl', textAlign: 'right' }}>הדומיין עודכן</DialogTitle>
        <DialogContent sx={{ direction: 'rtl', textAlign: 'right' }}>
          <Typography sx={{ mb: 1 }}>
            הדומיין <strong>{paymentSuccess?.domainName}</strong> עודכן בהצלחה.
          </Typography>
          <Typography>
            תאריך החידוש הבא:{' '}
            <strong>{formatDateCell(paymentSuccess?.nextRenewalDate)}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, direction: 'rtl' }}>
          <Button variant="contained" onClick={() => setPaymentSuccess(null)}>
            אישור
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
