import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CloseIcon from '@mui/icons-material/Close'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  deleteUserPayslip,
  getPerfectoCustomerServiceUsers,
  uploadUserPayslipMonthYear,
  type PerfectoCustomerServiceUser,
} from '../../api/csApi'
import { useAuth } from '../../context/useAuth'
import { csDataTableSx } from '../../lib/csTableUi'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'
import {
  buildPayslipUploadMonthOptions,
  downloadPayslipUrl,
  getPayslipDownloadFilename,
  getPreviousMonthYear,
  monthYearLabelFromPayslipUrl,
} from '../../lib/payslipsUi'

type DocsMenuState = {
  anchorEl: HTMLElement
  userId: number
  payslipUrl: string
} | null

export default function PayslipsDashboardPanel() {
  const theme = useTheme()
  const { token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [users, setUsers] = useState<PerfectoCustomerServiceUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState('')
  const [payslipUploadMonthYear, setPayslipUploadMonthYear] = useState(() => getPreviousMonthYear())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [docsMenu, setDocsMenu] = useState<DocsMenuState>(null)
  const [docsRowBusyId, setDocsRowBusyId] = useState<number | null>(null)
  const [docsError, setDocsError] = useState<string | null>(null)

  const payslipUploadMonthOptions = useMemo(() => buildPayslipUploadMonthOptions(48), [])

  const loadUsers = useCallback(async () => {
    if (!token) return
    setUsersLoading(true)
    setLoadError(null)
    try {
      setUsers(await getPerfectoCustomerServiceUsers())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'שגיאה בטעינת עובדים')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const usersForSelect = useMemo(
    () =>
      [...users].sort((a, b) =>
        String(a.fullName || a.username || '').localeCompare(
          String(b.fullName || b.username || ''),
          'he',
          { sensitivity: 'base' },
        ),
      ),
    [users],
  )

  const usersWithPayslipForMonth = useMemo(() => {
    return usersForSelect.filter((u) => {
      const urls = u.payslipsUrls || []
      return urls.some((url) => typeof url === 'string' && url.includes(payslipUploadMonthYear))
    })
  }, [usersForSelect, payslipUploadMonthYear])

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!selectedUserId || !selectedFile || !token) {
      setUploadError('חובה לבחור עובד ולצרף קובץ')
      return
    }
    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)
    try {
      await uploadUserPayslipMonthYear(
        Number(selectedUserId),
        selectedFile,
        payslipUploadMonthYear,
        token,
      )
      setUploadSuccess(true)
      setSelectedFile(null)
      setSelectedUserId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadUsers()
      window.setTimeout(() => setUploadSuccess(false), 4000)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'ההעלאה נכשלה')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePayslip = async (userId: number, payslipUrl: string) => {
    if (!token) return
    const label = monthYearLabelFromPayslipUrl(payslipUrl)
    if (!window.confirm(`למחוק את התלוש ${label}?`)) return
    setDocsError(null)
    setDocsRowBusyId(userId)
    try {
      await deleteUserPayslip(userId, payslipUrl, token)
      await loadUsers()
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'לא ניתן למחוק את התלוש')
    } finally {
      setDocsRowBusyId(null)
      setDocsMenu(null)
    }
  }

  const loading = usersLoading

  return (
    <Box
      sx={{
        mt: `${GAP_BELOW_INNER_NAV_PX}px`,
        direction: 'rtl',
        textAlign: 'right',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 0 }}>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              maxWidth: { md: 360 },
              minWidth: { md: 280 },
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: 14 }}>שם העובד</Typography>
              <FormControl fullWidth size="medium" disabled={usersLoading}>
                <Select
                  value={selectedUserId}
                  displayEmpty
                  onChange={(e) => {
                    setSelectedUserId(e.target.value)
                    setUploadError(null)
                    setUploadSuccess(false)
                  }}
                  sx={{ direction: 'rtl', '& .MuiSelect-select': { textAlign: 'right' } }}
                >
                  <MenuItem value="">{usersLoading ? 'טוען...' : 'בחר עובד'}</MenuItem>
                  {usersForSelect.map((u) => (
                    <MenuItem key={u.id} value={String(u.id)}>
                      {u.fullName || u.username || `משתמש ${u.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: 14 }}>חודש התלוש</Typography>
              <FormControl fullWidth size="medium">
                <Select
                  value={payslipUploadMonthYear}
                  onChange={(e) => {
                    setPayslipUploadMonthYear(e.target.value)
                    setUploadError(null)
                    setUploadSuccess(false)
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                  sx={{ direction: 'rtl', '& .MuiSelect-select': { textAlign: 'right' } }}
                >
                  {payslipUploadMonthOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: 14 }}>קובץ משכורת</Typography>
              <Box
                component="label"
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const f = e.dataTransfer?.files?.[0]
                  if (f) {
                    setSelectedFile(f)
                    setUploadError(null)
                    setUploadSuccess(false)
                  }
                }}
                sx={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 2,
                  px: 2,
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.light' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UploadFileIcon />
                  {selectedFile ? (
                    <Typography variant="body2">{selectedFile.name}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      גרור לכאן תמונה או קובץ PDF
                    </Typography>
                  )}
                </Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setSelectedFile(f)
                      setUploadError(null)
                      setUploadSuccess(false)
                    }
                  }}
                />
              </Box>
              {selectedFile ? (
                <IconButton size="small" onClick={clearSelectedFile} sx={{ mt: 0.5 }} aria-label="הסר קובץ">
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Box>

            {uploadError ? (
              <Typography color="error" sx={{ fontSize: 14 }}>
                {uploadError}
              </Typography>
            ) : null}
            {uploadSuccess ? (
              <Typography color="success.main" sx={{ fontSize: 14 }}>
                הקובץ עלה בהצלחה
              </Typography>
            ) : null}

            <Button
              variant="contained"
              onClick={() => void handleUpload()}
              disabled={isUploading}
              endIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {isUploading ? 'מעלה...' : 'העלאה'}
            </Button>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 2, display: { xs: 'none', md: 'block' } }} />
          <Divider sx={{ my: 2, display: { xs: 'block', md: 'none' } }} />

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              מסמכים שעלו
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              משכורות שהועלו לחודש {payslipUploadMonthYear}
            </Typography>
            {docsError ? (
              <Alert severity="error" onClose={() => setDocsError(null)} sx={{ mb: 1 }}>
                {docsError}
              </Alert>
            ) : null}

            <TableContainer
              sx={{
                maxHeight: 480,
                overflow: 'auto',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Table size="small" stickyHeader dir="rtl" sx={csDataTableSx(theme)}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      שם
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">
                      חודש
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 48 }} align="center">
                      פעולות
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersWithPayslipForMonth.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        אין תלושים לחודש זה
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersWithPayslipForMonth.map((u) => {
                      const matchingUrl = (u.payslipsUrls || []).find(
                        (url) => typeof url === 'string' && url.includes(payslipUploadMonthYear),
                      )
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell align="right">{u.fullName || u.username || '—'}</TableCell>
                          <TableCell align="center">{payslipUploadMonthYear}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              disabled={docsRowBusyId != null || !matchingUrl}
                              onClick={(e) => {
                                if (!matchingUrl) return
                                setDocsMenu({
                                  anchorEl: e.currentTarget,
                                  userId: u.id,
                                  payslipUrl: matchingUrl,
                                })
                              }}
                            >
                              {docsRowBusyId === u.id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <MoreVertIcon fontSize="small" />
                              )}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      <Menu
        anchorEl={docsMenu?.anchorEl ?? null}
        open={Boolean(docsMenu?.anchorEl)}
        onClose={() => setDocsMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem
          disabled={docsRowBusyId != null}
          onClick={() => {
            const m = docsMenu
            if (!m?.payslipUrl) return
            downloadPayslipUrl(m.payslipUrl, getPayslipDownloadFilename(m.payslipUrl))
            setDocsMenu(null)
          }}
        >
          <DownloadIcon fontSize="small" sx={{ ml: 1 }} />
          הורדה
        </MenuItem>
        <MenuItem
          disabled={docsRowBusyId != null}
          onClick={() => {
            const m = docsMenu
            if (!m) return
            void handleDeletePayslip(m.userId, m.payslipUrl)
          }}
        >
          <DeleteIcon fontSize="small" sx={{ ml: 1 }} />
          מחיקה
        </MenuItem>
      </Menu>
    </Box>
  )
}
