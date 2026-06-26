import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FilterOptionsState } from '@mui/material/useAutocomplete'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import {
  getAccounts,
  getCities,
  getServices,
  type Account,
  type City,
  type Service,
} from '../api/csApi'
import {
  accountMatchesCityAndDomain,
  formatAccountCitiesDisplay,
  formatAccountDomainsDisplay,
  formatAccountStatusAvailabilityDisplay,
} from '../lib/accountsUi'
import { csDataTableSx } from '../lib/csTableUi'

type BreakdownRow = { label: string; count: number }

const DOMAIN_PICKER_ANCHOR = 'אינסטלציה'
const DOMAIN_PICKER_SUGGESTION_COUNT = 5
const SUPPLIER_ROW_HIGHLIGHT_MIN = 3
const SUPPLIER_ROW_HIGHLIGHT_BG = '#E8F5E9'

function supplierRowHighlightSx(active: boolean) {
  if (!active) return undefined
  const bg = `${SUPPLIER_ROW_HIGHLIGHT_BG} !important`
  return {
    backgroundColor: bg,
    '& td': { backgroundColor: bg },
    '&:hover': { backgroundColor: bg },
    '&:hover td': { backgroundColor: bg },
  }
}

function buildDomainPickerSuggestions(allDomains: string[]): string[] {
  const unique = Array.from(
    new Set([DOMAIN_PICKER_ANCHOR, ...allDomains.map((d) => d.trim()).filter(Boolean)]),
  )
  const anchor = unique.find((d) => d === DOMAIN_PICKER_ANCHOR) ?? DOMAIN_PICKER_ANCHOR
  const rest = unique
    .filter((d) => d !== anchor)
    .sort((a, b) => a.localeCompare(b, 'he'))
    .slice(0, DOMAIN_PICKER_SUGGESTION_COUNT - 1)
  return [anchor, ...rest].slice(0, DOMAIN_PICKER_SUGGESTION_COUNT)
}

function domainAutocompleteOptions(allDomains: string[]): string[] {
  const set = new Set<string>([DOMAIN_PICKER_ANCHOR, ...allDomains])
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
}

function buildDomainOptions(services: Service[]): string[] {
  const set = new Set<string>()
  for (const s of services) {
    const cat = String(s.category || '').trim()
    const svc = String(s.service || '').trim()
    if (cat) set.add(cat)
    if (svc) set.add(svc)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
}

function uniqueCatalogCities(rows: City[]): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    const city = String(r.city || '').trim()
    if (city) set.add(city)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
}

type SuppliersPopup = { domain: string; city: string }

const countCellClickableSx = {
  cursor: 'pointer',
  color: 'primary.main',
  fontWeight: 700,
  textDecoration: 'underline',
  '&:hover': { opacity: 0.85 },
} as const

function countSuppliersInCityAndDomain(
  accounts: Account[],
  city: string,
  domain: string,
): number {
  return accounts.filter((a) => accountMatchesCityAndDomain(a, city, domain)).length
}

function suppliersInCityAndDomain(
  accounts: Account[],
  city: string,
  domain: string,
): Account[] {
  return accounts.filter((a) => accountMatchesCityAndDomain(a, city, domain))
}

function sortBreakdownRows(rows: BreakdownRow[]): BreakdownRow[] {
  return [...rows].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'he')
  })
}

