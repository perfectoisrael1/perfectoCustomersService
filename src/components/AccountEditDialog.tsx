import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import type { Account, City, Service } from '../api/csApi'
import type { AccountInput } from '../api/csApi'
import CsDialogTitleWithMenu from './CsDialogTitleWithMenu'
import {
  ACCOUNTS_DIALOG_ACCENT,
  ACCOUNT_EDIT_TABS,
  ACCOUNT_PHONE_EMPHASIS,
  AVAILABILITY_OPTIONS,
  accountFieldInputSx,
  accountStatusChipColors,
  accountStatusOptionsForForm,
  parseJsonStringArrayField,
  stringifyJsonStringArray,
  type AccountTabKey,
} from '../lib/accountsUi'
import { formatCsPhoneDisplay } from '../lib/caliberUi'
import { STANDARD_TABLE_BODY_FONT_PX } from '../lib/leadsUi'

type Props = {
  open: boolean
  account: Account | null
  form: AccountInput
  setForm: React.Dispatch<React.SetStateAction<AccountInput>>
  saving: boolean
  services: Service[]
  cities: City[]
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
        color: ACCOUNTS_DIALOG_ACCENT,
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

function buildServiceOptions(services: Service[]): string[] {
  const set = new Set<string>()
  for (const s of services) {
    const name = String(s.service || '').trim()
    if (name) set.add(name)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
}

function buildCityOptions(cities: City[]): string[] {
  return cities
    .map((c) => String(c.city || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'he'))
}

export default function AccountEditDialog({
  open,
  account,
  form,
  setForm,
  saving,
  services,
  cities,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<AccountTabKey>('phone')

  useEffect(() => {
    if (open) setTab('phone')
  }, [open, account?.id])

  const title = form.accountName || account?.accountName || 'פרטי ספק'
  const statusOptions = accountStatusOptionsForForm(form.perfectoStatus)
  const statusDisplay = accountStatusChipColors(form.perfectoStatus)

  const serviceOptions = useMemo(() => buildServiceOptions(services), [services])
  const cityOptions = useMemo(() => buildCityOptions(cities), [cities])

  const selectedSpecialties = useMemo(
    () => parseJsonStringArrayField(form.specialties ?? null),
    [form.specialties],
  )
  const selectedCities = useMemo(
    () => parseJsonStringArrayField(form.workingAreas ?? null),
    [form.workingAreas],
  )

  const rtlInput = { sx: { textAlign: 'right' as const, fontSize: 14, direction: 'rtl' as const } }
  const phoneInput = {
    sx: {
      textAlign: 'right' as const,
      fontSize: 14,
      direction: 'ltr' as const,
      color: ACCOUNT_PHONE_EMPHASIS,
      fontWeight: 600,
    },
  }
  const ltrInput = { sx: { textAlign: 'right' as const, fontSize: 14, direction: 'ltr' as const } }

  const renderPhoneTab = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Field label="שם">
        <TextField
          fullWidth
          size="small"
          value={form.accountName || ''}
          onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="טלפון">
        <TextField
          fullWidth
          size="small"
          value={form.phoneNumber || ''}
          onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          sx={accountFieldInputSx}
          slotProps={{ input: phoneInput }}
        />
      </Field>
      <Field label="סיסמה">
        <TextField
          fullWidth
          size="small"
          value={form.password ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          sx={accountFieldInputSx}
          slotProps={{ input: ltrInput }}
          helperText="מינימום 8 תווים. נקה את השדה כדי לא לשנות את הסיסמה"
        />
      </Field>
      <Field label="מספר ת.ז / ח.פ">
        <TextField
          fullWidth
          size="small"
          value={form.certificateNumber || ''}
          onChange={(e) => setForm((f) => ({ ...f, certificateNumber: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="קרדיטים">
        <TextField
          fullWidth
          size="small"
          type="number"
          value={form.credits ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              credits: e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
            }))
          }
          sx={accountFieldInputSx}
        />
      </Field>
      <Field label="עלות לליד">
        <TextField
          fullWidth
          size="small"
          type="number"
          value={form.payPerLead ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              payPerLead: e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
            }))
          }
          sx={accountFieldInputSx}
        />
      </Field>
      <Field label="תאריך הצטרפות">
        <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
          {account?.createdAt || '—'}
        </Typography>
      </Field>
      <Field label="עודכן לאחרונה">
        <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
          {account?.updatedAt || '—'}
        </Typography>
      </Field>
    </Box>
  )

  const renderBusinessTab = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Field label="שם העסק">
        <TextField
          fullWidth
          size="small"
          value={form.businessName || ''}
          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="אימייל">
        <TextField
          fullWidth
          size="small"
          value={form.email || ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="שנות ניסיון">
        <TextField
          fullWidth
          size="small"
          type="number"
          value={form.yearsOfExperience ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              yearsOfExperience: e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
            }))
          }
          sx={accountFieldInputSx}
        />
      </Field>
      <Field label="slug (קישור פרופיל)">
        <TextField
          fullWidth
          size="small"
          value={form.slug || ''}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="קצת על העסק" fullWidth>
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          value={form.about || ''}
          onChange={(e) => setForm((f) => ({ ...f, about: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="שעות פעילות (JSON)" fullWidth>
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={10}
          value={form.workingHours || ''}
          onChange={(e) => setForm((f) => ({ ...f, workingHours: e.target.value || null }))}
          placeholder='לדוגמה: {"ראשון":{"enabled":true,"start":"08:00","end":"18:00"}}'
          sx={accountFieldInputSx}
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13, direction: 'ltr' } } }}
        />
      </Field>
    </Box>
  )

  const renderDomainsTab = () => (
    <Stack spacing={2}>
      <Field label="תחום ראשי" fullWidth>
        <TextField
          fullWidth
          size="small"
          value={form.specialtiesCategory || ''}
          onChange={(e) => setForm((f) => ({ ...f, specialtiesCategory: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="תחומים (שירותים)" fullWidth>
        <Autocomplete
          multiple
          options={serviceOptions}
          value={selectedSpecialties}
          onChange={(_e, next) =>
            setForm((f) => ({ ...f, specialties: stringifyJsonStringArray(next) }))
          }
          filterSelectedOptions
          disableCloseOnSelect
          sx={{ mt: 0.5, direction: 'rtl' }}
          slotProps={{
            paper: { sx: { direction: 'rtl' } },
            chip: { size: 'small' as const },
          }}
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder="בחר תחומים" sx={accountFieldInputSx} />
          )}
        />
      </Field>
      <Field label="ערי עבודה" fullWidth>
        <Autocomplete
          multiple
          options={cityOptions}
          value={selectedCities}
          onChange={(_e, next) =>
            setForm((f) => ({ ...f, workingAreas: stringifyJsonStringArray(next) }))
          }
          filterSelectedOptions
          disableCloseOnSelect
          sx={{ mt: 0.5, direction: 'rtl' }}
          slotProps={{
            paper: { sx: { direction: 'rtl' } },
            chip: { size: 'small' as const },
          }}
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder="בחר ערים" sx={accountFieldInputSx} />
          )}
        />
      </Field>
    </Stack>
  )

  const renderStatusTab = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Field label="סטטוס פרפקטו" fullWidth>
        <Select
          size="small"
          fullWidth
          value={String(form.perfectoStatus || '').toLowerCase()}
          onChange={(e) => setForm((f) => ({ ...f, perfectoStatus: e.target.value || null }))}
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
                  '& .MuiList-root': { p: 0.5, fontSize: STANDARD_TABLE_BODY_FONT_PX },
                },
              },
            },
          }}
        >
          <MenuItem value="">
            <em>ללא</em>
          </MenuItem>
          {statusOptions.map((opt) => {
            const sc = accountStatusChipColors(opt.value)
            return (
              <MenuItem
                key={opt.value}
                value={opt.value}
                sx={{
                  backgroundColor: sc.bg,
                  color: sc.fg,
                  fontWeight: 600,
                  borderRadius: 1.5,
                  my: 0.25,
                  justifyContent: 'center',
                  '&.Mui-selected': { backgroundColor: sc.bg },
                  '&.Mui-selected:hover': { backgroundColor: sc.bg, opacity: 0.9 },
                }}
              >
                {opt.label}
              </MenuItem>
            )
          })}
        </Select>
      </Field>
      <Field label="זמינות">
        <Select
          size="small"
          fullWidth
          value={form.availability == null ? '' : String(form.availability)}
          onChange={(e) => {
            const v = e.target.value
            setForm((f) => ({
              ...f,
              availability: v === '' ? null : Number.parseInt(v, 10),
            }))
          }}
          displayEmpty
          sx={{ ...accountFieldInputSx }}
        >
          <MenuItem value="">
            <em>ללא</em>
          </MenuItem>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Field>
      <Field label="טלפון (תצוגה)">
        <Typography sx={{ mt: 0.5, fontSize: 14, color: ACCOUNT_PHONE_EMPHASIS, fontWeight: 600 }}>
          {formatCsPhoneDisplay(form.phoneNumber)}
        </Typography>
      </Field>
    </Box>
  )

  const tabContent =
    tab === 'phone'
      ? renderPhoneTab()
      : tab === 'business'
        ? renderBusinessTab()
        : tab === 'domains'
          ? renderDomainsTab()
          : renderStatusTab()

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="lg"
      fullWidth
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            direction: 'rtl',
            overflow: 'hidden',
            width: 'min(1520px, calc(100vw - 32px))',
            maxWidth: '1520px',
          },
        },
      }}
    >
      <CsDialogTitleWithMenu
        heading={(
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: ACCOUNTS_DIALOG_ACCENT }}>
            {`הפרטים של ${title}`}
          </Typography>
        )}
        onClose={() => !saving && onClose()}
        closeDisabled={saving}
        onRequestDelete={() => void onDelete()}
        menuDisabled={saving}
        dialogTitleSx={{
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? theme.palette.background.paper
              : 'linear-gradient(135deg, #E1EFF2 0%, #f0f7f9 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          px: 3,
        }}
      />

      <DialogContent sx={{ px: 3, pb: 2, pt: '12px !important' }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v as AccountTabKey)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            mb: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            '& .MuiTabs-indicator': { height: 3 },
          }}
        >
          {ACCOUNT_EDIT_TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={t.title} sx={{ fontWeight: 700, minHeight: 48 }} />
          ))}
        </Tabs>

        <Paper
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
            p: { xs: 2, md: 3 },
          }}
        >
          {tabContent}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end' }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => onClose()} disabled={saving}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={() => void onSave()}
            disabled={saving}
            sx={{
              bgcolor: ACCOUNTS_DIALOG_ACCENT,
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
