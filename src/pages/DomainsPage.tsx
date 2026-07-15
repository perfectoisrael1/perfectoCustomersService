import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
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
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import CsDialogTitleWithMenu from '../components/CsDialogTitleWithMenu'
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
import {
  createDomain,
  deleteDomain,
  getDomains,
  patchDomain,
  type Domain,
  type DomainInput,
} from '../api/csApi'

type DomainTab = 'expiringThisMonth' | 'itamar' | 'yonatan'

const DOMAIN_OWNER_ITAMAR = 'איתמר'
const DOMAIN_OWNER_YONATAN = 'יונתן'
const DOMAIN_OWNER_OPTIONS = [DOMAIN_OWNER_ITAMAR, DOMAIN_OWNER_YONATAN]

type DomainsSortColumn =
  | 'domainName'
  | 'siteName'
  | 'status'
  | 'owner'
  | 'purchaseDate'
  | 'renewalDate'

type DomainFlagKey =
  | 'organicPromotion'
  | 'paidPromotion'
  | 'inRecruitment'
  | 'projectEnded'

const DOMAIN_FLAG_COLUMNS: { key: DomainFlagKey; label: string }[] = [
  { key: 'organicPromotion', label: 'קידום אורגני' },
  { key: 'paidPromotion', label: 'קידום ממומן' },
  { key: 'inRecruitment', label: 'בגיוס' },
  { key: 'projectEnded', label: 'פרויקט הסתיים' },
]

const DOMAIN_STATUS_OPTIONS = ['פעיל', 'ממתין', 'פג תוקף', 'בביטול']

const DOMAIN_EXPIRING_THIS_MONTH_HIGHLIGHT_SX = {
  color: '#d50000',
  fontWeight: 700,
  bgcolor: '#ff8a80',
} as const

const DOMAIN_FIELD_LABEL_SX = {
  fontWeight: 800,
  mb: 0.5,
  display: 'block',
  textAlign: 'right',
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
  '& .MuiSelect-select': {
    textAlign: 'right',
    direction: 'rtl' as const,
  },
  '& .MuiSelect-icon': {
    left: 8,
    right: 'auto',
  },
}

function DomainField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography sx={DOMAIN_FIELD_LABEL_SX}>{label}</Typography>
      {children}
    </Box>
  )
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

function DomainDateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null | undefined
  onChange: (next: string | null) => void
}) {
  return (
    <DomainField label={label}>
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
        }}
        slotProps={{
          htmlInput: { dir: 'rtl', style: { textAlign: 'right' } },
        }}
      />
    </DomainField>
  )
}

