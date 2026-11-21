import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import type { Account, AccountCoverageHistoryRow, City, Job, Service, StandingOrder, StandingOrderAction } from '../api/csApi'
import type { AccountInput } from '../api/csApi'
import {
  deleteAccountSavedCard,
  getAccountCoverageHistory,
  getAccountStandingOrder,
  getJobsForAccount,
  updateAccountStandingOrder,
} from '../api/csApi'
import CsDialogTitleWithMenu from './CsDialogTitleWithMenu'
import {
  ACCOUNTS_DIALOG_ACCENT,
  ACCOUNT_EDIT_TABS,
  ACCOUNT_PHONE_EMPHASIS,
  AVAILABILITY_OPTIONS,
  availabilitySelectValue,
  isPermanentAvailabilityOff,
  perfectoStatusForAvailability,
  accountFieldInputSx,
  accountStatusChipColors,
  accountStatusOptionsForForm,
  parseJsonStringArrayField,
  stringifyJsonStringArray,
  type AccountTabKey,
} from '../lib/accountsUi'
import { formatCsPhoneDisplay, formatCsDateTime, jobStatusChipColors } from '../lib/caliberUi'
import { STANDARD_TABLE_BODY_FONT_PX } from '../lib/leadsUi'
import { useAuth } from '../context/useAuth'
import { isManagerUser } from '../lib/roles'

type Props = {
  open: boolean
  account: Account | 'new' | null
  form: AccountInput
  setForm: React.Dispatch<React.SetStateAction<AccountInput>>
  saving: boolean
  services: Service[]
  cities: City[]
  onClose: () => void
  onSave: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  onAccountPatch?: (account: Account) => void
  onStandingOrderChange?: (accountId: number, hasStandingOrder: boolean) => void
}

