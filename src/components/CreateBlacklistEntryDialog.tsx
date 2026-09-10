import { useCallback, useEffect, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from '@mui/material'
import { createPhoneBlacklistEntry } from '../api/csApi'
import { blacklistRtlFieldSx } from '../lib/blacklistUi'

const emptyForm = () => ({
  phone: '',
  name: '',
  notes: '',
})

export default function CreateBlacklistEntryDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setForm(emptyForm())
    setError(null)
  }, [])

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const updateField = (key: keyof ReturnType<typeof emptyForm>) => (
    event: { target: { value: string } },
  ) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setError(null)
  }

  const handleSubmit = async () => {
    const phone = String(form.phone || '').trim()
    if (!phone) {
      setError('חובה להזין מספר טלפון')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createPhoneBlacklistEntry({
        phone,
        name: String(form.name || '').trim() || null,
        notes: String(form.notes || '').trim() || null,
      })
      await onCreated()
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { direction: 'rtl', borderRadius: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          fontWeight: 800,
        }}
      >
        <span>הוספה לרשימה השחורה</span>
        <IconButton aria-label="סגירה" onClick={onClose} disabled={saving} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, direction: 'rtl' }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          label="מספר טלפון"
          required
          value={form.phone}
          onChange={updateField('phone')}
          fullWidth
          sx={blacklistRtlFieldSx}
          slotProps={{ htmlInput: { dir: 'rtl' } }}
        />
        <TextField
          label="שם"
          value={form.name}
          onChange={updateField('name')}
          fullWidth
          sx={blacklistRtlFieldSx}
          slotProps={{ htmlInput: { dir: 'rtl' } }}
        />
        <TextField
          label="הערות"
          value={form.notes}
          onChange={updateField('notes')}
          fullWidth
          multiline
          minRows={2}
          sx={blacklistRtlFieldSx}
          slotProps={{ htmlInput: { dir: 'rtl' } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={saving}
          sx={{ fontWeight: 700, minWidth: 96 }}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : 'שמירה'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
