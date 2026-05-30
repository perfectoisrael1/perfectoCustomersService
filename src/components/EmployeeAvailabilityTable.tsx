import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material'
import StopIcon from '@mui/icons-material/Stop'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { useAuth } from '../context/useAuth'
import { getPerfectoCustomerServiceUsers } from '../api/csApi'
import {
  createSuperadminManualAttendance,
  listAllAttendanceToday,
  startAttendance,
  updateAttendance,
  uploadAttendanceAttachment,
  type AttendanceRecord,
} from '../api/attendanceApi'
import { getIsraelDateStamp } from '../lib/israelTime'
import {
  ATTENDANCE_DELAY_SHORTAGE_OPTIONS,
  ATTENDANCE_STATUS_EXIT_END_OF_DAY,
  buildAttendanceDisplayRowsFromApi,
  formatTime,
  getAvailabilityStatusLabel,
  isActive,
  isAdminOrSuperadminRole,
  isEndOfDayExitStatus,
  listAttendancePeersForResponsible,
  sumDailyElapsedForResponsible,
} from '../lib/attendanceUtils'

type Props = { canManageAvailability: boolean }

export default function EmployeeAvailabilityTable({ canManageAvailability }: Props) {
  const { token, user } = useAuth()
  const [availabilityDate, setAvailabilityDate] = useState(() => getIsraelDateStamp())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawAttendanceRows, setRawAttendanceRows] = useState<AttendanceRecord[]>([])
  const [csUsers, setCsUsers] = useState<Array<{ id: number; fullName?: string; username?: string; status?: string }>>([])
  const [liveTick, setLiveTick] = useState(0)
  const [stoppingId, setStoppingId] = useState<number | null>(null)
  const [manualKinds, setManualKinds] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadRef = useRef<AttendanceRecord | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!token) return
    try {
      const data = await getPerfectoCustomerServiceUsers()
      setCsUsers(Array.isArray(data) ? data : [])
    } catch {
      setCsUsers([])
    }
  }, [token])

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await listAllAttendanceToday(token, availabilityDate)
      const arr = Array.isArray(data) ? data : []
      setRawAttendanceRows(arr)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת זמינות')
      setRawAttendanceRows([])
    } finally {
      setLoading(false)
    }
  }, [token, availabilityDate])

  useEffect(() => {
    void Promise.all([fetchData(), fetchUsers()])
  }, [fetchData, fetchUsers])

  const isViewingToday = availabilityDate === getIsraelDateStamp()

  useEffect(() => {
    if (!isViewingToday) return
    const poll = setInterval(() => void fetchData(), 30000)
    return () => clearInterval(poll)
  }, [fetchData, isViewingToday])

  useEffect(() => {
    if (!isViewingToday) return
    const id = setInterval(() => setLiveTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isViewingToday])

  const displayRows = useMemo(() => {
    void liveTick
    return buildAttendanceDisplayRowsFromApi(rawAttendanceRows, csUsers, availabilityDate, getIsraelDateStamp())
  }, [rawAttendanceRows, csUsers, availabilityDate, liveTick])

  const handleStop = async (record: AttendanceRecord) => {
    if (!record?.id || stoppingId) return
    setStoppingId(record.id)
    try {
      await updateAttendance(record.id, { isRunning: false, attendanceStatus: 'הפסקה' }, token)
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בעצירה')
    } finally {
      setStoppingId(null)
    }
  }

  const handleStart = async (record: AttendanceRecord) => {
    const name = String(record.responsible || '').trim()
    if (!name) return
    try {
      if (record.virtual) {
        await startAttendance(name, token)
      } else if (record.id) {
        await updateAttendance(record.id, { isRunning: true, attendanceStatus: 'פעיל' }, token)
      }
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בהפעלה')
    }
  }

  const handleEndOfDay = async (record: AttendanceRecord) => {
    if (!record?.id) return
    const peers = listAttendancePeersForResponsible(rawAttendanceRows, record.responsible || '')
    if (peers.some((p) => isEndOfDayExitStatus(String(p.attendanceStatus ?? p.attendance_status)))) return
    try {
      const payload = isActive(record)
        ? { isRunning: false, attendanceStatus: ATTENDANCE_STATUS_EXIT_END_OF_DAY }
        : { attendanceStatus: ATTENDANCE_STATUS_EXIT_END_OF_DAY }
      await updateAttendance(record.id, payload, token)
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בסיום יום')
    }
  }

  const handleBonusBlur = async (record: AttendanceRecord, raw: string) => {
    if (!canManageAvailability || !record?.id) return
    const v = Math.max(0, Math.trunc(Number(raw)) || 0)
    const current = Math.trunc(Number(record.bonus) || 0)
    if (v === current) return
    try {
      await updateAttendance(record.id, { bonus: v }, token)
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בעדכון בונוס')
    }
  }

  const handleEventType = async (record: AttendanceRecord, value: string) => {
    if (!canManageAvailability || record.virtual) return
    if (record.id) {
      try {
        await updateAttendance(record.id, { eventType: value || null }, token)
        await fetchData()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'שגיאה')
      }
      return
    }
    const key = `v-${record.csUserId}`
    if (!value) {
      setManualKinds((prev) => ({ ...prev, [key]: '' }))
      return
    }
    try {
      await createSuperadminManualAttendance(token, {
        responsible: String(record.responsible || ''),
        date: availabilityDate,
        eventType: value,
      })
      setManualKinds((prev) => ({ ...prev, [key]: '' }))
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  const handleAdminNoteBlur = async (record: AttendanceRecord, raw: string) => {
    if (!canManageAvailability || !record?.id) return
    const v = raw.trim()
    const current = String(record.adminNote ?? record.admin_note ?? '').trim()
    if (v === current) return
    try {
      await updateAttendance(record.id, { adminNote: v || null }, token)
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  const openFilePicker = (record: AttendanceRecord) => {
    pendingUploadRef.current = record
    fileInputRef.current?.click()
  }

  if (!canManageAvailability && !isAdminOrSuperadminRole(user?.role)) {
    return <Alert severity="info">אין הרשאה לצפות בזמינות עובדים</Alert>
  }

  return (
    <Box sx={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          type="date"
          label="תאריך"
          size="small"
          value={availabilityDate}
          onChange={(e) => setAvailabilityDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button variant="outlined" disabled={loading} onClick={() => void fetchData()}>
          {loading ? 'טוען...' : 'רענון'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const record = pendingUploadRef.current
          const file = e.target.files?.[0]
          e.target.value = ''
          pendingUploadRef.current = null
          if (!record?.id || !file) return
          try {
            await uploadAttendanceAttachment(record.id, file, token, availabilityDate)
            await fetchData()
          } catch (err) {
            alert(err instanceof Error ? err.message : 'שגיאה בהעלאה')
          }
        }}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>עובד</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>טיימר</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>סטטוס</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>בונוס</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>איחור/חיסור</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>הערת מנהל</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>קובץ</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.map((r) => {
              const key = r.virtual ? `v-${r.csUserId}` : String(r.id)
              const sec = r.virtual ? 0 : sumDailyElapsedForResponsible(rawAttendanceRows, r.responsible || '')
              const statusLabel = getAvailabilityStatusLabel(r, rawAttendanceRows)
              const fileUrl = String(r.fileAttachmentUrl ?? r.file_attachment_url ?? '').trim()
              const active = isActive(r)
              return (
                <TableRow key={key} sx={{ bgcolor: active ? 'rgba(255, 221, 0, 0.12)' : undefined }}>
                  <TableCell>{r.responsible || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatTime(sec)}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabel}
                      size="small"
                      color={active ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    {canManageAvailability && !r.virtual && r.id ? (
                      <TextField
                        size="small"
                        type="number"
                        defaultValue={Math.trunc(Number(r.bonus) || 0)}
                        onBlur={(e) => void handleBonusBlur(r, e.target.value)}
                        sx={{ width: 72 }}
                      />
                    ) : (
                      Math.trunc(Number(r.bonus) || 0)
                    )}
                  </TableCell>
                  <TableCell>
                    {canManageAvailability ? (
                      <Select
                        size="small"
                        displayEmpty
                        value={
                          r.virtual
                            ? manualKinds[`v-${r.csUserId}`] || ''
                            : String(r.eventType ?? r.event_type ?? '')
                        }
                        onChange={(e) => void handleEventType(r, String(e.target.value))}
                        sx={{ minWidth: 160 }}
                      >
                        <MenuItem value="">—</MenuItem>
                        {ATTENDANCE_DELAY_SHORTAGE_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    ) : (
                      String(r.eventType ?? r.event_type ?? '—')
                    )}
                  </TableCell>
                  <TableCell>
                    {canManageAvailability && !r.virtual && r.id ? (
                      <TextField
                        size="small"
                        defaultValue={String(r.adminNote ?? r.admin_note ?? '')}
                        onBlur={(e) => void handleAdminNoteBlur(r, e.target.value)}
                        sx={{ minWidth: 140 }}
                      />
                    ) : (
                      String(r.adminNote ?? r.admin_note ?? '—')
                    )}
                  </TableCell>
                  <TableCell>
                    {fileUrl ? (
                      <Link href={fileUrl} target="_blank" rel="noopener noreferrer">קובץ</Link>
                    ) : canManageAvailability && !r.virtual && r.id ? (
                      <Tooltip title="העלאת קובץ">
                        <IconButton size="small" onClick={() => openFilePicker(r)}>
                          <AttachFileIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {canManageAvailability && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {active ? (
                          <Tooltip title="עצירה">
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={stoppingId === r.id}
                              onClick={() => void handleStop(r)}
                            >
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="הפעלה">
                            <IconButton size="small" color="success" onClick={() => void handleStart(r)}>
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isEndOfDayExitStatus(statusLabel) && !r.virtual && r.id && (
                          <Tooltip title="יציאה - סוף יום">
                            <IconButton size="small" color="error" onClick={() => void handleEndOfDay(r)}>
                              <ExitToAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {!displayRows.length && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">אין נתונים</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
