import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { GAP_BELOW_INNER_NAV_PX } from '../layout/headerLayout'
import {
  getMembershipFeeSettings,
  patchMembershipFeeSettings,
} from '../api/csApi'
import { formatCsDateTime } from '../lib/caliberUi'
import { useAuth } from '../context/useAuth'
import { isManagerRole } from '../lib/roles'

export default function MembershipFeeSettingsTab() {
  const { user } = useAuth()
  const canEdit = isManagerRole(user?.role)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [amount, setAmount] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMembershipFeeSettings()
      setAmount(String(data.membershipFeeIls ?? ''))
      setUpdatedAt(data.updatedAt ?? null)
      setSource(data.source ?? null)
    } catch (e) {
      setToast({
        severity: 'error',
        message: e instanceof Error ? e.message : 'שגיאה בטעינת דמי הקמה',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onSave = async () => {
    const n = Number(String(amount).trim())
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      setToast({ severity: 'error', message: 'יש להזין סכום חיובי בשקלים (מספר שלם)' })
      return
    }
    setSaving(true)
    try {
      const data = await patchMembershipFeeSettings(n)
      setAmount(String(data.membershipFeeIls))
      setUpdatedAt(data.updatedAt ?? null)
      setSource('db')
      setToast({ severity: 'success', message: 'דמי ההקמה עודכנו בהצלחה' })
    } catch (e) {
      setToast({
        severity: 'error',
        message: e instanceof Error ? e.message : 'שגיאה בעדכון דמי הקמה',
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
    <Stack spacing={2} sx={{ mt: `${GAP_BELOW_INNER_NAV_PX}px`, maxWidth: 420, direction: 'rtl' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right' }}>
        דמי הקמה
      </Typography>

      <TextField
        label="סכום (₪)"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
        disabled={!canEdit || saving}
        slotProps={{
          htmlInput: { inputMode: 'numeric', min: 1 },
          input: {
            startAdornment: <InputAdornment position="start">₪</InputAdornment>,
          },
        }}
        sx={{ direction: 'ltr' }}
      />

      {updatedAt ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
          עודכן לאחרונה: {formatCsDateTime(updatedAt)}
          {source === 'env_or_default' ? ' (ברירת מחדל / env — טרם נשמר בדיבי)' : ''}
        </Typography>
      ) : source === 'env_or_default' ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
          עדיין לא נשמר בדיבי — מוצג ערך ברירת מחדל / env
        </Typography>
      ) : null}

      {canEdit ? (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <Button variant="contained" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'שומר…' : 'שמירה'}
          </Button>
          <Button variant="outlined" onClick={() => void load()} disabled={saving}>
            רענון
          </Button>
        </Box>
      ) : (
        <Alert severity="info">רק מנהל יכול לעדכן את דמי ההקמה</Alert>
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