const Field = ({
  label,
  children,
  fullWidth,
  required,
}: {
  label: string
  children: React.ReactNode
  fullWidth?: boolean
  required?: boolean
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
      component="label"
      sx={{
        display: 'block',
        fontSize: 14,
        fontWeight: 700,
        color: ACCOUNTS_DIALOG_ACCENT,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        mb: 0.5,
      }}
    >
      {label}
      {required ? (
        <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
          {' *'}
        </Box>
      ) : null}
    </Typography>
    {children}
  </Box>
)

function offStartedMoreThanWeekAgo(since: string | null | undefined): boolean {
  if (!since) return false
  const started = new Date(since)
  if (Number.isNaN(started.getTime())) return false
  return Date.now() - started.getTime() > 7 * 24 * 60 * 60 * 1000
}

function availabilityOffStatusText(account: Account | null): string {
  if (!account) return ''
  const availability = Number(account.availability)
  const until = account.availabilityOffUntil
  if (isPermanentAvailabilityOff(until)) return 'כבוי קבוע, בלי חזרה אוטומטית.'
  if (availability === 2 && until) return `כבוי עד ${formatCsDateTime(until)}.`
  if (availability === 2) return 'כבוי ידני.'
  return 'אין כיבוי ידני פעיל.'
}

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

function formatCoverageList(values: string[] | null | undefined): string {
  const items = Array.isArray(values)
    ? values.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  return items.length ? items.join(', ') : '—'
}

function formatCoverageWindow(row: AccountCoverageHistoryRow): string {
  const end = formatCsDateTime(row.updatedAt)
  const startMs = row.startedAt ? new Date(row.startedAt).getTime() : NaN
  const endMs = row.updatedAt ? new Date(row.updatedAt).getTime() : NaN
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || Math.abs(endMs - startMs) < 60_000) {
    return end
  }
  return `${formatCsDateTime(row.startedAt)} – ${end}`
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
  onAccountPatch,
  onStandingOrderChange,
}: Props) {
  const { user } = useAuth()
  const canSeeJobsTab = isManagerUser(user)
  const isNew = account === 'new'
  const existingAccount: Account | null = account !== 'new' && account ? account : null
  const visibleTabs = ACCOUNT_EDIT_TABS.filter((t) => t.key !== 'jobs' || canSeeJobsTab)
  const [tab, setTab] = useState<AccountTabKey>('phone')
  const [linkedJobs, setLinkedJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [coverageRows, setCoverageRows] = useState<AccountCoverageHistoryRow[]>([])
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [coverageError, setCoverageError] = useState<string | null>(null)
  const [hasSavedCard, setHasSavedCard] = useState(false)
  const [clearingSavedCard, setClearingSavedCard] = useState(false)
  const [savedCardError, setSavedCardError] = useState<string | null>(null)
  const [standingOrder, setStandingOrder] = useState<StandingOrder | null>(null)
  const [standingOrderLoading, setStandingOrderLoading] = useState(false)
  const [standingOrderError, setStandingOrderError] = useState<string | null>(null)
  const [standingOrderAction, setStandingOrderAction] = useState<StandingOrderAction | null>(null)
  const [extendDaysInput, setExtendDaysInput] = useState('')
  const [permanentOff, setPermanentOff] = useState(false)

  useEffect(() => {
    if (open) setTab('phone')
    setExtendDaysInput('')
    setPermanentOff(false)
  }, [open, existingAccount?.id])

  useEffect(() => {
    if (tab === 'jobs' && !canSeeJobsTab) setTab('phone')
  }, [tab, canSeeJobsTab])

  useEffect(() => {
    if (!open) {
      setSavedCardError(null)
      return
    }
    setHasSavedCard(existingAccount?.hasSavedPaymentMethod === true)
  }, [open, existingAccount?.id, existingAccount?.hasSavedPaymentMethod])

  useEffect(() => {
    if (!open || tab !== 'jobs' || !existingAccount?.id) {
      return
    }

    let cancelled = false
    setJobsLoading(true)
    setJobsError(null)

    void getJobsForAccount(existingAccount.id)
      .then((rows) => {
        if (!cancelled) setLinkedJobs(rows)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLinkedJobs([])
          setJobsError(e instanceof Error ? e.message : 'טעינת הפניות נכשלה')
        }
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, tab, existingAccount?.id])

  useEffect(() => {
    if (!open || tab !== 'domains' || !existingAccount?.id) {
      return
    }

    let cancelled = false
    setCoverageLoading(true)
    setCoverageError(null)

    void getAccountCoverageHistory(existingAccount.id)
      .then((rows) => {
        if (!cancelled) setCoverageRows(Array.isArray(rows) ? rows : [])
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setCoverageRows([])
          setCoverageError(
            e instanceof Error ? e.message : 'טעינת היסטוריית התחומים והערים נכשלה',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCoverageLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, tab, existingAccount?.id, existingAccount?.updatedAt])

  useEffect(() => {
    if (!open || tab !== 'standing-order' || !existingAccount?.id) {
      return
    }

    let cancelled = false
    setStandingOrder(null)
    setStandingOrderLoading(true)
    setStandingOrderError(null)

    void getAccountStandingOrder(existingAccount.id)
      .then((row) => {
        if (!cancelled) setStandingOrder(row)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setStandingOrder(null)
          setStandingOrderError(e instanceof Error ? e.message : 'טעינת הוראת הקבע נכשלה')
        }
      })
      .finally(() => {
        if (!cancelled) setStandingOrderLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, tab, existingAccount?.id])

  const title = isNew
    ? 'ספק חדש'
    : form.accountName || existingAccount?.accountName || 'פרטי ספק'
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
      <Field label="שם" required={isNew}>
        <TextField
          fullWidth
          size="small"
          value={form.accountName || ''}
          onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
          sx={accountFieldInputSx}
          slotProps={{ input: rtlInput }}
        />
      </Field>
      <Field label="טלפון" required={isNew}>
        <TextField
          fullWidth
          size="small"
          value={form.phoneNumber || ''}
          onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          sx={accountFieldInputSx}
          slotProps={{ input: phoneInput }}
        />
      </Field>
      <Field label="מייל">
        <TextField
          fullWidth
          size="small"
          type="email"
          value={form.email || ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
          sx={accountFieldInputSx}
          slotProps={{ input: ltrInput }}
          placeholder="name@example.com"
        />
      </Field>
      <Field label="סיסמה" required={isNew}>
        <TextField
          fullWidth
          size="small"
          value={form.password ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          sx={accountFieldInputSx}
          slotProps={{ input: ltrInput }}
          helperText={isNew ? 'מינימום 8 תווים' : 'מינימום 8 תווים. נקה את השדה כדי לא לשנות את הסיסמה'}
        />
      </Field>
      <Field label="מספר ת.ז / ח.פ" required={isNew}>
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
      {!isNew ? (
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
      ) : null}
      <Field label="הגבלת פניות ביום">
        <TextField
          fullWidth
          size="small"
          type="number"
          value={form.dailyInquiryLimit ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              dailyInquiryLimit: e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
            }))
          }
          sx={accountFieldInputSx}
          helperText="ריק = ללא הגבלה"
        />
      </Field>
      <Field label="תאריך הצטרפות">
        <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
          {isNew ? '—' : formatCsDateTime(existingAccount?.createdAt)}
        </Typography>
      </Field>
      <Field label="עודכן לאחרונה">
        <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
          {isNew ? '—' : formatCsDateTime(existingAccount?.updatedAt)}
        </Typography>
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
      {!isNew ? renderCoverageSection() : null}
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
          value={availabilitySelectValue(form.availability)}
          onChange={(e) => {
            const v = e.target.value
            const availability = v === '' ? null : Number.parseInt(String(v), 10)
            if (availability !== 2) {
              setExtendDaysInput('')
              setPermanentOff(false)
            }
            setForm((f) => {
              const next: AccountInput = {
                ...f,
                availability,
                perfectoStatus: perfectoStatusForAvailability(availability, f.perfectoStatus),
              }
              if (availability !== 2) {
                delete next.availabilityOffExtendDays
                delete next.availabilityOffPermanent
                if (
                  Number(existingAccount?.availability) === 2 &&
                  offStartedMoreThanWeekAgo(existingAccount?.availabilityOffSince)
                ) {
                  next.availabilitySelfOffBlocked = true
                }
              }
              return next
            })
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
        <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary', lineHeight: 1.45 }}>
          בחירה ב«זמין» / «לא זמין (כיבוי ידני)» נשמרת ולא נדרסת אוטומטית משעות העבודה.
          מעבר לכיבוי ידני בלי הארכה נותן שבוע.
        </Typography>
        {!isNew ? (
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.5 }}>
              {availabilityOffStatusText(existingAccount)}
            </Typography>
            <TextField
              label="הארכת כיבוי בימים"
              type="number"
              size="small"
              fullWidth
              value={extendDaysInput}
              disabled={saving || permanentOff}
              onChange={(e) => {
                const raw = e.target.value
                setExtendDaysInput(raw)
                setPermanentOff(false)
                const days = Number.parseInt(raw, 10)
                setForm((f) => {
                  const next: AccountInput = { ...f }
                  delete next.availabilityOffPermanent
                  if (!raw.trim() || !Number.isInteger(days) || days < 1) {
                    delete next.availabilityOffExtendDays
                    return next
                  }
                  const availability = 2
                  return {
                    ...next,
                    availability,
                    availabilityOffExtendDays: Math.min(365, days),
                    perfectoStatus: perfectoStatusForAvailability(availability, f.perfectoStatus),
                  }
                })
              }}
              slotProps={{ htmlInput: { min: 1, max: 365 } }}
              helperText="נוסף לזמן שנשאר. אם הזמינות דולקת, מתחיל כיבוי למספר הימים."
              sx={{ mt: 1.25 }}
            />
            <FormControlLabel
              sx={{ m: 0, mt: 1, direction: 'rtl' }}
              control={(
                <Switch
                  checked={permanentOff}
                  disabled={saving}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setPermanentOff(checked)
                    setExtendDaysInput('')
                    setForm((f) => {
                      const next: AccountInput = { ...f }
                      delete next.availabilityOffExtendDays
                      if (!checked) {
                        delete next.availabilityOffPermanent
                        return next
                      }
                      const availability = 2
                      return {
                        ...next,
                        availability,
                        availabilityOffPermanent: true,
                        perfectoStatus: perfectoStatusForAvailability(availability, f.perfectoStatus),
                      }
                    })
                  }}
                />
              )}
              label="כיבוי קבוע"
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.45 }}>
              נשאר כבוי עד ששירות הלקוחות מדליק אותו שוב.
            </Typography>
            <FormControlLabel
              sx={{ m: 0, mt: 1, direction: 'rtl' }}
              control={(
                <Switch
                  checked={form.availabilitySelfOffBlocked ?? existingAccount?.availabilitySelfOffBlocked === true}
                  disabled={saving}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setForm((f) => ({ ...f, availabilitySelfOffBlocked: checked }))
                  }}
                />
              )}
              label="חסימת כיבוי עצמי"
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.45 }}>
              כשדלוק, בעל המקצוע לא יכול לכבות זמינות לבד וצריך אישור מהתמיכה.
            </Typography>
          </Box>
        ) : null}
      </Field>
      {!isNew ? (
        <Field label="דמי הקמה">
          <FormControlLabel
            sx={{
              m: 0,
              mt: 0.5,
              direction: 'rtl',
              '& .MuiFormControlLabel-label': { textAlign: 'right', fontSize: 14 },
            }}
            control={(
              <Switch
                checked={form.membershipPaid === true}
                onChange={(e) => setForm((f) => ({ ...f, membershipPaid: e.target.checked }))}
              />
            )}
            label={form.membershipPaid === true ? 'שולם' : 'לא שולם'}
          />
        </Field>
      ) : null}
      {!isNew ? (
        <Field label="כרטיס אשראי שמור">
          <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.primary' }}>
            {hasSavedCard ? 'יש כרטיס שמור במערכת' : 'אין כרטיס שמור'}
          </Typography>
          {hasSavedCard ? (
            <Button
              variant="outlined"
              color="error"
              size="small"
              sx={{ mt: 1.5 }}
              disabled={saving || clearingSavedCard}
              onClick={() => {
                if (!existingAccount?.id) return
                if (
                  !window.confirm(
                    'למחוק את כרטיס האשראי השמור של הספק? לא ניתן לחייב לידים עד שישמור כרטיס חדש.',
                  )
                ) {
                  return
                }
                setSavedCardError(null)
                setClearingSavedCard(true)
                void deleteAccountSavedCard(existingAccount.id)
                  .then((updated) => {
                    setHasSavedCard(false)
                    onAccountPatch?.(updated)
                  })
                  .catch((e: unknown) => {
                    setSavedCardError(
                      e instanceof Error ? e.message : 'מחיקת הכרטיס השמור נכשלה',
                    )
                  })
                  .finally(() => {
                    setClearingSavedCard(false)
                  })
              }}
            >
              {clearingSavedCard ? <CircularProgress size={18} color="inherit" /> : 'מחק כרטיס שמור'}
            </Button>
          ) : null}
          {savedCardError ? (
            <Typography sx={{ mt: 1, fontSize: 13, color: 'error.main' }}>
              {savedCardError}
            </Typography>
          ) : null}
        </Field>
      ) : null}
      <Field label="טלפון (תצוגה)">
        <Typography sx={{ mt: 0.5, fontSize: 14, color: ACCOUNT_PHONE_EMPHASIS, fontWeight: 600 }}>
          {formatCsPhoneDisplay(form.phoneNumber)}
        </Typography>
      </Field>
    </Box>
  )

  const runStandingOrderAction = (action: Exclude<StandingOrderAction, 'freeze'>) => {
    if (!existingAccount?.id || standingOrderAction) return
    const prompts: Record<Exclude<StandingOrderAction, 'freeze'>, string> = {
      stop: 'לעצור את הוראת הקבע? החיובים הבאים ייעצרו, ואפשר להפעיל מחדש אחר כך.',
      delete: 'למחוק את הוראת הקבע? החיובים ייעצרו והמזהה יימחק. אי אפשר להפעיל מחדש מהמערכת.',
      resume: 'להפעיל מחדש את הוראת הקבע? החיוב החודשי יחזור.',
    }
    if (!window.confirm(prompts[action])) return
    setStandingOrderError(null)
    setStandingOrderAction(action)
    void updateAccountStandingOrder(existingAccount.id, action)
      .then((row) => {
        setStandingOrder(row)
        onStandingOrderChange?.(existingAccount.id, row.status !== 'none')
      })
      .catch((e: unknown) => {
        setStandingOrderError(e instanceof Error ? e.message : 'עדכון הוראת הקבע נכשל')
      })
      .finally(() => setStandingOrderAction(null))
  }

  const renderStandingOrderTab = () => {
    if (isNew) {
      return (
        <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center', py: 4 }}>
          שמור את הספק כדי לנהל הוראת קבע.
        </Typography>
      )
    }

    if (standingOrderLoading && !standingOrder) {
      return (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Stack>
      )
    }

    const status = standingOrder?.status ?? 'none'
    const statusLabel =
      status === 'active'
        ? 'פעילה'
        : status === 'frozen'
          ? 'מוקפאת'
          : status === 'stopped'
            ? 'עצורה'
            : 'אין הוראת קבע'
    const statusColor =
      status === 'active'
        ? { bg: '#E5F6E8', fg: '#1B7A32' }
        : status === 'frozen'
          ? { bg: '#FFF4E5', fg: '#9A5B00' }
          : status === 'stopped'
            ? { bg: '#FDECEC', fg: '#B42318' }
            : { bg: 'action.hover', fg: 'text.secondary' }
    const busy = standingOrderAction !== null
    const hasOrder = status === 'active' || status === 'frozen' || status === 'stopped'
    const subscription = standingOrder?.subscription

    return (
      <Stack spacing={2}>
        {standingOrder && !standingOrder.columnReady ? (
          <Typography sx={{ color: 'error.main', fontSize: 14 }}>
            חסרה עמודת ההוראה במסד. יש להריץ את migrations/20261115-accounts-hyp-hk-id.sql
          </Typography>
        ) : null}
        {subscription ? (
          <Field label="סוג מנוי" fullWidth>
            <Chip
              size="small"
              label={
                subscription.amountIls != null
                  ? `${subscription.label} · ₪${subscription.amountIls.toLocaleString('he-IL')}`
                  : subscription.label
              }
              sx={{
                mt: 0.5,
                fontWeight: 700,
                bgcolor: subscription.key === 'none' ? 'action.hover' : '#FFF8D6',
                color: subscription.key === 'none' ? 'text.secondary' : '#6B5200',
              }}
            />
            {subscription.paidAt ? (
              <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                {`שולם לאחרונה: ${new Date(subscription.paidAt).toLocaleDateString('he-IL')}`}
              </Typography>
            ) : null}
          </Field>
        ) : null}
        <Field label="סטטוס" fullWidth>
          <Chip
            size="small"
            label={statusLabel}
            sx={{ mt: 0.5, fontWeight: 700, bgcolor: statusColor.bg, color: statusColor.fg }}
          />
          <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
            {hasOrder
              ? `מזהה Hyp: ${standingOrder?.hkId}`
              : 'הוראת קבע נוצרת אחרי שספק חדש משלם דמי ניהול.'}
          </Typography>
        </Field>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>
          עצירה עוצרת את החיובים הבאים ב-Hyp ושומרת את המזהה כדי שאפשר יהיה להפעיל מחדש.
          מחיקה עוצרת את החיובים ומוחקת את המזהה.
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {status === 'frozen' || status === 'stopped' ? (
            <Button
              variant="contained"
              size="small"
              disabled={busy}
              onClick={() => runStandingOrderAction('resume')}
            >
              {standingOrderAction === 'resume' ? <CircularProgress size={18} color="inherit" /> : 'הפעלה מחדש'}
            </Button>
          ) : null}
          <Button
            variant="outlined"
            size="small"
            disabled={busy || (status !== 'active' && status !== 'frozen')}
            onClick={() => runStandingOrderAction('stop')}
          >
            {standingOrderAction === 'stop' ? <CircularProgress size={18} color="inherit" /> : 'עצירה'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            disabled={busy || !hasOrder}
            onClick={() => runStandingOrderAction('delete')}
          >
            {standingOrderAction === 'delete' ? <CircularProgress size={18} color="inherit" /> : 'מחיקה'}
          </Button>
        </Stack>
        {standingOrderError ? (
          <Typography sx={{ fontSize: 13, color: 'error.main' }}>{standingOrderError}</Typography>
        ) : null}
      </Stack>
    )
  }

  const renderJobsTab = () => {
    if (isNew) {
      return (
        <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center', py: 4 }}>
          שמור את הספק כדי לצפות בפניות המקושרות אליו.
        </Typography>
      )
    }

    if (jobsLoading) {
      return (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Stack>
      )
    }

    if (jobsError) {
      return (
        <Typography sx={{ color: 'error.main', fontSize: 14, textAlign: 'center', py: 4 }}>
          {jobsError}
        </Typography>
      )
    }

    if (linkedJobs.length === 0) {
      return (
        <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center', py: 4 }}>
          אין פניות המקושרות לספק זה.
        </Typography>
      )
    }

    return (
      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>לקוח</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>טלפון</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>תיאור</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>תחום</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>עיר</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>סטטוס</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>נוצר</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {linkedJobs.map((row) => {
              const statusColors = jobStatusChipColors(row.statusLabel)
              const customerLabel =
                String(row.customerName || '').trim() || row.accountName || '—'
              const phone = row.customerPhone || row.phoneNumber

              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.id}</TableCell>
                  <TableCell title={customerLabel}>{customerLabel}</TableCell>
                  <TableCell sx={{ direction: 'ltr', textAlign: 'right' }}>
                    {formatCsPhoneDisplay(phone) || '—'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }} title={row.description}>
                    {row.description || '—'}
                  </TableCell>
                  <TableCell>{row.leadDomain || row.specialtiesCategory || '—'}</TableCell>
                  <TableCell>{row.city || '—'}</TableCell>
                  <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                    <Chip
                      size="small"
                      label={row.statusLabel || '—'}
                      sx={{
                        bgcolor: statusColors.bg,
                        color: statusColors.fg,
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatCsDateTime(row.created)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  const renderCoverageSection = () => (
    <Box
      sx={{
        mt: 1,
        pt: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.5 }}>היסטוריית שינויים</Typography>
      {coverageLoading ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : coverageError ? (
        <Typography sx={{ color: 'error.main', fontSize: 14 }}>{coverageError}</Typography>
      ) : coverageRows.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          אין שינויי תחומים או ערים שמורים עדיין
        </Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 220 }}>תאריך</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>תחומים</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ערים</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coverageRows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    {formatCoverageWindow(row)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {formatCoverageList(row.specialties)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {formatCoverageList(row.cities)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )

  const tabContent =
    tab === 'phone'
      ? renderPhoneTab()
      : tab === 'domains'
        ? renderDomainsTab()
        : tab === 'jobs'
          ? renderJobsTab()
          : tab === 'standing-order'
            ? renderStandingOrderTab()
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
            {isNew ? title : `הפרטים של ${title}`}
          </Typography>
        )}
        onClose={() => !saving && onClose()}
        closeDisabled={saving}
        onRequestDelete={isNew ? undefined : () => void onDelete()}
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
          {visibleTabs.map((t) => (
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
          <Box sx={{ position: 'relative' }}>
            <Box aria-hidden inert sx={{ visibility: 'hidden' }}>
              {renderPhoneTab()}
            </Box>
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
              {tabContent}
            </Box>
          </Box>
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
            {saving ? 'שומר…' : isNew ? 'יצירה' : 'שמירה'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
