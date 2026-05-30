import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  Snackbar,
  Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useAuth } from '../context/useAuth'
import {
  getTodayAttendance,
  startAttendance,
  updateAttendance,
  type AttendanceRecord,
} from '../api/attendanceApi'
import {
  ATTENDANCE_STATUS_EXIT_END_OF_DAY,
  checkIsRunning,
  formatTime,
  isEndOfDayExitStatus,
  resolveAttendanceResponsible,
} from '../lib/attendanceUtils'

const RESPONSIBLE_KEY = 'perfectoCustomerServiceResponsible'
const BREAK_EXIT_LOADING_GREY = '#757575'

const STOPPING_MESSAGES = ['עבודה טובה היום!', 'נתראה מחר!', 'המשך יום נעים!', 'מנוחה נעימה!']

function getIsraelHour() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: 'numeric',
    hour12: false,
  })
  return parseInt(formatter.format(new Date()), 10)
}

function getGreetingMessage(type: 'start' | 'stop' = 'start') {
  if (type === 'stop') return STOPPING_MESSAGES[Math.floor(Math.random() * STOPPING_MESSAGES.length)]
  const hour = getIsraelHour()
  if (hour >= 5 && hour < 12) return 'בוקר טוב'
  if (hour >= 12 && hour < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

export function checkAttendanceIsRunning(record: Parameters<typeof checkIsRunning>[0]) {
  return checkIsRunning(record)
}

export default function AttendancePage() {
  const { token, user } = useAuth()
  const [active, setActive] = useState<AttendanceRecord | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('')
  const [pulse, setPulse] = useState(false)
  const [breakExitPending, setBreakExitPending] = useState<string | null>(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [lunchClockTick, setLunchClockTick] = useState(0)
  const fetchGenRef = useRef(0)

  const responsible = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(RESPONSIBLE_KEY)
      if (stored?.trim()) return stored.trim()
    }
    return resolveAttendanceResponsible(user)
  }, [user])

  const userName = responsible.split(/\s+/)[0] || responsible

  useEffect(() => {
    const name = (user?.fullName || user?.username || '').trim()
    if (name && typeof window !== 'undefined') {
      window.localStorage.setItem(RESPONSIBLE_KEY, name)
    }
    setGreeting(getGreetingMessage('start'))
  }, [user?.fullName, user?.username])

  const calculateSeconds = useCallback((record: AttendanceRecord | null) => {
    if (!record) return 0
    const total = Number(record.totalSeconds ?? record.total_seconds) || 0
    if (!checkIsRunning(record)) return total
    const lastStart = record.lastStartTime ?? record.last_start_time
    const created = record.createdAt ?? record.created_at
    let startTime = lastStart ? new Date(String(lastStart)) : null
    if ((!startTime || Number.isNaN(startTime.getTime())) && total === 0 && created) {
      startTime = new Date(String(created))
    }
    if (startTime && !Number.isNaN(startTime.getTime())) {
      const diff = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000))
      return total + diff
    }
    return total
  }, [])

  const loadAttendance = useCallback(async () => {
    const gen = ++fetchGenRef.current
    if (!token && !responsible) {
      setActive(null)
      setElapsed(0)
      if (fetchGenRef.current === gen) setInitializing(false)
      return
    }
    try {
      const today = await getTodayAttendance(token, responsible || null)
      if (fetchGenRef.current !== gen) return
      setErrorMsg(null)
      if (today?.id) setActive(today)
      else {
        setActive(null)
        setElapsed(0)
      }
    } catch (e) {
      if (fetchGenRef.current !== gen) return
      setActive(null)
      setElapsed(0)
      setErrorMsg(e instanceof Error ? e.message : 'שגיאה בטעינת נוכחות')
    } finally {
      if (fetchGenRef.current === gen) setInitializing(false)
    }
  }, [token, responsible])

  useEffect(() => {
    setInitializing(true)
    void loadAttendance()
  }, [loadAttendance])

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return
    }
    setElapsed(calculateSeconds(active))
    if (checkIsRunning(active as never)) {
      const interval = setInterval(() => setElapsed(calculateSeconds(active)), 1000)
      return () => clearInterval(interval)
    }
  }, [active, calculateSeconds])

  const running = !initializing && checkIsRunning(active as never)
  const statusRaw = String(
    (active as { attendanceStatus?: string; attendance_status?: string } | null)?.attendanceStatus
    ?? (active as { attendance_status?: string } | null)?.attendance_status
    ?? '',
  ).trim()
  const isOnBreak = !running && !!active && statusRaw === 'הפסקה'
  const isOnLunchBreak = !running && !!active && statusRaw === 'הפסקת צהריים'

  useEffect(() => {
    if (!isOnLunchBreak) return
    const id = setInterval(() => setLunchClockTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isOnLunchBreak])

  const lunchBreakAlreadyUsedThisDay = useMemo(() => {
    const rec = active as { lunchBreakSeconds?: number; lunch_break_seconds?: number; lunchBreakLastStart?: string; lunch_break_last_start?: string } | null
    const sec = Number(rec?.lunchBreakSeconds ?? rec?.lunch_break_seconds) || 0
    const lst = rec?.lunchBreakLastStart ?? rec?.lunch_break_last_start
    return sec > 0 || (lst != null && String(lst).trim() !== '')
  }, [active])

  const getLunchBreakElapsedSeconds = () => {
    const rec = active as {
      lunchBreakSeconds?: number
      lunch_break_seconds?: number
      lunchBreakLastStart?: string
      lunch_break_last_start?: string
      attendanceStatus?: string
      attendance_status?: string
    } | null
    if (!rec) return 0
    void lunchClockTick
    const base = Number(rec.lunchBreakSeconds ?? rec.lunch_break_seconds) || 0
    const st = String(rec.attendanceStatus ?? rec.attendance_status ?? '').trim()
    if (st !== 'הפסקת צהריים' || checkIsRunning(rec as never)) return base
    const lastStart = rec.lunchBreakLastStart ?? rec.lunch_break_last_start
    if (!lastStart) return base
    const startMs = new Date(String(lastStart)).getTime()
    if (!Number.isFinite(startMs)) return base
    return base + Math.max(0, Math.floor((Date.now() - startMs) / 1000))
  }

  const handlePlay = async () => {
    if (loading || !responsible) return
    setLoading(true)
    setErrorMsg(null)
    setPulse(true)
    setTimeout(() => setPulse(false), 300)
    try {
      const rec = active as { id?: number } | null
      const isCurrentlyRunning = checkIsRunning(active as never)
      if (rec?.id && !isCurrentlyRunning) {
        const updated = await updateAttendance(rec.id, { isRunning: true, attendanceStatus: 'פעיל' }, token)
        setActive(updated)
        return
      }
      if (token) {
        const today = await getTodayAttendance(token, responsible)
        if (today?.id) {
          const updated = await updateAttendance(today.id, { isRunning: true, attendanceStatus: 'פעיל' }, token)
          setActive(updated)
          return
        }
      }
      const created = await startAttendance(responsible, token)
      setActive({ ...created, isRunning: true })
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'שגיאה בהפעלת שעון')
    } finally {
      setLoading(false)
    }
  }

  const stopTimerWithStatus = async (attendanceStatus: string, uiKey: string) => {
    const rec = active as { id?: number } | null
    if (breakExitPending || !responsible || !rec?.id || !checkIsRunning(active as never)) return
    setBreakExitPending(uiKey)
    try {
      const updated = await updateAttendance(rec.id, { isRunning: false, attendanceStatus }, token)
      setActive(updated)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'שגיאה בעדכון נוכחות')
    } finally {
      setBreakExitPending(null)
    }
  }

  const handleConfirmExit = async () => {
    setExitConfirmOpen(false)
    if (checkIsRunning(active as never)) {
      await stopTimerWithStatus(ATTENDANCE_STATUS_EXIT_END_OF_DAY, 'exit')
      return
    }
    const rec = active as { id?: number } | null
    if (!rec?.id || breakExitPending) return
    setBreakExitPending('exit')
    try {
      const updated = await updateAttendance(
        rec.id,
        { attendanceStatus: ATTENDANCE_STATUS_EXIT_END_OF_DAY },
        token,
      )
      setActive(updated)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'שגיאה בסיום יום')
    } finally {
      setBreakExitPending(null)
    }
  }

  const breakPending = breakExitPending === 'break'
  const lunchPending = breakExitPending === 'lunch'
  const exitPending = breakExitPending === 'exit'
  const breakExitBusy = Boolean(breakExitPending)
  const lunchButtonDisabled = breakExitBusy || lunchBreakAlreadyUsedThisDay

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        py: 4,
        px: 2,
        direction: 'rtl',
      }}
    >
      <Fade in timeout={800}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#111', mb: 3, textAlign: 'center' }}>
          {greeting}{userName ? ` ${userName}` : ''}
        </Typography>
      </Fade>

      {!running && (
        <IconButton
          onClick={() => void handlePlay()}
          disabled={loading || initializing || !responsible}
          sx={{
            width: 80,
            height: 80,
            backgroundColor: '#111',
            color: '#FFDD00',
            '&:hover': { backgroundColor: '#333' },
            transform: pulse ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.2s',
          }}
          aria-label="התחלת עבודה"
        >
          {loading || initializing ? <CircularProgress size={32} color="inherit" /> : <PlayArrowIcon sx={{ fontSize: 48 }} />}
        </IconButton>
      )}

      {!initializing && (
        <Typography sx={{ mt: running ? 2 : 3, fontFamily: 'monospace', fontSize: 32, fontWeight: 700 }}>
          {formatTime(elapsed)}
        </Typography>
      )}

      {running && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={breakExitBusy}
            onClick={() => void stopTimerWithStatus('הפסקה', 'break')}
            sx={{
              minWidth: 110,
              fontWeight: 800,
              bgcolor: breakPending ? BREAK_EXIT_LOADING_GREY : '#ed6c02',
              '&:hover': { bgcolor: breakPending ? BREAK_EXIT_LOADING_GREY : '#e65100' },
            }}
          >
            {breakPending ? <CircularProgress size={20} color="inherit" /> : 'עצירה'}
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <Button
              variant="contained"
              disabled={lunchButtonDisabled}
              onClick={() => void stopTimerWithStatus('הפסקת צהריים', 'lunch')}
              sx={{
                minWidth: 120,
                fontWeight: 800,
                bgcolor: lunchPending ? BREAK_EXIT_LOADING_GREY : lunchBreakAlreadyUsedThisDay ? '#9e9e9e' : '#558b2f',
              }}
            >
              {lunchPending ? <CircularProgress size={20} color="inherit" /> : 'הפסקת צהריים'}
            </Button>
            {getLunchBreakElapsedSeconds() > 0 && (
              <Typography sx={{ fontFamily: 'monospace', fontSize: 14, color: 'text.secondary' }}>
                {formatTime(getLunchBreakElapsedSeconds())}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            disabled={breakExitBusy}
            onClick={() => setExitConfirmOpen(true)}
            sx={{
              minWidth: 110,
              fontWeight: 800,
              bgcolor: exitPending ? BREAK_EXIT_LOADING_GREY : '#c62828',
              '&:hover': { bgcolor: exitPending ? BREAK_EXIT_LOADING_GREY : '#b71c1c' },
            }}
          >
            {exitPending ? <CircularProgress size={20} color="inherit" /> : 'יציאה'}
          </Button>
        </Box>
      )}

      {isOnBreak && (
        <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 600 }}>
          בהפסקה — לחץ על כפתור ההפעלה כדי לחזור לעבודה
        </Typography>
      )}

      {active && isEndOfDayExitStatus(statusRaw) && (
        <Typography sx={{ mt: 2, color: 'success.dark', fontWeight: 700 }}>
          {getGreetingMessage('stop')}
        </Typography>
      )}

      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg(null)}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
      </Snackbar>

      <Dialog open={exitConfirmOpen} onClose={() => setExitConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>סיום יום עבודה?</DialogTitle>
        <DialogContent>האם לסיים את יום העבודה?</DialogContent>
        <DialogActions>
          <Button onClick={() => setExitConfirmOpen(false)}>ביטול</Button>
          <Button variant="contained" color="error" onClick={() => void handleConfirmExit()}>
            יציאה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
