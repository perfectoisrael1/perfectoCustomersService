import { useCallback, useEffect, useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import {
  createExpense,
  getAccounts,
  uploadExpenseWithInvoice,
  type Account,
} from '../api/csApi'
import { formatCsPhoneDisplay } from '../lib/caliberUi'
import { EXPENSE_CURRENCY_OPTIONS, expenseRtlFieldSx, todayDateInputValue } from '../lib/expensesUi'

const emptyForm = () => ({
  expenseName: '',
  receiptDate: todayDateInputValue(),
  amount: '',
  currency: 'ILS',
  accountId: '' as string,
})

function accountLabel(account: Account): string {
  const name = String(account.accountName || '').trim()
  const phone = formatCsPhoneDisplay(account.phoneNumber)
  return name ? `${name} (${phone})` : phone || `#${account.id}`
}

export default function CreateExpenseDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [form, setForm] = useState(emptyForm)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setForm(emptyForm())
    setInvoiceFile(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    setLoadingAccounts(true)
    void getAccounts()
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false))
  }, [open, reset])

  const updateField = (key: keyof ReturnType<typeof emptyForm>) => (
    event: { target: { value: string } },
  ) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setError(null)
  }

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a, b) =>
        String(a.accountName || '').localeCompare(String(b.accountName || ''), 'he'),
      ),
    [accounts],
  )

  const selectedAccount = useMemo(
    () => sortedAccounts.find((account) => String(account.id) === String(form.accountId)) ?? null,
    [sortedAccounts, form.accountId],
  )

  const filterAccountOptions = (options: Account[], { inputValue }: { inputValue: string }) => {
    const query = String(inputValue || '').trim().toLowerCase()
    const filtered = query
      ? options.filter((account) => accountLabel(account).toLowerCase().includes(query))
      : options
    return filtered.slice(0, 5)
  }

  const handleSubmit = async () => {
    const expenseName = String(form.expenseName || '').trim()
    if (!expenseName) {
      setError('חובה להזין שם הוצאה')
      return
    }
    if (!form.receiptDate) {
      setError('חובה להזין תאריך')
      return
    }
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('חובה להזין סכום תקין')
      return
    }

    const payload = {
      expenseName,
      receiptDate: form.receiptDate,
      amount,
      currency: form.currency || 'ILS',
      accountId: form.accountId ? Number(form.accountId) : null,
    }

    setSaving(true)
    setError(null)
    try {
      if (invoiceFile) {
        await uploadExpenseWithInvoice(payload, invoiceFile)
      } else {
        await createExpense(payload)
      }
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
        <span>הוצאה חדשה</span>
        <IconButton aria-label="סגירה" onClick={onClose} disabled={saving} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, direction: 'rtl' }}>
        <TextField
          label="שם ההוצאה"
          required
          value={form.expenseName}
          onChange={updateField('expenseName')}
          fullWidth
          sx={expenseRtlFieldSx}
          slotProps={{ htmlInput: { dir: 'rtl' } }}
        />
        <TextField
          label="תאריך ההוצאה"
          required
          type="date"
          value={form.receiptDate}
          onChange={updateField('receiptDate')}
          fullWidth
          sx={expenseRtlFieldSx}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { dir: 'rtl' },
          }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5, direction: 'rtl' }}>
          <TextField
            label="סכום"
            required
            type="number"
            sx={expenseRtlFieldSx}
            slotProps={{ htmlInput: { min: 0, step: 0.01, dir: 'rtl' } }}
            value={form.amount}
            onChange={updateField('amount')}
          />
          <TextField
            label="מטבע"
            select
            value={form.currency}
            onChange={updateField('currency')}
            sx={expenseRtlFieldSx}
          >
            {EXPENSE_CURRENCY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ direction: 'rtl' }}>
                {option.symbol} {option.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Autocomplete
          options={sortedAccounts}
          value={selectedAccount}
          loading={loadingAccounts}
          disabled={loadingAccounts || saving}
          onChange={(_, account) => {
            setForm((prev) => ({ ...prev, accountId: account ? String(account.id) : '' }))
            setError(null)
          }}
          filterOptions={filterAccountOptions}
          getOptionLabel={(account) => accountLabel(account)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          fullWidth
          noOptionsText="לא נמצאו ספקים"
          sx={expenseRtlFieldSx}
          slotProps={{
            paper: { sx: { direction: 'rtl' } },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="שיוך לספק"
              sx={expenseRtlFieldSx}
              slotProps={{
                htmlInput: { dir: 'rtl' },
              }}
            />
          )}
        />

        <Box>
          <Typography sx={{ fontWeight: 700, mb: 0.75, fontSize: 14, textAlign: 'right' }}>
            חשבונית / קבלה
          </Typography>
          <Box
            component="label"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              minHeight: 96,
              width: '100%',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              cursor: saving ? 'default' : 'pointer',
              px: 2,
              py: 2,
              textAlign: 'center',
            }}
          >
            <AddIcon sx={{ fontSize: 36 }} />
            {invoiceFile ? (
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                {invoiceFile.name}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                PDF או תמונה
              </Typography>
            )}
            <input
              hidden
              type="file"
              accept=".pdf,image/*"
              disabled={saving}
              onChange={(event) => {
                setInvoiceFile(event.target.files?.[0] ?? null)
                setError(null)
              }}
            />
          </Box>
        </Box>

        {error ? (
          <Typography color="error" sx={{ fontWeight: 600, fontSize: 14 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={saving}
          endIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? 'שומר...' : 'שמירה'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