function BreakdownTable({
  rows,
  nameColumn,
  emptyMessage,
  highlightMinCount,
  onCountClick,
}: {
  rows: BreakdownRow[]
  nameColumn: string
  emptyMessage: string
  highlightMinCount?: number
  onCountClick?: (city: string, count: number) => void
}) {
  const theme = useTheme()

  if (rows.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'right' }}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
      <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
        <TableHead>
          <TableRow>
            <TableCell>{nameColumn}</TableCell>
            <TableCell>מספר ספקים</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const highlightRow =
              highlightMinCount != null && row.count >= highlightMinCount
            return (
            <TableRow
              key={row.label}
              hover
              sx={supplierRowHighlightSx(highlightRow)}
            >
              <TableCell>{row.label}</TableCell>
              <TableCell
                onClick={
                  row.count > 0 && onCountClick
                    ? () => onCountClick(row.label, row.count)
                    : undefined
                }
                sx={row.count > 0 && onCountClick ? countCellClickableSx : undefined}
                title={row.count > 0 && onCountClick ? 'הצג רשימת ספקים' : undefined}
              >
                {row.count}
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function CitiesPage() {
  const theme = useTheme()
  const [rows, setRows] = useState<City[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [suppliersPopup, setSuppliersPopup] = useState<SuppliersPopup | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cities, accs, svc] = await Promise.all([getCities(), getAccounts(), getServices()])
      setRows(Array.isArray(cities) ? cities : [])
      setAccounts(Array.isArray(accs) ? accs : [])
      setServices(Array.isArray(svc) ? svc : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const catalogCities = useMemo(() => uniqueCatalogCities(rows), [rows])

  const domainOptions = useMemo(() => buildDomainOptions(services), [services])
  const domainAutocompleteList = useMemo(
    () => domainAutocompleteOptions(domainOptions),
    [domainOptions],
  )
  const domainPickerSuggestions = useMemo(
    () => buildDomainPickerSuggestions(domainOptions),
    [domainOptions],
  )

  const filterDomainAutocompleteOptions = useCallback(
    (options: string[], state: FilterOptionsState<string>) => {
      const q = state.inputValue.trim().toLowerCase()
      if (!q) return domainPickerSuggestions
      return options.filter((option) => option.toLowerCase().includes(q))
    },
    [domainPickerSuggestions],
  )

  const selectedDomainCityRows = useMemo((): BreakdownRow[] => {
    if (!selectedDomain) return []
    return sortBreakdownRows(
      catalogCities.map((city) => ({
        label: city,
        count: countSuppliersInCityAndDomain(accounts, city, selectedDomain),
      })),
    )
  }, [selectedDomain, catalogCities, accounts])

  const popupSuppliers = useMemo(() => {
    if (!suppliersPopup) return []
    return suppliersInCityAndDomain(accounts, suppliersPopup.city, suppliersPopup.domain).sort(
      (a, b) => String(a.accountName || '').localeCompare(String(b.accountName || ''), 'he'),
    )
  }, [suppliersPopup, accounts])

  const handleCountClick = useCallback(
    (city: string, _count: number) => {
      if (!selectedDomain) return
      setSuppliersPopup({ domain: selectedDomain, city })
    },
    [selectedDomain],
  )

  return (
    <Card elevation={1} sx={{ borderRadius: 3, direction: 'rtl', textAlign: 'right' }}>
      <CardContent sx={{ direction: 'rtl', textAlign: 'right' }}>
        <Stack spacing={2} sx={{ direction: 'rtl', textAlign: 'right' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <Autocomplete
              options={domainAutocompleteList}
              value={selectedDomain}
              onChange={(_e, value) => {
                setSelectedDomain(value)
                setSuppliersPopup(null)
              }}
              openOnFocus
              filterOptions={filterDomainAutocompleteOptions}
              noOptionsText="אין תחומים"
              sx={{ flex: 1, minWidth: 0, direction: 'rtl' }}
              slotProps={{ paper: { sx: { direction: 'rtl' } } }}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="בחר או חפש תחום…" />
              )}
            />
            <Button variant="outlined" onClick={() => void load()} sx={{ flexShrink: 0 }}>
              רענון
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>טוען…</Box>
          ) : selectedDomain ? (
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                ערים בתחום: {selectedDomain}
              </Typography>
              <BreakdownTable
                rows={selectedDomainCityRows}
                nameColumn="עיר"
                emptyMessage="אין ערים ברשימה"
                highlightMinCount={SUPPLIER_ROW_HIGHLIGHT_MIN}
                onCountClick={handleCountClick}
              />
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'right' }}>
              בחר תחום מהרשימה כדי לראות כמה ספקים יש בכל עיר
            </Typography>
          )}
        </Stack>
      </CardContent>

      <Dialog
        open={!!suppliersPopup}
        onClose={() => setSuppliersPopup(null)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, direction: 'rtl' } } }}
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
          <Typography component="span" sx={{ fontWeight: 800, fontSize: 18 }}>
            {suppliersPopup
              ? `ספקים · ${suppliersPopup.domain} · ${suppliersPopup.city} (${popupSuppliers.length})`
              : 'ספקים'}
          </Typography>
          <IconButton aria-label="סגירה" onClick={() => setSuppliersPopup(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {popupSuppliers.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, px: 2, textAlign: 'right' }}>
              אין ספקים להצגה
            </Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 'min(70vh, 520px)' }}>
              <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>תחומים</TableCell>
                    <TableCell>ערים</TableCell>
                    <TableCell>קרדיטים</TableCell>
                    <TableCell>סטטוס זמינות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {popupSuppliers.map((account) => (
                    <TableRow key={account.id} hover>
                      <TableCell>{account.accountName || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }} title={formatAccountDomainsDisplay(account)}>
                        {formatAccountDomainsDisplay(account)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }} title={formatAccountCitiesDisplay(account)}>
                        {formatAccountCitiesDisplay(account)}
                      </TableCell>
                      <TableCell>{account.credits ?? '—'}</TableCell>
                      <TableCell>{formatAccountStatusAvailabilityDisplay(account)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
