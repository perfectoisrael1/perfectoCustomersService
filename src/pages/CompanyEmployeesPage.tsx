import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'
import {
  createPerfectoCustomerServiceUser,
  getPerfectoCustomerServiceUsers,
  patchPerfectoCustomerServiceUser,
  type PerfectoCustomerServiceUser,
} from '../api/csApi'
import {
  COMPANY_EMPLOYEES_FALLBACK_COLUMNS,
  COMPANY_EMPLOYEE_ROLE_OPTIONS,
  COMPANY_EMPLOYEE_STATUS_OPTIONS,
  companyEmployeesColumnHeaderLabel,
  companyEmployeesColumnOrder,
  formatCompanyEmployeeStatusLabel,
  normalizeCompanyEmployeeStatus,
} from './companyEmployeesTableConfig'

/** רוחב מרבי לכל תא בטבלת עובדי חברה (כולל ריפוד — border-box) */
const COMPANY_EMPLOYEES_CELL_MAX_PX = 100

const companyEmployeesNarrowTableCellSx = {
  maxWidth: COMPANY_EMPLOYEES_CELL_MAX_PX,
  width: COMPANY_EMPLOYEES_CELL_MAX_PX,
  minWidth: 0,
  boxSizing: 'border-box' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const companyEmployeesTableSortLabelSx = {
  maxWidth: '100%',
  overflow: 'hidden',
  '& .MuiTableSortLabel-content': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
} as const

/** עמודות שלא להציג (סיסמה / גיבוב) ולא להעביר בטופס ברירת מחדל */
function isSensitiveKey(k: string): boolean {
  const lower = k.toLowerCase()
  return (
    lower === 'password'
    || lower.includes('password')
    || lower.includes('hash')
    || lower.endsWith('_hash')
    || lower === 'jwt'
    || lower === 'token'
    || lower === 'otp'
  )
}

function formatCellValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function isStructuredJsonField(originalRow: PerfectoCustomerServiceUser | null, k: string): boolean {
  if (!originalRow || k === 'password') return false
  const v = (originalRow as Record<string, unknown>)[k]
  return v !== null && typeof v === 'object'
}

function formatTableCellValue(row: PerfectoCustomerServiceUser, col: string): string {
  const raw = (row as Record<string, unknown>)[col]
  if (col === 'status') return formatCompanyEmployeeStatusLabel(raw)
  return formatCellValue(raw)
}

export default function CompanyEmployeesPage() {
  const theme = useTheme()
  const [rows, setRows] = useState<PerfectoCustomerServiceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<PerfectoCustomerServiceUser | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [originalRow, setOriginalRow] = useState<PerfectoCustomerServiceUser | null>(null)

  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'id', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getPerfectoCustomerServiceUsers()
      setRows(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת עובדי חברה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columnsFromData = useMemo(() => {
    const ks = new Set<string>()
    for (const r of rows) {
      for (const k of Object.keys(r)) {
        if (!isSensitiveKey(k)) ks.add(k)
      }
    }
    return companyEmployeesColumnOrder(Array.from(ks))
  }, [rows])

  const tableColumns = useMemo(
    () =>
      columnsFromData.length > 0
        ? columnsFromData
        : [...COMPANY_EMPLOYEES_FALLBACK_COLUMNS],
    [columnsFromData],
  )

  useEffect(() => {
    if (!tableColumns.includes(sort.col)) {
      const nextCol = tableColumns.includes('id') ? 'id' : (tableColumns[0] ?? 'id')
      setSort({ col: nextCol, dir: 'asc' })
    }
  }, [tableColumns, sort.col])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const colsToSearch =
        columnsFromData.length > 0
          ? columnsFromData
          : (Object.keys(r).filter((k) => !isSensitiveKey(k)) as string[])
      const blob = colsToSearch
        .map((col) => formatTableCellValue(r, col))
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [rows, query, columnsFromData])

  useEffect(() => {
    setPage(0)
  }, [query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const col = sort.col
    const list = [...filtered]
    list.sort((a, b) => {
      const va = formatTableCellValue(a, col)
      const vb = formatTableCellValue(b, col)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback(
    (col: string) => {
      setSort((prev) =>
        prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
      )
    },
    [],
  )

  const openNew = () => {
    setOriginalRow(null)
    setFieldValues({
      username: '',
      fullName: '',
      password: '',
      role: '',
    })
    setEditor('new')
  }

  const openEdit = (row: PerfectoCustomerServiceUser) => {
    setOriginalRow(row)
    const next: Record<string, string> = {}
    for (const k of Object.keys(row)) {
      if (k === 'id' || isSensitiveKey(k)) continue
      if (k === 'status') {
        next[k] = normalizeCompanyEmployeeStatus((row as Record<string, unknown>)[k])
        continue
      }
      next[k] = formatCellValue((row as Record<string, unknown>)[k]).replace(/^—$/, '')
    }
    next.password = ''
    setFieldValues(next)
    setEditor(row)
  }

  const closeDialog = () => {
    setEditor(null)
    setFieldValues({})
    setOriginalRow(null)
  }

  const buildPatchBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {}
    const source = originalRow
    const keys =
      editor === 'new'
        ? Object.keys(fieldValues).filter((k) => !isSensitiveKey(k) || k === 'password')
        : Object.keys(fieldValues)

    for (const k of keys) {
      if (k === 'id') continue
      if (editor !== 'new' && isSensitiveKey(k) && k !== 'password') continue
      const raw = fieldValues[k]
      const trimmed = raw?.trim() ?? ''

      if (editor !== 'new' && k === 'password' && !trimmed) continue

      if (editor === 'new' && k !== 'password' && !trimmed) {
        continue
      }

      let prevUnknown: unknown
      if (source && k in source) prevUnknown = (source as Record<string, unknown>)[k]

      if (trimmed === '' && prevUnknown !== undefined && prevUnknown !== null) {
        body[k] = null
        continue
      }
      if (trimmed === '' && prevUnknown == null && k !== 'password') {
        continue
      }

      if (prevUnknown !== undefined && typeof prevUnknown === 'number' && trimmed !== '') {
        const num = Number(trimmed)
        if (!Number.isNaN(num)) {
          body[k] = num
          continue
        }
      }

      if (prevUnknown !== undefined && typeof prevUnknown === 'boolean') {
        if (trimmed === 'true') body[k] = true
        else if (trimmed === 'false') body[k] = false
        else if (trimmed === '') body[k] = null
        else body[k] = trimmed
        continue
      }

      if (prevUnknown !== undefined && prevUnknown !== null && typeof prevUnknown === 'object') {
        try {
          body[k] = JSON.parse(trimmed)
        } catch {
          throw new Error(`שדה «${k}» אינו JSON תקין`)
        }
        continue
      }

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          body[k] = JSON.parse(trimmed)
          continue
        } catch {
          /* fall through — treat as string */
        }
      }

      body[k] = trimmed
    }

    return body
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editor === 'new') {
        const u = fieldValues.username?.trim()
        const p = fieldValues.password?.trim()
        if (!u) throw new Error('שם משתמש נדרש')
        if (!p) throw new Error('סיסמה נדרשת ליצירת משתמש')
        if (!fieldValues.role?.trim()) throw new Error('תפקיד נדרש')
        await createPerfectoCustomerServiceUser(buildPatchBody())
      } else if (editor) {
        await patchPerfectoCustomerServiceUser(editor.id, buildPatchBody())
      }
      closeDialog()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const dialogTitle = editor === 'new' ? 'עובד חדש' : editor ? 'עריכת עובד' : ''

  const sortedEditKeys =
    editor === 'new'
      ? ['username', 'fullName', 'password', 'role']
      : companyEmployeesColumnOrder(
        [...new Set([...columnsFromData.filter((c) => c !== 'id'), 'password', 'role'])].filter(
          (k) => !isSensitiveKey(k) || k === 'password',
        ),
      )

  const heLabelForKey = (k: string) => {
    if (k === 'password') {
      return editor === 'new' ? 'סיסמה' : 'סיסמה חדשה (ריק = ללא שינוי)'
    }
    return companyEmployeesColumnHeaderLabel(k)
  }

  /** שדות בדיאלוג עובד — תווית וטקסט מימין לשמאל (RTL) */
  const employeeDialogTextFieldSx = {
    direction: 'rtl' as const,
    '& .MuiInputLabel-root': {
      right: 26,
      left: 'auto',
      transformOrigin: 'top right',
    },
    '& .MuiInputLabel-shrink': {
      transform: 'translate(-0.5px, -9px) scale(0.75)',
      transformOrigin: 'top right',
    },
    '& .MuiOutlinedInput-notchedOutline legend': {
      marginInlineEnd: '2px',
    },
    '& .MuiOutlinedInput-root': { direction: 'rtl' as const },
    '& .MuiInputBase-input': { textAlign: 'right', direction: 'rtl' as const },
    '& .MuiInputBase-inputMultiline': { textAlign: 'right', direction: 'rtl' as const },
    '& .MuiFormHelperText-root': { direction: 'rtl' as const, textAlign: 'right', marginRight: '2px' },
  } as const

  const employeeDialogSelectSx = {
    ...employeeDialogTextFieldSx,
    '& .MuiSelect-select': { textAlign: 'right', direction: 'rtl' as const },
    '& .MuiSelect-icon': { left: 8, right: 'auto' },
  } as const

  const colSpan = tableColumns.length + 1

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
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    direction: 'ltr',
                    width: '100%',
                    py: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
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
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ whiteSpace: 'nowrap' }}>
                    חדש
                  </Button>
                </Box>
                {!loading ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', pt: 0.75 }}>
                    סך עובדי חברה: <strong>{rows.length}</strong>
                    {query.trim()
                      ? ` · מוצגים לאחר חיפוש: ${sortedRows.length}`
                      : null}
                  </Typography>
                ) : null}
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
                    <Table
                      stickyHeader
                      size="small"
                      dir="rtl"
                      sx={[
                        csDataTableSx(theme),
                        {
                          tableLayout: 'fixed',
                          minWidth: 0,
                        },
                      ]}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, ...companyEmployeesNarrowTableCellSx }}>פעולות</TableCell>
                          {tableColumns.map((col) => (
                            <TableCell
                              key={col}
                              sortDirection={sort.col === col ? sort.dir : false}
                              sx={{ fontWeight: 800, whiteSpace: 'nowrap', ...companyEmployeesNarrowTableCellSx }}
                            >
                              <TableSortLabel
                                active={sort.col === col}
                                direction={sort.col === col ? sort.dir : 'asc'}
                                onClick={() => onSortColumn(col)}
                                sx={companyEmployeesTableSortLabelSx}
                              >
                                {companyEmployeesColumnHeaderLabel(col)}
                              </TableSortLabel>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell sx={{ ...companyEmployeesNarrowTableCellSx, whiteSpace: 'nowrap' }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => openEdit(row)}
                                sx={{ minWidth: 0, px: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                עריכה
                              </Button>
                            </TableCell>
                            {tableColumns.map((col) => (
                              <TableCell key={col} sx={companyEmployeesNarrowTableCellSx}>
                                {(row as Record<string, unknown>)[col] !== undefined
                                  ? formatTableCellValue(row, col)
                                  : '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
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

      <Dialog open={editor != null} onClose={() => (!saving ? closeDialog() : undefined)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, direction: 'rtl' }}>
          <Typography sx={{ flex: 1, textAlign: 'right' }}>{dialogTitle}</Typography>
          <IconButton aria-label="סגירה" onClick={() => !saving && closeDialog()} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1, textAlign: 'right' }}>
            {editor !== 'new' && editor ? (
              <TextField
                label="מזהה"
                value={String(editor.id)}
                disabled
                size="small"
                fullWidth
                sx={employeeDialogTextFieldSx}
                slotProps={{ htmlInput: { dir: 'rtl' } }}
              />
            ) : null}
            {sortedEditKeys.map((k) =>
              k === 'role' ? (
                <FormControl
                  key={k}
                  fullWidth
                  size="small"
                  required={editor === 'new'}
                  sx={employeeDialogSelectSx}
                >
                  <InputLabel id={`company-employee-field-${k}`}>{heLabelForKey(k)}</InputLabel>
                  <Select
                    labelId={`company-employee-field-${k}`}
                    id={`company-employee-field-${k}-select`}
                    label={heLabelForKey(k)}
                    value={fieldValues[k] ?? ''}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [k]: String(e.target.value) }))
                    }
                    displayEmpty={editor === 'new'}
                  >
                    {editor === 'new' ? (
                      <MenuItem value="">
                        <em>בחר תפקיד</em>
                      </MenuItem>
                    ) : null}
                    {COMPANY_EMPLOYEE_ROLE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : k === 'status' ? (
                <FormControl key={k} fullWidth size="small" required sx={employeeDialogSelectSx}>
                  <InputLabel id={`company-employee-field-${k}`}>{heLabelForKey(k)}</InputLabel>
                  <Select
                    labelId={`company-employee-field-${k}`}
                    id={`company-employee-field-${k}-select`}
                    label={heLabelForKey(k)}
                    value={fieldValues[k] ?? 'active'}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [k]: String(e.target.value) }))
                    }
                  >
                    {COMPANY_EMPLOYEE_STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  key={k}
                  label={heLabelForKey(k)}
                  value={fieldValues[k] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [k]: e.target.value }))}
                  size="small"
                  fullWidth
                  type={k === 'password' ? 'password' : 'text'}
                  multiline={isStructuredJsonField(originalRow, k)}
                  minRows={isStructuredJsonField(originalRow, k) ? 3 : 1}
                  helperText={isStructuredJsonField(originalRow, k) ? 'JSON' : undefined}
                  sx={employeeDialogTextFieldSx}
                  slotProps={{ htmlInput: { dir: 'rtl' } }}
                />
              ),
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap', direction: 'rtl' }}>
          <Button onClick={() => !saving && closeDialog()}>ביטול</Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? 'שומר…' : 'שמירה'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
