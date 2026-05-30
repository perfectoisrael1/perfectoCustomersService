import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
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
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  getAccounts,
  getCities,
  getServices,
  type Account,
  type City,
  type Service,
} from '../api/csApi'
import {
  accountMatchesAnyCity,
  accountMatchesCity,
  accountMatchesDomain,
} from '../lib/accountsUi'
import { csDataTableSx } from '../lib/csTableUi'

type CityTab = 'list' | 'domains'

type BreakdownRow = { label: string; count: number }

type DrillDownFilter =
  | { kind: 'city'; label: string }
  | { kind: 'region'; label: string }
  | { kind: 'domain'; label: string }

const clickableCellSx = {
  cursor: 'pointer',
  color: 'primary.main',
  fontWeight: 600,
  '&:hover': { textDecoration: 'underline' },
} as const

function highlightCellSx(hasSuppliers: boolean) {
  return {
    ...clickableCellSx,
    textDecoration: hasSuppliers ? 'underline' : 'none',
  }
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

function countSuppliersInCity(accounts: Account[], city: string): number {
  return accounts.filter((a) => accountMatchesCity(a.workingAreas, city)).length
}

function countSuppliersInCityAndDomain(
  accounts: Account[],
  city: string,
  domain: string,
): number {
  return accounts.filter(
    (a) =>
      accountMatchesCity(a.workingAreas, city) &&
      accountMatchesDomain(a.specialties, a.specialtiesCategory, domain),
  ).length
}

function countSuppliersInDomain(accounts: Account[], domain: string): number {
  return accounts.filter((a) =>
    accountMatchesDomain(a.specialties, a.specialtiesCategory, domain),
  ).length
}

function sortBreakdownRows(rows: BreakdownRow[]): BreakdownRow[] {
  return [...rows].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'he')
  })
}

function drillDownTitle(filter: DrillDownFilter): string {
  if (filter.kind === 'city') return `תחומים בעיר: ${filter.label}`
  if (filter.kind === 'region') return `ערים באזור: ${filter.label}`
  return `ערים בתחום: ${filter.label}`
}

