import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/useAuth'
import AttendancePage from './AttendancePage'
import AttendanceHoursPage from './AttendanceHoursPage'
import EmployeeAvailabilityTable from '../components/EmployeeAvailabilityTable'
import {
  buildIdentityCandidates,
  isActive,
  isAdminOrSuperadminRole,
  pickUserAttendanceRecord,
  resolveAttendanceResponsible,
} from '../lib/attendanceUtils'
import {
  listAllAttendanceToday,
  startAttendance,
  updateAttendance,
} from '../api/attendanceApi'
import { STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS } from '../layout/headerLayout'

type InnerTab = 'personal' | 'attendanceHours' | 'availability'

function getPathForTab(tab: InnerTab): string {
  if (tab === 'attendanceHours') return '/personal-area/attendance'
  if (tab === 'availability') return '/personal-area/availability'
  return '/personal-area'
}

function resolveInnerTab(pathname: string): InnerTab {
  if (pathname.startsWith('/personal-area/attendance')) return 'attendanceHours'
  if (pathname.startsWith('/personal-area/availability')) return 'availability'
  return 'personal'
}

export default function PersonalAreaPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const innerTab = resolveInnerTab(location.pathname)
  const canManageAvailability = isAdminOrSuperadminRole(user?.role)

  const identityCandidates = useMemo(() => buildIdentityCandidates(user), [user])

  const [globalClockDialog, setGlobalClockDialog] = useState<{
    open: boolean
    loading: boolean
    record: { id?: number } | null
    pendingPath: string | null
    message: string
    reason: 'newDay' | 'clockPaused' | 'error' | null
  }>({
    open: false,
    loading: false,
    record: null,
    pendingPath: null,
    message: '',
    reason: null,
  })

  useEffect(() => {
    if (innerTab === 'availability' && !canManageAvailability) {
      navigate('/personal-area', { replace: true })
    }
  }, [innerTab, canManageAvailability, navigate])

  const ensureClockEnabledBeforeAccess = useCallback(
    async (pathToEnter: string) => {
      if (!token || pathToEnter.startsWith('/personal-area') || canManageAvailability) return true
      try {
        const rows = await listAllAttendanceToday(token)
        const record = pickUserAttendanceRecord(rows, identityCandidates)
        if (record && isActive(record)) return true
        setGlobalClockDialog({
          open: true,
          loading: false,
          record: record || null,
          pendingPath: pathToEnter,
          message: '',
          reason: record ? 'clockPaused' : 'newDay',
        })
        return false
      } catch (e) {
        setGlobalClockDialog({
          open: true,
          loading: false,
          record: null,
          pendingPath: pathToEnter,
          message: e instanceof Error ? e.message : 'שגיאה בבדיקת שעון',
          reason: 'error',
        })
        return false
      }
    },
    [token, identityCandidates, canManageAvailability],
  )

  const handleTabChange = async (_: unknown, v: InnerTab) => {
    const targetPath = getPathForTab(v)
    if (targetPath === location.pathname) return
    const allowed = await ensureClockEnabledBeforeAccess(targetPath)
    if (allowed) navigate(targetPath)
  }

  const handleEnableClockFromDialog = async () => {
    if (!token) return
    const { record } = globalClockDialog
    const responsible = resolveAttendanceResponsible(user)
    if (!responsible) {
      setGlobalClockDialog((prev) => ({
        ...prev,
        message: 'לא ניתן לזהות משתמש',
      }))
      return
    }
    setGlobalClockDialog((prev) => ({ ...prev, loading: true, message: '' }))
    try {
      if (!record?.id) {
        await startAttendance(responsible, token)
      } else {
        await updateAttendance(record.id, { isRunning: true, attendanceStatus: 'פעיל' }, token)
      }
      setGlobalClockDialog({
        open: false,
        loading: false,
        record: null,
        pendingPath: null,
        message: '',
        reason: null,
      })
      navigate('/personal-area', { replace: true })
    } catch (e) {
      setGlobalClockDialog((prev) => ({
        ...prev,
        loading: false,
        message: e instanceof Error ? e.message : 'שגיאה בהפעלת שעון',
      }))
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', direction: 'rtl' }}>
      <Box
        sx={{
          position: 'sticky',
          top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Tabs
          value={innerTab}
          onChange={(_, v) => void handleTabChange(_, v as InnerTab)}
          sx={{
            bgcolor: 'rgba(0,0,0,0.04)',
            borderRadius: 3,
            px: 1,
            '& .MuiTab-root': { fontWeight: 700, minWidth: { xs: 72, sm: 100 } },
          }}
        >
          <Tab value="personal" label="שעון נוכחות" />
          <Tab value="attendanceHours" label="שעות נוכחות" />
          {canManageAvailability && <Tab value="availability" label="זמינות עובדים" />}
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {innerTab === 'personal' && <AttendancePage />}
        {innerTab === 'attendanceHours' && (
          <AttendanceHoursPage routeBase="/personal-area/attendance" />
        )}
        {innerTab === 'availability' && canManageAvailability && (
          <EmployeeAvailabilityTable canManageAvailability={canManageAvailability} />
        )}
      </Box>

      <Dialog open={globalClockDialog.open} onClose={() => setGlobalClockDialog((p) => ({ ...p, open: false }))}>
        <DialogTitle sx={{ fontWeight: 800 }}>חשוב להדליק את השעון נוכחות</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            {globalClockDialog.reason === 'newDay'
              ? 'לפני מעבר לטאבים אחרים יש להתחיל את שעון הנוכחות להיום.'
              : 'השעון לא פעיל — יש להפעיל אותו כדי להמשיך.'}
          </Typography>
          {globalClockDialog.message && (
            <Typography color="error">{globalClockDialog.message}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGlobalClockDialog((p) => ({ ...p, open: false }))}>ביטול</Button>
          <Button
            variant="contained"
            disabled={globalClockDialog.loading}
            onClick={() => void handleEnableClockFromDialog()}
          >
            {globalClockDialog.loading ? 'מפעיל...' : 'הפעלת שעון'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
