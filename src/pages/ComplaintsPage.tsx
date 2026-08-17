import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
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
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'
import MicIcon from '@mui/icons-material/Mic'
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
import { CS_PAGE_FILL_MIN_HEIGHT_CSS } from '../layout/headerLayout'
import { formatCsPhoneDisplay } from '../lib/caliberUi'
import {
  createComplaint,
  deleteComplaint,
  getAccounts,
  getComplaints,
  getComplaintViewUrl,
  patchComplaint,
  uploadComplaintFile,
  uploadComplaintRecording,
  type Account,
  type Complaint,
  type ComplaintInput,
} from '../api/csApi'

type ComplaintsSortColumn =
  | 'complaintId'
  | 'accountId'
  | 'accountName'
  | 'phoneNumber'
  | 'notes'
  | 'createdAt'

function complaintSortValue(row: Complaint, col: ComplaintsSortColumn): string {
  switch (col) {
    case 'complaintId':
      return String(row.complaintId)
    case 'accountId':
      return String(row.accountId)
    case 'accountName':
      return String(row.accountName ?? '')
    case 'phoneNumber':
      return String(row.phoneNumber ?? '')
    case 'notes':
      return String(row.notes ?? '')
    case 'createdAt':
      return row.createdAt ? String(row.createdAt).slice(0, 19) : ''
    default:
      return ''
  }
}

function formatDateTimeCell(value: string | null | undefined): string {
  if (!value) return '—'
  const s = String(value)
  if (s.length >= 16) return s.slice(0, 16).replace('T', ' ')
  return s
}

function accountLabel(a: Account): string {
  const name = String(a.accountName || '').trim()
  const phone = formatCsPhoneDisplay(a.phoneNumber)
  return name ? `${name} (${phone})` : phone || `#${a.id}`
}