function domainSortValue(row: Domain, col: DomainsSortColumn): string {
  switch (col) {
    case 'domainName':
      return String(row.domainName ?? '')
    case 'siteName':
      return String(row.siteName ?? '')
    case 'status':
      return String(row.status ?? '')
    case 'owner':
      return String(row.owner ?? '')
    case 'purchaseDate':
      return row.purchaseDate ? String(row.purchaseDate).slice(0, 10) : ''
    case 'renewalDate':
      return row.renewalDate ? String(row.renewalDate).slice(0, 10) : ''
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
    if (t === 'itamar') return 'itamar'
    if (t === 'yonatan') return 'yonatan'
    return 'expiringThisMonth'
  }, [searchParams])

  const setDomainTab = (next: DomainTab) => {
    if (next === 'expiringThisMonth') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: next }, { replace: true })
  }

  const [rows, setRows] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Domain | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<DomainInput>({})
  const [ownerSavingId, setOwnerSavingId] = useState<number | null>(null)
  const [flagSavingKey, setFlagSavingKey] = useState<string | null>(null)

  const [sort, setSort] = useState<{ col: DomainsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'renewalDate',
    dir: 'asc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const rowSelection = useCsTableSelection()

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
    if (tab === 'itamar') return rows.filter((r) => r.owner === DOMAIN_OWNER_ITAMAR)
    if (tab === 'yonatan') return rows.filter((r) => r.owner === DOMAIN_OWNER_YONATAN)
    return rows.filter((r) => isRenewalThisMonth(r.renewalDate))
  }, [rows, tab])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baseRows
    return baseRows.filter((r) => {
      const blob = [r.domainName, r.siteName, r.status, r.owner, r.purchaseDate, r.renewalDate]
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

  const displayRows = useMemo(
    () => prependSelectedNotInList(sortedRows, rows, rowSelection.selectedIds, (r) => r.id),
    [sortedRows, rows, rowSelection.selectedIds],
  )

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return displayRows.slice(start, start + rowsPerPage)
  }, [displayRows, page, rowsPerPage])

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
      itamar: rows.filter((r) => r.owner === DOMAIN_OWNER_ITAMAR).length,
      yonatan: rows.filter((r) => r.owner === DOMAIN_OWNER_YONATAN).length,
    }),
    [rows],
  )

  const defaultOwnerForTab = (activeTab: DomainTab): string => {
    if (activeTab === 'itamar') return DOMAIN_OWNER_ITAMAR
    if (activeTab === 'yonatan') return DOMAIN_OWNER_YONATAN
    return ''
  }

  const openNew = () => {
    setForm({
      domainName: '',
      siteName: '',
      status: '',
      purchaseDate: null,
      renewalDate: null,
      owner: defaultOwnerForTab(tab),
      organicPromotion: false,
      paidPromotion: false,
      inRecruitment: false,
      projectEnded: false,
    })
    setEditor('new')
  }

  const openEdit = (row: Domain) => {
    setForm({
      domainName: row.domainName,
      siteName: row.siteName || '',
      status: row.status,
      purchaseDate: row.purchaseDate ? String(row.purchaseDate).slice(0, 10) : null,
      renewalDate: row.renewalDate ? String(row.renewalDate).slice(0, 10) : null,
      owner: row.owner || '',
      organicPromotion: row.organicPromotion === true,
      paidPromotion: row.paidPromotion === true,
      inRecruitment: row.inRecruitment === true,
      projectEnded: row.projectEnded === true,
    })
    setEditor(row)
  }

  const buildSaveBody = (): DomainInput => ({
    domainName: String(form.domainName || '').trim(),
    siteName: String(form.siteName || '').trim() || null,
    status: form.status ?? null,
    purchaseDate: form.purchaseDate ?? null,
    renewalDate: form.renewalDate ?? null,
    owner: form.owner?.trim() || '',
    organicPromotion: form.organicPromotion === true,
    paidPromotion: form.paidPromotion === true,
    inRecruitment: form.inRecruitment === true,
    projectEnded: form.projectEnded === true,
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

  const bulkDeleteSelected = useCallback(async () => {
    setError(null)
    const ids = rowSelection.selectedIds
    try {
      await deleteSelectedIds(ids, deleteDomain)
      setEditor((ed) => (ed && ed !== 'new' && ids.has(ed.id) ? null : ed))
      rowSelection.clearSelection()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת דומיינים')
      throw err
    }
  }, [load, rowSelection])

  const handleInlineOwnerChange = async (row: Domain, newOwner: string) => {
    const nextOwner = newOwner.trim()
    if (!row?.id || nextOwner === (row.owner || '').trim()) return
    setOwnerSavingId(row.id)
    setError(null)
    try {
      await patchDomain(row.id, { owner: nextOwner })
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, owner: nextOwner } : r)))
      setEditor((ed) => (ed && ed !== 'new' && ed.id === row.id ? { ...ed, owner: nextOwner } : ed))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון אחראי')
      await load()
    } finally {
      setOwnerSavingId(null)
    }
  }

  const handleInlineFlagChange = async (row: Domain, key: DomainFlagKey, checked: boolean) => {
    if (!row?.id) return
    const savingKey = `${row.id}:${key}`
    setFlagSavingKey(savingKey)
    setError(null)
    try {
      await patchDomain(row.id, { [key]: checked })
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [key]: checked } : r)))
      setEditor((ed) => (ed && ed !== 'new' && ed.id === row.id ? { ...ed, [key]: checked } : ed))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון שדה')
      await load()
    } finally {
      setFlagSavingKey(null)
    }
  }

  const colSpan = 11

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
                      value="itamar"
                      label={domainTabLabel(
                        <PersonIcon sx={{ fontSize: 18, opacity: 0.9 }} />,
                        `דומיינים איתמר (${counts.itamar})`,
                      )}
                    />
                    <Tab
                      value="yonatan"
                      label={domainTabLabel(
                        <PersonIcon sx={{ fontSize: 18, opacity: 0.9 }} />,
                        `דומיינים יונתן (${counts.yonatan})`,
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
                            <CsTableSelectAllHeaderCell
                              pageRows={pageRows}
                              selectedIds={rowSelection.selectedIds}
                              onTogglePage={() => rowSelection.toggleAllOnPage(pageRows)}
                            />
                            <TableCell sortDirection={sort.col === 'domainName' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'domainName'}
                                direction={sort.col === 'domainName' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('domainName')}
                              >
                                שם הדומיין
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={sort.col === 'siteName' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'siteName'}
                                direction={sort.col === 'siteName' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('siteName')}
                              >
                                שם האתר
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
                            <TableCell sortDirection={sort.col === 'owner' ? sort.dir : false}>
                              <TableSortLabel
                                active={sort.col === 'owner'}
                                direction={sort.col === 'owner' ? sort.dir : 'asc'}
                                onClick={() => onSortColumn('owner')}
                              >
                                אחראי
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
                            {DOMAIN_FLAG_COLUMNS.map((col) => (
                              <TableCell key={col.key} align="center" sx={{ whiteSpace: 'nowrap' }}>
                                {col.label}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((row) => {
                            const highlightExpiringThisMonth =
                              tab !== 'expiringThisMonth' && isRenewalThisMonth(row.renewalDate)
                            return (
                            <TableRow
                              key={row.id}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => openEdit(row)}
                            >
                              <CsTableRowCheckboxCell
                                rowId={row.id}
                                selected={rowSelection.isSelected(row.id)}
                                onToggle={rowSelection.toggleRow}
                              />
                              <TableCell
                                title={row.domainName}
                                sx={highlightExpiringThisMonth ? DOMAIN_EXPIRING_THIS_MONTH_HIGHLIGHT_SX : undefined}
                              >
                                {row.domainName || '—'}
                              </TableCell>
                              <TableCell title={row.siteName || undefined}>
                                {row.siteName || '—'}
                              </TableCell>
                              <TableCell>{row.status || '—'}</TableCell>
                              <TableCell
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                sx={{
                                  py: 0.5,
                                  px: 0.5,
                                  verticalAlign: 'middle',
                                  minWidth: 120,
                                }}
                              >
                                <Select
                                  size="small"
                                  value={row.owner || ''}
                                  disabled={ownerSavingId === row.id}
                                  onChange={(e) => void handleInlineOwnerChange(row, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  variant="standard"
                                  disableUnderline
                                  displayEmpty
                                  renderValue={(selected) => {
                                    if (ownerSavingId === row.id) {
                                      return <CircularProgress size={18} />
                                    }
                                    return selected || '—'
                                  }}
                                  sx={{
                                    fontSize: 15,
                                    width: '100%',
                                    direction: 'rtl',
                                    '& .MuiSelect-select': {
                                      py: 0,
                                      textAlign: 'right',
                                      pr: '0 !important',
                                      pl: '18px !important',
                                    },
                                    '& .MuiSelect-icon': {
                                      left: 0,
                                      right: 'auto',
                                    },
                                  }}
                                  MenuProps={DOMAIN_EDITOR_SELECT_MENU_PROPS}
                                >
                                  <MenuItem value="">—</MenuItem>
                                  {row.owner &&
                                  !DOMAIN_OWNER_OPTIONS.includes(row.owner) ? (
                                    <MenuItem value={row.owner}>{row.owner}</MenuItem>
                                  ) : null}
                                  {DOMAIN_OWNER_OPTIONS.map((owner) => (
                                    <MenuItem key={owner} value={owner}>
                                      {owner}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell>{formatDateCell(row.purchaseDate)}</TableCell>
                              <TableCell
                                sx={highlightExpiringThisMonth ? DOMAIN_EXPIRING_THIS_MONTH_HIGHLIGHT_SX : undefined}
                              >
                                {formatDateCell(row.renewalDate)}
                              </TableCell>
                              {DOMAIN_FLAG_COLUMNS.map((col) => {
                                const saving = flagSavingKey === `${row.id}:${col.key}`
                                return (
                                  <TableCell
                                    key={col.key}
                                    align="center"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    sx={{ py: 0.25, px: 0.5 }}
                                  >
                                    {saving ? (
                                      <CircularProgress size={18} />
                                    ) : (
                                      <Checkbox
                                        size="small"
                                        checked={row[col.key] === true}
                                        onChange={(e) =>
                                          void handleInlineFlagChange(row, col.key, e.target.checked)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        slotProps={{ input: { 'aria-label': col.label } }}
                                      />
                                    )}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                            )
                          })}
                          {displayRows.length === 0 ? (
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

      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} maxWidth="sm" fullWidth>
        <CsDialogTitleWithMenu
          heading={editor === 'new' ? 'דומיין חדש' : `דומיין #${(editor as Domain)?.id}`}
          onClose={() => !saving && setEditor(null)}
          closeDisabled={saving}
          onRequestDelete={editor && editor !== 'new' ? () => void remove() : undefined}
          menuDisabled={saving}
        />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, direction: 'rtl', textAlign: 'right' }}>
          <DomainField label="שם הדומיין">
            <TextField
              value={form.domainName || ''}
              onChange={(e) => setForm((f) => ({ ...f, domainName: e.target.value }))}
              fullWidth
              required
              sx={DOMAIN_EDITOR_RTL_FIELD_SX}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
          </DomainField>
          <DomainField label="שם האתר">
            <TextField
              value={form.siteName || ''}
              onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
              fullWidth
              sx={DOMAIN_EDITOR_RTL_FIELD_SX}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
          </DomainField>
          <DomainField label="סטטוס">
            <TextField
              select
              value={form.status || ''}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value || null }))}
              fullWidth
              sx={DOMAIN_EDITOR_RTL_FIELD_SX}
              slotProps={{
                select: {
                  displayEmpty: true,
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
          </DomainField>
          <DomainDateField
            label="תאריך רכישה"
            value={form.purchaseDate}
            onChange={(next) => setForm((f) => ({ ...f, purchaseDate: next }))}
          />
          <DomainDateField
            label="תאריך חידוש"
            value={form.renewalDate}
            onChange={(next) => setForm((f) => ({ ...f, renewalDate: next }))}
          />
          <DomainField label="אחראי">
            <TextField
              select
              value={form.owner || ''}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              fullWidth
              sx={DOMAIN_EDITOR_RTL_FIELD_SX}
              slotProps={{
                select: {
                  displayEmpty: true,
                  MenuProps: DOMAIN_EDITOR_SELECT_MENU_PROPS,
                },
              }}
            >
              <MenuItem value="">—</MenuItem>
              {DOMAIN_OWNER_OPTIONS.map((owner) => (
                <MenuItem key={owner} value={owner}>
                  {owner}
                </MenuItem>
              ))}
            </TextField>
          </DomainField>
          <Stack spacing={0.5} sx={{ direction: 'rtl' }}>
            {DOMAIN_FLAG_COLUMNS.map((col) => (
              <FormControlLabel
                key={col.key}
                control={
                  <Checkbox
                    checked={form[col.key] === true}
                    onChange={(e) => setForm((f) => ({ ...f, [col.key]: e.target.checked }))}
                  />
                }
                label={col.label}
                sx={{
                  mr: 0,
                  ml: 0,
                  direction: 'rtl',
                  '& .MuiFormControlLabel-label': { textAlign: 'right' },
                }}
              />
            ))}
          </Stack>
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

      <CsTableSelectionBar
        open={rowSelection.selectedCount > 0}
        selectedCount={rowSelection.selectedCount}
        onClear={rowSelection.clearSelection}
      >
        <CsTableSelectionDeleteButton
          selectedCount={rowSelection.selectedCount}
          entityLabel="דומיינים"
          onDelete={bulkDeleteSelected}
        />
      </CsTableSelectionBar>
    </>
  )
}
