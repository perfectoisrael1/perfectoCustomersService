import { useCallback, useEffect, useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { createAdvertisingExpense, getServices, type Service } from '../api/csApi'
import { expenseRtlFieldSx, todayDateInputValue } from '../lib/expensesUi'

function serviceLabel(service: Service): string {
  const domain = String(service.service || '').trim()
  const category = String(service.category || '').trim()
  const sub = String(service.subService || '').trim()
  const parts = [domain, sub].filter(Boolean).join(' · ')
  return category ? `${parts} (${category})` : parts || `#${service.id}`
}

export default function CreateAdvertisingExpenseDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [services, setServices] = useState<Service[]>([])
  const [service, setService] = useState<Service | null>(null)
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayDateInputValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setService(null)
    setAmount('')
    setExpenseDate(todayDateInputValue())
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    void getServices()
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]))
  }, [open, reset])

  const options = useMemo(
    () =>
      [...services].sort((a, b) =>
        serviceLabel(a).localeCompare(serviceLabel(b), 'he'),
      ),
    [services],
  )

  const submit = async () => {
    const parsed = Number(amount)
    if (!service) {
      setError('חובה לבחור תחום')
      return
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('חובה להזין סכום תקין')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      setError('תאריך לא תקין')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createAdvertisingExpense({
        serviceId: service.id,
        amount: parsed,
        expenseDate,
      })
      await onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        הוצאת פרסום
        <IconButton onClick={onClose} disabled={saving} aria-label="סגירה">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Autocomplete
          options={options}
          value={service}
          onChange={(_e, value) => {
            setService(value)
            setError(null)
          }}
          getOptionLabel={serviceLabel}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => (
            <TextField {...params} label="תחום" sx={expenseRtlFieldSx} />
          )}
        />
        <TextField
          label="סכום"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setError(null)
          }}
          type="number"
          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
          sx={expenseRtlFieldSx}
        />
        <TextField
          label="תאריך"
          type="date"
          value={expenseDate}
          onChange={(e) => {
            setExpenseDate(e.target.value)
            setError(null)
          }}
          sx={expenseRtlFieldSx}
        />
        {error ? (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          ביטול
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>
          שמירה
        </Button>
      </DialogActions>
    </Dialog>
  )
}
