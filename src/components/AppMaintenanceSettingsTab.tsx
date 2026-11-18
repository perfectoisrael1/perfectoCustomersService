import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { GAP_BELOW_INNER_NAV_PX } from '../layout/headerLayout'
import {
  getAppMaintenanceSettings,
  patchAppMaintenanceSettings,
} from '../api/csApi'
import { formatCsDateTime } from '../lib/caliberUi'
import { useAuth } from '../context/useAuth'
import { isManagerUser } from '../lib/roles'

export default function AppMaintenanceSettingsTab() {
  const { user } = useAuth()
  const canEdit = isManagerUser(user)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [minRequiredVersion, setMinRequiredVersion] = useState('')
  const [forceUpdateMessage, setForceUpdateMessage] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAppMaintenanceSettings()
      setEnabled(data.enabled === true)
      setMessage(data.message ?? '')
      setMinRequiredVersion(data.minRequiredVersion ?? '')
      setForceUpdateMessage(data.forceUpdateMessage ?? '')
      setUpdatedAt(data.updatedAt ?? null)
    } catch (e) {
      setToast({
        severity: 'error',
        message: e instanceof Error ? e.message : 'שגיאה בטעינת מצב שיפוצים',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onSave = async () => {
    const trimmed = message.trim()
    const version = minRequiredVersion.trim()
    const updateMessage = forceUpdateMessage.trim()
    if (!trimmed) {
      setToast({ severity: 'error', message: 'יש להזין הודעה למשתמשים' })
      return
    }
    if (version && !/^\d+(?:\.\d+){0,2}$/.test(version)) {
      setToast({ severity: 'error', message: 'הגרסה צריכה להיראות כמו 2.2.4' })
      return
    }
    if (!updateMessage) {
      setToast({ severity: 'error', message: 'יש להזין הודעת עדכון' })
      return
    }
    setSaving(true)
    try {
      const data = await patchAppMaintenanceSettings({
        enabled,
        message: trimmed,
        minRequiredVersion: version,
        forceUpdateMessage: updateMessage,
      })
      setEnabled(data.enabled)
      setMessage(data.message)
      setMinRequiredVersion(data.minRequiredVersion ?? '')
      setForceUpdateMessage(data.forceUpdateMessage ?? '')
      setUpdatedAt(data.updatedAt ?? null)
      setToast({
        severity: 'success',
        message: data.minRequiredVersion
          ? `נשמר. משתמשים מתחת לגרסה ${data.minRequiredVersion} חייבים לעדכן`
          : data.enabled
            ? 'מצב שיפוצים הופעל — האפליקציה חסומה למשתמשים'
            : 'מצב שיפוצים כובה — האפליקציה פתוחה',
      })
    } catch (e) {
      setToast({
        severity: 'error',
        message: e instanceof Error ? e.message : 'שגיאה בעדכון מצב שיפוצים',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, mt: `${GAP_BELOW_INNER_NAV_PX}px` }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Stack spacing={2} sx={{ mt: `${GAP_BELOW_INNER_NAV_PX}px`, maxWidth: 520, direction: 'rtl' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right' }}>
        שיפוצים באפליקציה
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
        כשמופעל — משתמשי האפליקיה רואים מסך «בשיפוצים» ולא יכולים להתחבר או להשתמש במערכת.
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={!canEdit || saving}
            color="warning"
          />
        }
        label={enabled ? 'שיפוצים פעילים — האפליקציה חסומה' : 'שיפוצים כבויים — האפליקציה פתוחה'}
        sx={{ mr: 0, direction: 'rtl' }}
      />

      <TextField
        label="הודעה למשתמשים"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={!canEdit || saving}
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        helperText={`${message.length}/255`}
        sx={{ direction: 'rtl' }}
      />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'right', pt: 1 }}>
        חובת עדכון גרסה
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
        משתמשים עם גרסה נמוכה מהמספר שתכתוב כאן ייחסמו ויופנו להורדת האפליקציה. שדה ריק מבטל את החובה.
      </Typography>
      <TextField
        label="גרסה נדרשת"
        value={minRequiredVersion}
        onChange={(e) => setMinRequiredVersion(e.target.value)}
        disabled={!canEdit || saving}
        placeholder="2.2.4"
        helperText="לדוגמה 2.2.4 — גרסאות ישנות יותר לא יוכלו להמשיך"
        sx={{ direction: 'rtl' }}
      />
      <TextField
        label="הודעת עדכון"
        value={forceUpdateMessage}
        onChange={(e) => setForceUpdateMessage(e.target.value)}
        disabled={!canEdit || saving}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        helperText={`${forceUpdateMessage.length}/255`}
        sx={{ direction: 'rtl' }}
      />

      {updatedAt ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
          עודכן לאחרונה: {formatCsDateTime(updatedAt)}
        </Typography>
      ) : null}

      {canEdit ? (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <Button
            variant="contained"
            color={enabled ? 'warning' : 'primary'}
            onClick={() => void onSave()}
            disabled={saving}
          >
            {saving ? 'שומר…' : 'שמירה'}
          </Button>
          <Button variant="outlined" onClick={() => void load()} disabled={saving}>
            רענון
          </Button>
        </Box>
      ) : (
        <Alert severity="info">רק מנהל יכול לשנות מצב שיפוצים</Alert>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  )
}
