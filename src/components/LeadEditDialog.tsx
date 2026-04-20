import type { Dispatch, SetStateAction } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Lead } from '../api/csApi'
import type { LeadInput } from '../api/csApi'
import {
  LEADS_DIALOG_ACCENT,
  LEADS_STATUS_COLORS,
  LEAD_PHONE_EMPHASIS,
  STANDARD_TABLE_BODY_FONT_PX,
  getLeadStatusColors,
  leadFieldInputSx,
  leadStatusOptionsForForm,
} from '../lib/leadsUi'

type Props = {
  open: boolean
  editor: Lead | 'new' | null
  form: LeadInput
  setForm: Dispatch<SetStateAction<LeadInput>>
  saving: boolean
  onClose: () => void
  onSave: () => void | Promise<void>
  onDelete: () => void | Promise<void>
}

const Field = ({
  label,
  children,
  fullWidth,
}: {
  label: string
  children: React.ReactNode
  fullWidth?: boolean
}) => (
  <Box
    sx={{
      gridColumn: fullWidth ? '1 / -1' : 'auto',
      backgroundColor: 'action.hover',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      p: 1.5,
    }}
  >
    <Typography
      sx={{
        fontSize: 14,
        fontWeight: 700,
        color: LEADS_DIALOG_ACCENT,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
)

export default function LeadEditDialog({
  open,
  editor,
  form,
  setForm,
  saving,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isNew = editor === 'new'
  const existingLead: Lead | null = editor !== 'new' && editor ? editor : null
  const title = isNew ? 'ליד חדש' : (form.name || existingLead?.name || 'פרטי ליד')

  const statusOptions = leadStatusOptionsForForm(form.status)
  const statusDisplay = getLeadStatusColors(form.status)

  const rtlInput = { sx: { textAlign: 'right' as const, fontSize: 14, direction: 'rtl' as const } }
  const phoneInput = {
    sx: {
      textAlign: 'right' as const,
      fontSize: 14,
      direction: 'ltr' as const,
      color: LEAD_PHONE_EMPHASIS,
      fontWeight: 600,
    },
  }

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="md"
      fullWidth
      disableScrollLock
      slotProps={{
        paper: { sx: { borderRadius: 4, direction: 'rtl', overflow: 'hidden' } },
      }}
    >
      <DialogTitle
        sx={{
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? theme.palette.background.paper
              : 'linear-gradient(135deg, #E1EFF2 0%, #f0f7f9 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
          px: 3,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: LEADS_DIALOG_ACCENT }}>{title}</Typography>
        <IconButton onClick={() => !saving && onClose()} size="small" sx={{ color: 'text.secondary' }} aria-label="סגור">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3, pt: '12px !important' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Field label="שם מלא">
                <TextField
                  fullWidth
                  size="small"
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  sx={leadFieldInputSx}
                  slotProps={{ input: rtlInput }}
                />
              </Field>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Field label="טלפון">
                <TextField
                  fullWidth
                  size="small"
                  value={form.phone || ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  sx={leadFieldInputSx}
                  slotProps={{ input: phoneInput }}
                />
              </Field>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Field label="תחום">
                <TextField
                  fullWidth
                  size="small"
                  value={form.category || ''}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value || null }))}
                  sx={leadFieldInputSx}
                  slotProps={{ input: rtlInput }}
                />
              </Field>
            </Box>
          </Box>

          <Field label="הערות" fullWidth>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={6}
              value={form.details || ''}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value || null }))}
              sx={leadFieldInputSx}
              slotProps={{ input: rtlInput }}
            />
          </Field>

          <Field label="סטטוס" fullWidth>
            <Select
              size="small"
              fullWidth
              value={String(form.status || '')}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value || null }))}
              displayEmpty
              sx={{
                mt: 0.5,
                backgroundColor: statusDisplay.bg,
                color: statusDisplay.fg,
                borderRadius: 2,
                '& .MuiSelect-select': {
                  py: '8px',
                  textAlign: 'center',
                  fontWeight: 'normal',
                  fontSize: 15,
                },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      borderRadius: 2.5,
                      p: 1,
                      overflow: 'hidden',
                      '& .MuiList-root': {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(110px, 1fr))',
                        gap: 1,
                        p: 0.5,
                        fontSize: STANDARD_TABLE_BODY_FONT_PX,
                      },
                    },
                  },
                },
              }}
            >
              {statusOptions.map((opt) => {
                const sc = LEADS_STATUS_COLORS[opt] || { bg: '#9e9e9e', fg: '#fff' }
                return (
                  <MenuItem
                    key={opt}
                    value={opt}
                    sx={{
                      backgroundColor: sc.bg,
                      color: sc.fg,
                      fontWeight: 'normal',
                      fontSize: STANDARD_TABLE_BODY_FONT_PX,
                      borderRadius: 1.5,
                      minHeight: 44,
                      justifyContent: 'center',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      px: 1,
                      '&:hover': { backgroundColor: sc.bg, opacity: 0.9 },
                      '&.Mui-selected': { backgroundColor: sc.bg },
                      '&.Mui-selected:hover': { backgroundColor: sc.bg, opacity: 0.9 },
                    }}
                  >
                    {opt}
                  </MenuItem>
                )
              })}
            </Select>
          </Field>

          <Field label="עסק">
            <TextField
              fullWidth
              size="small"
              value={form.businessName || ''}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              sx={leadFieldInputSx}
              slotProps={{ input: rtlInput }}
            />
          </Field>

          <Field label="אימייל">
            <TextField
              fullWidth
              size="small"
              value={form.email || ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
              sx={leadFieldInputSx}
              slotProps={{ input: rtlInput }}
            />
          </Field>

          <Field label="אחראי">
            <TextField
              fullWidth
              size="small"
              value={form.responsible || ''}
              onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value || null }))}
              sx={leadFieldInputSx}
              slotProps={{ input: rtlInput }}
            />
          </Field>

          <Field label="פולואפ (תאריך)">
            <TextField
              fullWidth
              size="small"
              type="date"
              value={form.followUpDate || ''}
              onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value || null }))}
              sx={leadFieldInputSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Field>

          <Field label="סכום">
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.amount ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value === '' ? null : Number(e.target.value) }))
              }
              sx={leadFieldInputSx}
            />
          </Field>

          <Field label="בונוס">
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.bonus ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, bonus: e.target.value === '' ? null : Number(e.target.value) }))
              }
              sx={leadFieldInputSx}
            />
          </Field>

          <Field label="מקור הליד" fullWidth>
            <TextField
              fullWidth
              size="small"
              value={form.leadSource || ''}
              onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value || null }))}
              sx={leadFieldInputSx}
              slotProps={{ input: rtlInput }}
            />
          </Field>

          <Box sx={{ gridColumn: '1 / -1' }}>
            <Field label="שולם" fullWidth>
              <FormControlLabel
                sx={{ m: 0, mt: 0.5 }}
                control={(
                  <Switch
                    checked={!!form.isPaid}
                    onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
                  />
                )}
                label=""
              />
            </Field>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Box>
          {editor && editor !== 'new' ? (
            <Button color="error" startIcon={<DeleteIcon />} onClick={() => void onDelete()} disabled={saving}>
              מחיקה
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => onClose()} disabled={saving}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={() => void onSave()}
            disabled={saving}
            sx={{
              bgcolor: LEADS_DIALOG_ACCENT,
              color: '#fff',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            {saving ? 'שומר…' : 'שמירה'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
