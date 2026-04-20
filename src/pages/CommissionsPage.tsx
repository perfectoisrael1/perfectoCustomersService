import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getServices, type Service } from '../api/csApi'

type SearchOpt = { type: 'category' | 'service'; value: string; label: string }

type CommissionRow = {
  categoryName: string
  serviceName: string
  commission: string
  minimumCommission: string | null
  fixedCommissionAmount: string | null
}

const normalizeText = (v: unknown) => String(v || '').trim().toLowerCase()

function mapServiceToRows(services: Service[]): CommissionRow[] {
  return services.map((r) => ({
    categoryName: String(r.category || '').trim() || '—',
    serviceName: [r.service, r.subService].filter(Boolean).join(' · ') || '—',
    commission: r.price != null ? `${r.price} ₪` : '—',
    minimumCommission: null,
    fixedCommissionAmount: null,
  }))
}

export default function CommissionsPage() {
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState<SearchOpt | string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getServices()
      setRows(mapServiceToRows(Array.isArray(data) ? data : []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת מחירון')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const searchOptions = useMemo(() => {
    const categories = Array.from(new Set(rows.map((r) => r.categoryName).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map((name) => ({ type: 'category' as const, value: name, label: name }))
    const services = Array.from(new Set(rows.map((r) => r.serviceName).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map((name) => ({ type: 'service' as const, value: name, label: name }))
    return [...categories, ...services]
  }, [rows])

  const filtered = useMemo(() => {
    const selected = searchValue
    const q = normalizeText(
      (selected && typeof selected === 'object' ? selected.value : '') || searchInput,
    )
    if (!q) return rows

    if (selected && typeof selected === 'object' && selected.type === 'category') {
      return rows.filter((r) => normalizeText(r.categoryName) === q)
    }
    if (selected && typeof selected === 'object' && selected.type === 'service') {
      return rows.filter((r) => normalizeText(r.serviceName).includes(q))
    }

    return rows.filter((r) => {
      const cn = normalizeText(r.categoryName)
      const sn = normalizeText(r.serviceName)
      return cn.includes(q) || sn.includes(q)
    })
  }, [searchValue, searchInput, rows])

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, CommissionRow[]>()
    for (const r of filtered) {
      const key = r.categoryName || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
  }, [filtered])

  const searchQuery = normalizeText(
    (searchValue && typeof searchValue === 'object' ? searchValue.value : '') || searchInput,
  )
  const hasActiveSearch = Boolean(searchQuery)

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryName)) next.delete(categoryName)
      else next.add(categoryName)
      return next
    })
  }

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2} sx={{ direction: 'rtl' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>מחירון עמלות</Typography>

          <Autocomplete
            freeSolo
            options={searchOptions}
            value={searchValue}
            inputValue={searchInput}
            onChange={(_e, value) => setSearchValue(value)}
            onInputChange={(_e, value) => setSearchInput(value || '')}
            getOptionLabel={(opt) => (typeof opt === 'string' ? opt : String(opt?.label || ''))}
            groupBy={(opt) => (typeof opt === 'string' ? '' : opt.type === 'category' ? 'קטגוריות' : 'תחומים')}
            filterOptions={(options, state) => {
              const q = normalizeText(state.inputValue)
              const filteredOpts = q
                ? options.filter((o) => {
                  const label = normalizeText(typeof o === 'string' ? o : o.label)
                  return label.includes(q)
                })
                : options
              return filteredOpts.slice(0, 40)
            }}
            renderOption={(props, option) => (
              <li {...props} key={typeof option === 'string' ? option : `${option.type}-${option.value}`}>
                <span style={{ flex: 1, textAlign: 'right' }}>
                  {typeof option === 'string' ? option : option.label}
                </span>
                {typeof option === 'string' ? null : (
                  <span style={{ marginInlineStart: 10, opacity: 0.7, fontSize: 12 }}>
                    {option.type === 'category' ? 'קטגוריה' : 'תחום'}
                  </span>
                )}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="חיפוש לפי קטגוריה או תחום"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    minHeight: 52,
                  },
                  '& .MuiInputBase-input': { textAlign: 'right', direction: 'rtl' },
                }}
              />
            )}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>כל העמלות</Typography>
            <Typography variant="body2" color="text.secondary">
              {loading ? 'טוען…' : `תוצאות: ${filtered.length}`}
            </Typography>
          </Stack>

          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Typography color="text.secondary">אין תוצאות.</Typography>
          ) : (
            <TableContainerCompat>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>שם הקטגוריה</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>תחום</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>מחיר / עמלה</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>עמלת מינימום</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>סכום קבוע</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedByCategory.map(([categoryName, items]) => {
                    const isExpanded = hasActiveSearch || expandedCategories.has(categoryName)
                    const categoryMatches = hasActiveSearch && normalizeText(categoryName).includes(searchQuery)
                    const highlightBg = 'rgba(255, 221, 0, 0.35)'
                    return (
                      <FragmentRows
                        key={categoryName}
                        categoryName={categoryName}
                        items={items}
                        isExpanded={isExpanded}
                        categoryMatches={categoryMatches}
                        highlightBg={highlightBg}
                        hasActiveSearch={hasActiveSearch}
                        searchQuery={searchQuery}
                        onToggle={() => toggleCategory(categoryName)}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainerCompat>
          )}

          <Button variant="outlined" onClick={() => void load()}>רענון</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function TableContainerCompat({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ width: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
      {children}
    </Box>
  )
}

function FragmentRows({
  categoryName,
  items,
  isExpanded,
  categoryMatches,
  highlightBg,
  hasActiveSearch,
  searchQuery,
  onToggle,
}: {
  categoryName: string
  items: CommissionRow[]
  isExpanded: boolean
  categoryMatches: boolean
  highlightBg: string
  hasActiveSearch: boolean
  searchQuery: string
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        sx={{
          cursor: 'pointer',
          backgroundColor: categoryMatches ? highlightBg : 'action.hover',
          '&:hover': { backgroundColor: categoryMatches ? 'rgba(255, 221, 0, 0.5)' : 'action.selected' },
        }}
        onClick={onToggle}
      >
        <TableCell align="right" sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
            <IconButton size="small" sx={{ p: 0, color: 'primary.main' }} aria-label={isExpanded ? 'סגור' : 'פתח'}>
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
            <span>{categoryName}</span>
          </Box>
        </TableCell>
        <TableCell align="right">({items.length} תחומים)</TableCell>
        <TableCell align="right">{items[0]?.commission ?? '—'}</TableCell>
        <TableCell align="right">{items[0]?.minimumCommission != null ? `${items[0].minimumCommission} ₪` : '—'}</TableCell>
        <TableCell align="right">{items[0]?.fixedCommissionAmount ?? '—'}</TableCell>
      </TableRow>
      {isExpanded &&
        items.map((r, idx) => {
          const serviceMatches = hasActiveSearch && normalizeText(r?.serviceName).includes(searchQuery)
          const rowBg = serviceMatches ? highlightBg : 'inherit'
          return (
            <TableRow key={`${categoryName}-${r.serviceName}-${idx}`} sx={{ backgroundColor: rowBg }}>
              <TableCell align="right" sx={{ pr: 4, backgroundColor: rowBg }} />
              <TableCell align="right" sx={{ backgroundColor: rowBg }}>{r.serviceName || '—'}</TableCell>
              <TableCell align="right" sx={{ backgroundColor: rowBg }}>{r.commission || '—'}</TableCell>
              <TableCell align="right" sx={{ backgroundColor: rowBg }}>{r.minimumCommission != null ? `${r.minimumCommission} ₪` : '—'}</TableCell>
              <TableCell align="right" sx={{ backgroundColor: rowBg }}>{r.fixedCommissionAmount ?? '—'}</TableCell>
            </TableRow>
          )
        })}
    </>
  )
}