export default function ComplaintsPage() {
  const theme = useTheme()
  const [rows, setRows] = useState<Complaint[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Complaint | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ComplaintInput>({ accountId: 0, notes: '' })
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingRecording, setPendingRecording] = useState<File | null>(null)
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recordingInputRef = useRef<HTMLInputElement>(null)

  const [sort, setSort] = useState<{ col: ComplaintsSortColumn; dir: 'asc' | 'desc' }>({
    col: 'complaintId',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const rowSelection = useCsTableSelection({ getRowId: (row) => (row as Complaint).complaintId })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [complaints, accountList] = await Promise.all([getComplaints(), getAccounts()])
      setRows(Array.isArray(complaints) ? complaints : [])
      setAccounts(Array.isArray(accountList) ? accountList : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const blob = [
        r.complaintId,
        r.accountId,
        r.accountName,
        r.phoneNumber,
        r.notes,
        r.createdAt,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [rows, query])

  useEffect(() => {
    setPage(0)
  }, [query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const list = [...filteredRows]
    const { col, dir } = sort
    list.sort((a, b) => {
      const av = complaintSortValue(a, col)
      const bv = complaintSortValue(b, col)
      const cmp = av.localeCompare(bv, 'he', { numeric: true })
      return dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredRows, sort])

  const displayRows = useMemo(
    () =>
      prependSelectedNotInList(sortedRows, rows, rowSelection.selectedIds, (r) => r.complaintId),
    [sortedRows, rows, rowSelection.selectedIds],
  )

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return displayRows.slice(start, start + rowsPerPage)
  }, [displayRows, page, rowsPerPage])

  const toggleSort = (col: ComplaintsSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    )
  }

  const openNew = () => {
    setEditor('new')
    setForm({ accountId: 0, notes: '' })
    setSelectedAccount(null)
    setPendingFile(null)
    setPendingRecording(null)
  }

  const openEdit = (row: Complaint) => {
    setEditor(row)
    setForm({ accountId: row.accountId, notes: row.notes ?? '' })
    const acc =
      accounts.find((a) => a.id === row.accountId) ??
      ({
        id: row.accountId,
        accountName: row.accountName ?? '',
        phoneNumber: row.phoneNumber ?? '',
      } as Account)
    setSelectedAccount(acc)
    setPendingFile(null)
    setPendingRecording(null)
  }

  const closeEditor = () => {
    setEditor(null)
    setPendingFile(null)
    setPendingRecording(null)
  }

  const handleSave = async () => {
    if (!selectedAccount?.id) {
      setError('יש לבחור לקוח')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: ComplaintInput = {
        accountId: selectedAccount.id,
        notes: form.notes?.trim() || null,
      }

      let saved: Complaint
      if (editor === 'new') {
        saved = await createComplaint(payload)
      } else if (editor) {
        saved = await patchComplaint(editor.complaintId, payload)
      } else {
        return
      }

      if (pendingFile) {
        const fileRes = await uploadComplaintFile(saved.complaintId, pendingFile)
        saved = { ...saved, fileUrl: fileRes.url }
      }
      if (pendingRecording) {
        const recRes = await uploadComplaintRecording(saved.complaintId, pendingRecording)
        saved = { ...saved, recordingUrl: recRes.url }
      }

      closeEditor()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOne = async () => {
    if (!editor || editor === 'new') return
    if (!window.confirm('האם אתה בטוח?')) return
    setSaving(true)
    setError(null)
    try {
      await deleteComplaint(editor.complaintId)
      closeEditor()
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
      await deleteSelectedIds(ids, deleteComplaint)
      setEditor((ed) =>
        ed && ed !== 'new' && ids.has(ed.complaintId) ? null : ed,
      )
      rowSelection.clearSelection()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    }
  }, [load, rowSelection])

  const openComplaintAttachment = useCallback(
    async (complaintId: number, kind: 'file' | 'recording') => {
      const key = `${complaintId}:${kind}`
      setOpeningAttachment(key)
      setError(null)
      try {
        const { url } = await getComplaintViewUrl(complaintId, kind)
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בפתיחת הקובץ')
      } finally {
        setOpeningAttachment((prev) => (prev === key ? null : prev))
      }
    },
    [],
  )

  const sortHeader = (col: ComplaintsSortColumn, label: string) => (
    <TableCell key={col}>
      <TableSortLabel
        active={sort.col === col}
        direction={sort.col === col ? sort.dir : 'asc'}
        onClick={() => toggleSort(col)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )

  return (
    <>
      <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
        <Card
          sx={{
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            minHeight: CS_PAGE_FILL_MIN_HEIGHT_CSS,
          }}
        >
          <CardContent sx={{ px: 2, pb: 2, pt: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  תלונות
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                    תלונה חדשה
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => void load()}
                    sx={{ backgroundColor: '#1565c0', color: '#fff' }}
                  >
                    רענון
                  </Button>
                  <TextField
                    size="small"
                    placeholder="חיפוש..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ minWidth: 220 }}
                  />
                </Box>
              </Box>

              {error ? <Alert severity="error">{error}</Alert> : null}

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={csPagedTableOuterBoxSx(theme)}>
                  <CsTableContainer sx={csTableInnerPagedScrollSx}>
                    <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
                      <TableHead>
                        <TableRow>
                          <CsTableSelectAllHeaderCell
                            pageRows={pageRows}
                            getRowId={(r) => (r as Complaint).complaintId}
                            selectedIds={rowSelection.selectedIds}
                            onTogglePage={() => rowSelection.toggleAllOnPage(pageRows)}
                          />
                          {sortHeader('complaintId', '#')}
                          {sortHeader('accountId', 'מס׳ לקוח')}
                          {sortHeader('accountName', 'שם לקוח')}
                          {sortHeader('phoneNumber', 'טלפון')}
                          {sortHeader('notes', 'הערות')}
                          <TableCell>קובץ</TableCell>
                          <TableCell>הקלטה</TableCell>
                          {sortHeader('createdAt', 'תאריך')}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              אין תלונות
                            </TableCell>
                          </TableRow>
                        ) : (
                          pageRows.map((row) => (
                            <TableRow
                              key={row.complaintId}
                              hover
                              selected={rowSelection.isSelected(row.complaintId)}
                              onClick={() => openEdit(row)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <CsTableRowCheckboxCell
                                rowId={row.complaintId}
                                selected={rowSelection.isSelected(row.complaintId)}
                                onToggle={rowSelection.toggleRow}
                              />
                              <TableCell>{row.complaintId}</TableCell>
                              <TableCell>{row.accountId}</TableCell>
                              <TableCell>{row.accountName || '—'}</TableCell>
                              <TableCell>{formatCsPhoneDisplay(row.phoneNumber) || '—'}</TableCell>
                              <TableCell sx={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {row.notes || '—'}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {row.fileUrl ? (
                                  <Button
                                    size="small"
                                    variant="text"
                                    disabled={openingAttachment === `${row.complaintId}:file`}
                                    onClick={() => void openComplaintAttachment(row.complaintId, 'file')}
                                  >
                                    {openingAttachment === `${row.complaintId}:file` ? '…' : 'צפייה'}
                                  </Button>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {row.recordingUrl ? (
                                  <Button
                                    size="small"
                                    variant="text"
                                    disabled={openingAttachment === `${row.complaintId}:recording`}
                                    onClick={() => void openComplaintAttachment(row.complaintId, 'recording')}
                                  >
                                    {openingAttachment === `${row.complaintId}:recording` ? '…' : 'האזנה'}
                                  </Button>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell>{formatDateTimeCell(row.createdAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
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
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={editor !== null} onClose={closeEditor} maxWidth="sm" fullWidth dir="rtl">
        <CsDialogTitleWithMenu
          heading={editor === 'new' ? 'תלונה חדשה' : `תלונה #${editor?.complaintId ?? ''}`}
          onClose={closeEditor}
          onRequestDelete={editor !== 'new' ? () => void handleDeleteOne() : undefined}
          menuDisabled={saving}
          closeDisabled={saving}
        />
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              options={accounts}
              value={selectedAccount}
              onChange={(_e, val) => {
                setSelectedAccount(val)
                setForm((f) => ({ ...f, accountId: val?.id ?? 0 }))
              }}
              getOptionLabel={accountLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="לקוח" required placeholder="חיפוש לפי שם או טלפון" />
              )}
              noOptionsText="לא נמצא"
            />
            <TextField
              label="הערות"
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              multiline
              minRows={4}
              fullWidth
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                קובץ
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {pendingFile ? pendingFile.name : editor !== 'new' && editor?.fileUrl ? 'החלף קובץ' : 'העלאת קובץ'}
                </Button>
                {pendingFile ? (
                  <IconButton size="small" onClick={() => setPendingFile(null)} aria-label="הסר קובץ">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Stack>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                הקלטה
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<MicIcon />}
                  onClick={() => recordingInputRef.current?.click()}
                >
                  {pendingRecording
                    ? pendingRecording.name
                    : editor !== 'new' && editor?.recordingUrl
                      ? 'החלף הקלטה'
                      : 'העלאת הקלטה'}
                </Button>
                {pendingRecording ? (
                  <IconButton size="small" onClick={() => setPendingRecording(null)} aria-label="הסר הקלטה">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Stack>
              <input
                ref={recordingInputRef}
                type="file"
                hidden
                accept="audio/*,video/*"
                onChange={(e) => setPendingRecording(e.target.files?.[0] ?? null)}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeEditor} disabled={saving}>
            ביטול
          </Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving || !selectedAccount}>
            {saving ? <CircularProgress size={22} /> : 'שמירה'}
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
          entityLabel="תלונות"
          onDelete={bulkDeleteSelected}
        />
      </CsTableSelectionBar>
    </>
  )
}