function BreakdownTable({
  rows,
  nameColumn,
  emptyMessage,
}: {
  rows: BreakdownRow[]
  nameColumn: string
  emptyMessage: string
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
          {rows.map((row) => (
            <TableRow key={row.label} hover>
              <TableCell>{row.label}</TableCell>
              <TableCell>{row.count}</TableCell>
            </TableRow>
          ))}
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
  const [tab, setTab] = useState<CityTab>('list')
  const [query, setQuery] = useState('')
  const [domainQuery, setDomainQuery] = useState('')
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null)

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

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        String(r.city || '').toLowerCase().includes(q) ||
        String(r.region || '').toLowerCase().includes(q),
    )
  }, [rows, query])

  const catalogCities = useMemo(() => uniqueCatalogCities(rows), [rows])

  const citiesByRegion = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const r of rows) {
      const region = String(r.region || '—').trim() || '—'
      const city = String(r.city || '').trim()
      if (!city) continue
      if (!map.has(region)) map.set(region, [])
      const list = map.get(region)!
      if (!list.includes(city)) list.push(city)
    }
    return map
  }, [rows])

  const citiesWithSuppliers = useMemo(() => {
    const set = new Set<string>()
    for (const city of catalogCities) {
      if (countSuppliersInCity(accounts, city) > 0) set.add(city)
    }
    return set
  }, [catalogCities, accounts])

  const regionsWithSuppliers = useMemo(() => {
    const set = new Set<string>()
    for (const [region, cities] of citiesByRegion) {
      if (accounts.some((a) => accountMatchesAnyCity(a.workingAreas, cities))) {
        set.add(region)
      }
    }
    return set
  }, [citiesByRegion, accounts])

  const regionKey = (region: string | null | undefined) =>
    String(region || '—').trim() || '—'

  const domainOptions = useMemo(() => buildDomainOptions(services), [services])

  const domainsWithSuppliers = useMemo(() => {
    const set = new Set<string>()
    for (const domain of domainOptions) {
      if (countSuppliersInDomain(accounts, domain) > 0) set.add(domain)
    }
    return set
  }, [domainOptions, accounts])

  const filteredDomains = useMemo(() => {
    const q = domainQuery.trim().toLowerCase()
    if (!q) return domainOptions
    return domainOptions.filter((d) => d.toLowerCase().includes(q))
  }, [domainOptions, domainQuery])

  const breakdownRows = useMemo((): BreakdownRow[] => {
    if (!drillDown) return []

    if (drillDown.kind === 'city') {
      return sortBreakdownRows(
        domainOptions
          .map((domain) => ({
            label: domain,
            count: countSuppliersInCityAndDomain(accounts, drillDown.label, domain),
          }))
          .filter((r) => r.count > 0),
      )
    }

    if (drillDown.kind === 'domain') {
      return sortBreakdownRows(
        catalogCities
          .map((city) => ({
            label: city,
            count: countSuppliersInCityAndDomain(accounts, city, drillDown.label),
          }))
          .filter((r) => r.count > 0),
      )
    }

    const cities = citiesByRegion.get(regionKey(drillDown.label)) ?? []
    return sortBreakdownRows(
      cities
        .map((city) => ({
          label: city,
          count: countSuppliersInCity(accounts, city),
        }))
        .filter((r) => r.count > 0),
    )
  }, [drillDown, accounts, domainOptions, catalogCities, citiesByRegion])

  const breakdownTotal = useMemo(
    () => breakdownRows.reduce((sum, r) => sum + r.count, 0),
    [breakdownRows],
  )

  const openCity = (city: string, e?: MouseEvent) => {
    e?.stopPropagation()
    setDrillDown({ kind: 'city', label: city })
  }

  const openRegion = (region: string, e?: MouseEvent) => {
    e?.stopPropagation()
    setDrillDown({ kind: 'region', label: region })
  }

  const openDomain = (domain: string) => {
    setDrillDown({ kind: 'domain', label: domain })
  }

  const handleTabChange = (_e: unknown, v: CityTab) => {
    setTab(v)
    setDrillDown(null)
  }

  if (drillDown) {
    const nameColumn =
      drillDown.kind === 'city' ? 'תחום' : drillDown.kind === 'domain' ? 'עיר' : 'עיר'
    const emptyMessage =
      drillDown.kind === 'city'
        ? 'אין ספקים בעיר זו'
        : drillDown.kind === 'domain'
          ? 'אין ספקים בתחום זה'
          : 'אין ספקים באזור זה'

    return (
      <Card elevation={1} sx={{ borderRadius: 3, direction: 'rtl', textAlign: 'right' }}>
        <CardContent sx={{ direction: 'rtl', textAlign: 'right' }}>
          <Stack spacing={2} sx={{ direction: 'rtl', textAlign: 'right' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', direction: 'rtl' }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setDrillDown(null)}
                sx={{
                  '& .MuiButton-startIcon': { marginInlineEnd: '8px', marginInlineStart: 0 },
                }}
              >
                חזרה
              </Button>
              <Typography sx={{ fontWeight: 800, flex: 1 }}>{drillDownTitle(drillDown)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {breakdownTotal} ספקים · {breakdownRows.length} שורות
              </Typography>
            </Stack>
            <BreakdownTable rows={breakdownRows} nameColumn={nameColumn} emptyMessage={emptyMessage} />
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={1} sx={{ borderRadius: 3, direction: 'rtl', textAlign: 'right' }}>
      <CardContent sx={{ direction: 'rtl', textAlign: 'right' }}>
        <Stack spacing={2} sx={{ direction: 'rtl', textAlign: 'right' }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="list" label="כל הערים" />
            <Tab value="domains" label="כל התחומים" />
          </Tabs>

          {tab === 'domains' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                placeholder="חיפוש תחום…"
                value={domainQuery}
                onChange={(e) => setDomainQuery(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={() => void load()}>
                רענון
              </Button>
            </Stack>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                placeholder="חיפוש עיר או אזור…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={() => void load()}>
                רענון
              </Button>
            </Stack>
          )}

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>טוען…</Box>
          ) : tab === 'list' ? (
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
                <TableHead>
                  <TableRow>
                    <TableCell>אזור</TableCell>
                    <TableCell>עיר</TableCell>
                    <TableCell>slug</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredList.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell
                        sx={highlightCellSx(regionsWithSuppliers.has(regionKey(row.region)))}
                        onClick={(e) => openRegion(row.region, e)}
                        title="הצג ערים ומספר ספקים באזור"
                      >
                        {row.region}
                      </TableCell>
                      <TableCell
                        sx={highlightCellSx(citiesWithSuppliers.has(String(row.city || '').trim()))}
                        onClick={(e) => openCity(row.city, e)}
                        title="הצג תחומים ומספר ספקים בעיר"
                      >
                        {row.city}
                      </TableCell>
                      <TableCell>{row.slug || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ py: 6, textAlign: 'right' }}>
                        אין נתונים
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
                <TableHead>
                  <TableRow>
                    <TableCell>תחום</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDomains.map((domain) => (
                    <TableRow key={domain} hover>
                      <TableCell
                        sx={highlightCellSx(domainsWithSuppliers.has(domain))}
                        onClick={() => openDomain(domain)}
                        title="הצג ערים ומספר ספקים בתחום"
                      >
                        {domain}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDomains.length === 0 ? (
                    <TableRow>
                      <TableCell sx={{ py: 6, textAlign: 'right' }}>
                        אין נתונים
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
