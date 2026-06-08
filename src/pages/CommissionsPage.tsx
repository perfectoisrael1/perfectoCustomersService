import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { createService, getServices, patchCategoryPromotion, patchService, patchServicePrice, type Service } from '../api/csApi'
import { useAuth } from '../context/useAuth'
import { isManagerRole } from '../lib/roles'

type SearchOpt = { type: 'category' | 'service'; value: string; label: string }

type CommissionRow = {
  id: number
  categoryName: string
  service: string
  subService: string | null
  serviceName: string
  price: number | null
  promotion: boolean
  minimumCommission: string | null
  fixedCommissionAmount: string | null
}

function buildServiceName(service: string, subService: string | null): string {
  return [service, subService].filter(Boolean).join(' · ') || '—'
}

const normalizeText = (v: unknown) => String(v || '').trim().toLowerCase()

function formatPrice(price: number | null): string {
  return price != null ? `${price} ₪` : '—'
}

function mapServiceToRows(services: Service[]): CommissionRow[] {
  return services.map((r) => {
    const service = String(r.service || '').trim()
    const subService = r.subService ? String(r.subService).trim() : null
    return {
      id: r.id,
      categoryName: String(r.category || '').trim() || '—',
      service,
      subService,
      serviceName: buildServiceName(service, subService),
      price: r.price != null && Number.isFinite(Number(r.price)) ? Number(r.price) : null,
      promotion: Boolean(r.promotion),
      minimumCommission: null,
      fixedCommissionAmount: null,
    }
  })
}

function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/[^\d]/g, '')
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

const COMMISSION_EDITOR_RTL_FIELD_SX = {
  direction: 'rtl' as const,
  '& .MuiOutlinedInput-root': { direction: 'rtl' as const },
  '& .MuiInputBase-input': { textAlign: 'right', direction: 'rtl' as const },
}

function CommissionField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5, display: 'block', textAlign: 'right' }}>{label}</Typography>
      {children}
    </Box>
  )
}

export default function CommissionsPage() {
  const { user } = useAuth()
  const readOnly = !isManagerRole(user?.role)
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState<SearchOpt | string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set())
  const [draftPrices, setDraftPrices] = useState<Record<number, string>>({})
  const [draftServices, setDraftServices] = useState<Record<number, string>>({})
  const [savingPriceIds, setSavingPriceIds] = useState<Set<number>>(() => new Set())
  const [savingServiceIds, setSavingServiceIds] = useState<Set<number>>(() => new Set())
  const [savingPromotionCategories, setSavingPromotionCategories] = useState<Set<string>>(() => new Set())
  const [rowPriceErrors, setRowPriceErrors] = useState<Record<number, string>>({})
  const [rowServiceErrors, setRowServiceErrors] = useState<Record<number, string>>({})
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const [addFormError, setAddFormError] = useState<string | null>(null)
  const [addCategory, setAddCategory] = useState<string | null>(null)
  const [addCategoryInput, setAddCategoryInput] = useState('')
  const [addService, setAddService] = useState('')
  const [addSubService, setAddSubService] = useState('')
  const [addPrice, setAddPrice] = useState('')

  const resetAddForm = () => {
    setAddCategory(null)
    setAddCategoryInput('')
    setAddService('')
    setAddSubService('')
    setAddPrice('')
    setAddFormError(null)
  }

  const openAddDialog = () => {
    resetAddForm()
    setAddDialogOpen(true)
  }

  const closeAddDialog = () => {
    if (addSaving) return
    setAddDialogOpen(false)
    resetAddForm()
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getServices()
      setRows(mapServiceToRows(Array.isArray(data) ? data : []))
      setDraftPrices({})
      setDraftServices({})
      setRowPriceErrors({})
      setRowServiceErrors({})
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

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.categoryName).filter((name) => name && name !== '—')))
        .sort((a, b) => a.localeCompare(b, 'he')),
    [rows],
  )

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

  const getDraftValue = (row: CommissionRow) =>
    draftPrices[row.id] ?? (row.price != null ? String(row.price) : '')

  const setDraftPriceValue = (rowId: number, value: string) => {
    setDraftPrices((prev) => ({ ...prev, [rowId]: value }))
    setRowPriceErrors((prev) => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const getDraftService = (row: CommissionRow) =>
    draftServices[row.id] ?? row.service

  const setDraftServiceValue = (rowId: number, value: string) => {
    setDraftServices((prev) => ({ ...prev, [rowId]: value }))
    setRowServiceErrors((prev) => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const savePrice = async (row: CommissionRow) => {
    if (row.price == null) return

    const parsed = parsePriceInput(getDraftValue(row))
    if (parsed == null) {
      setRowPriceErrors((prev) => ({ ...prev, [row.id]: 'יש להזין מחיר תקין' }))
      return
    }
    if (parsed > row.price) {
      setRowPriceErrors((prev) => ({
        ...prev,
        [row.id]: `ניתן להוריד מחיר בלבד (מקסימום ${row.price} ₪)`,
      }))
      return
    }
    if (parsed === row.price) {
      setDraftPrices((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      return
    }

    setSavingPriceIds((prev) => new Set(prev).add(row.id))
    setError(null)
    setSuccessMessage(null)
    try {
      const updated = await patchServicePrice(row.id, parsed)
      const nextPrice =
        updated.price != null && Number.isFinite(Number(updated.price))
          ? Number(updated.price)
          : parsed
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, price: nextPrice } : r)),
      )
      setDraftPrices((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setSuccessMessage('המחיר עודכן')
    } catch (err) {
      setRowPriceErrors((prev) => ({
        ...prev,
        [row.id]: err instanceof Error ? err.message : 'שגיאה בשמירת מחיר',
      }))
    } finally {
      setSavingPriceIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  const saveService = async (row: CommissionRow) => {
    const parsed = getDraftService(row).replace(/\s+/g, ' ').trim()
    if (!parsed) {
      setRowServiceErrors((prev) => ({ ...prev, [row.id]: 'יש להזין שם תחום' }))
      return
    }
    if (parsed === row.service) {
      setDraftServices((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      return
    }

    setSavingServiceIds((prev) => new Set(prev).add(row.id))
    setError(null)
    setSuccessMessage(null)
    try {
      const updated = await patchService(row.id, { service: parsed })
      const nextService = String(updated.service || '').trim()
      const nextSubService = updated.subService ? String(updated.subService).trim() : row.subService
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                service: nextService,
                subService: nextSubService,
                serviceName: buildServiceName(nextService, nextSubService),
              }
            : r,
        ),
      )
      setDraftServices((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setSuccessMessage('התחום עודכן')
    } catch (err) {
      setRowServiceErrors((prev) => ({
        ...prev,
        [row.id]: err instanceof Error ? err.message : 'שגיאה בשמירת תחום',
      }))
    } finally {
      setSavingServiceIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  const saveCategoryPromotion = async (categoryName: string, promotion: boolean) => {
    setSavingPromotionCategories((prev) => new Set(prev).add(categoryName))
    setError(null)
    setSuccessMessage(null)
    try {
      await patchCategoryPromotion(categoryName, promotion)
      setRows((prev) =>
        prev.map((r) => (r.categoryName === categoryName ? { ...r, promotion } : r)),
      )
      setSuccessMessage('סטטוס ממומן עודכן')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס ממומן')
    } finally {
      setSavingPromotionCategories((prev) => {
        const next = new Set(prev)
        next.delete(categoryName)
        return next
      })
    }
  }

  const submitAddService = async () => {
    const category = (addCategory ?? addCategoryInput).replace(/\s+/g, ' ').trim()
    const service = addService.replace(/\s+/g, ' ').trim()
    const subService = addSubService.replace(/\s+/g, ' ').trim()
    const price = parsePriceInput(addPrice)

    if (!category) {
      setAddFormError('יש לבחור או להזין קטגוריה')
      return
    }
    if (!service) {
      setAddFormError('יש להזין שם תחום')
      return
    }
    if (price == null) {
      setAddFormError('יש להזין מחיר תקין')
      return
    }

    setAddSaving(true)
    setAddFormError(null)
    setError(null)
    setSuccessMessage(null)
    try {
      const created = await createService({
        category,
        service,
        subService: subService || null,
        price,
      })
      const nextRow = mapServiceToRows([created])[0]
      setRows((prev) => [...prev, nextRow])
      setExpandedCategories((prev) => new Set(prev).add(category))
      setSuccessMessage('התחום נוסף למחירון')
      setAddDialogOpen(false)
      resetAddForm()
    } catch (err) {
      setAddFormError(err instanceof Error ? err.message : 'שגיאה בהוספת תחום')
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2} sx={{ direction: 'rtl' }}>
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
          {successMessage ? (
            <Alert severity="success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          ) : null}

          <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>כל העמלות</Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {loading ? 'טוען…' : `תוצאות: ${filtered.length}`}
              </Typography>
              {!readOnly ? (
                <Button
                  variant="contained"
                  endIcon={<AddIcon />}
                  onClick={openAddDialog}
                  sx={{
                    whiteSpace: 'nowrap',
                    '& .MuiButton-endIcon': {
                      marginInlineStart: '10px',
                      marginInlineEnd: 0,
                    },
                  }}
                >
                  תחום חדש
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {readOnly
              ? 'צפייה בלבד — אין אפשרות לערוך את המחירון.'
              : 'ניתן לערוך תחומים ומחירים. מחירים — רק להוריד, לא להעלות.'}
          </Typography>

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
                    <TableCell align="right" sx={{ fontWeight: 800 }}>יש ממומן</TableCell>
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
                        readOnly={readOnly}
                        onToggle={() => toggleCategory(categoryName)}
                        getDraftPrice={getDraftValue}
                        setDraftPrice={setDraftPriceValue}
                        getDraftService={getDraftService}
                        setDraftService={setDraftServiceValue}
                        onSavePrice={savePrice}
                        onSaveService={saveService}
                        onPromotionChange={saveCategoryPromotion}
                        savingPriceIds={savingPriceIds}
                        savingServiceIds={savingServiceIds}
                        savingPromotionCategories={savingPromotionCategories}
                        rowPriceErrors={rowPriceErrors}
                        rowServiceErrors={rowServiceErrors}
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

      {!readOnly ? (
      <Dialog open={addDialogOpen} onClose={closeAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'right', direction: 'rtl' }}>
          הוספת תחום חדש
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, direction: 'rtl', textAlign: 'right' }}>
          {addFormError ? <Alert severity="error">{addFormError}</Alert> : null}
          <CommissionField label="קטגוריה">
            <Autocomplete
              freeSolo
              options={categoryOptions}
              value={addCategory}
              inputValue={addCategoryInput}
              onChange={(_e, value) => setAddCategory(typeof value === 'string' ? value : value)}
              onInputChange={(_e, value) => setAddCategoryInput(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="בחרו קטגוריה קיימת או הקלידו חדשה"
                  required
                  sx={COMMISSION_EDITOR_RTL_FIELD_SX}
                />
              )}
            />
          </CommissionField>
          <CommissionField label="תחום">
            <TextField
              value={addService}
              onChange={(e) => setAddService(e.target.value)}
              fullWidth
              required
              sx={COMMISSION_EDITOR_RTL_FIELD_SX}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
          </CommissionField>
          <CommissionField label="תת-תחום (אופציונלי)">
            <TextField
              value={addSubService}
              onChange={(e) => setAddSubService(e.target.value)}
              fullWidth
              sx={COMMISSION_EDITOR_RTL_FIELD_SX}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
          </CommissionField>
          <CommissionField label="מחיר / עמלה (₪)">
            <TextField
              type="number"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              fullWidth
              required
              sx={COMMISSION_EDITOR_RTL_FIELD_SX}
              slotProps={{
                htmlInput: { min: 0, step: 1, dir: 'ltr', style: { textAlign: 'right' } },
              }}
            />
          </CommissionField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, direction: 'rtl' }}>
          <Button variant="contained" disabled={addSaving} onClick={() => void submitAddService()}>
            {addSaving ? 'שומר…' : 'שמירה'}
          </Button>
          <Button variant="outlined" disabled={addSaving} onClick={closeAddDialog}>
            ביטול
          </Button>
        </DialogActions>
      </Dialog>
      ) : null}
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

function EditableServiceCell({
  row,
  rowBg,
  draftValue,
  saving,
  errorText,
  onDraftChange,
  onSave,
}: {
  row: CommissionRow
  rowBg: string
  draftValue: string
  saving: boolean
  errorText?: string
  onDraftChange: (value: string) => void
  onSave: () => void
}) {
  return (
    <TableCell align="right" sx={{ backgroundColor: rowBg, minWidth: 200 }}>
      <TextField
        size="small"
        value={draftValue}
        disabled={saving}
        error={Boolean(errorText)}
        helperText={
          errorText ||
          (row.subService ? `תת-תחום: ${row.subService}` : undefined)
        }
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={() => void onSave()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void onSave()
          }
        }}
        slotProps={{
          htmlInput: { dir: 'rtl', style: { textAlign: 'right' } },
          input: saving
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <CircularProgress size={16} />
                  </InputAdornment>
                ),
              }
            : undefined,
        }}
        sx={{
          width: '100%',
          minWidth: 180,
          '& .MuiInputBase-input': { py: 0.75 },
          '& .MuiFormHelperText-root': { textAlign: 'right', direction: 'rtl', m: 0, mt: 0.25 },
        }}
      />
    </TableCell>
  )
}

function EditablePriceCell({
  row,
  rowBg,
  draftValue,
  saving,
  errorText,
  onDraftChange,
  onSave,
}: {
  row: CommissionRow
  rowBg: string
  draftValue: string
  saving: boolean
  errorText?: string
  onDraftChange: (value: string) => void
  onSave: () => void
}) {
  if (row.price == null) {
    return (
      <TableCell align="right" sx={{ backgroundColor: rowBg }}>
        —
      </TableCell>
    )
  }

  return (
    <TableCell align="right" sx={{ backgroundColor: rowBg, minWidth: 140 }}>
      <TextField
        size="small"
        type="number"
        value={draftValue}
        disabled={saving}
        error={Boolean(errorText)}
        helperText={errorText}
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={() => void onSave()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void onSave()
          }
        }}
        slotProps={{
          htmlInput: {
            min: 0,
            max: row.price ?? undefined,
            step: 1,
            dir: 'ltr',
            style: { textAlign: 'right' },
          },
          input: {
            endAdornment: saving ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.secondary">₪</Typography>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          width: 120,
          '& .MuiInputBase-input': { py: 0.75 },
          '& .MuiFormHelperText-root': { textAlign: 'right', direction: 'rtl', m: 0, mt: 0.25 },
        }}
      />
    </TableCell>
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
  readOnly,
  onToggle,
  getDraftPrice,
  setDraftPrice,
  getDraftService,
  setDraftService,
  onSavePrice,
  onSaveService,
  onPromotionChange,
  savingPriceIds,
  savingServiceIds,
  savingPromotionCategories,
  rowPriceErrors,
  rowServiceErrors,
}: {
  categoryName: string
  items: CommissionRow[]
  isExpanded: boolean
  categoryMatches: boolean
  highlightBg: string
  hasActiveSearch: boolean
  searchQuery: string
  readOnly: boolean
  onToggle: () => void
  getDraftPrice: (row: CommissionRow) => string
  setDraftPrice: (rowId: number, value: string) => void
  getDraftService: (row: CommissionRow) => string
  setDraftService: (rowId: number, value: string) => void
  onSavePrice: (row: CommissionRow) => void | Promise<void>
  onSaveService: (row: CommissionRow) => void | Promise<void>
  onPromotionChange: (categoryName: string, promotion: boolean) => void | Promise<void>
  savingPriceIds: Set<number>
  savingServiceIds: Set<number>
  savingPromotionCategories: Set<string>
  rowPriceErrors: Record<number, string>
  rowServiceErrors: Record<number, string>
}) {
  const categoryPromotion = items.every((r) => r.promotion)
  const categoryPromotionIndeterminate =
    items.some((r) => r.promotion) && !items.every((r) => r.promotion)
  const savingPromotion = savingPromotionCategories.has(categoryName)

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
        <TableCell align="right">{formatPrice(items[0]?.price ?? null)}</TableCell>
        <TableCell align="right">{items[0]?.minimumCommission != null ? `${items[0].minimumCommission} ₪` : '—'}</TableCell>
        <TableCell align="right">{items[0]?.fixedCommissionAmount ?? '—'}</TableCell>
        <TableCell align="center" sx={{ width: 72 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            {readOnly ? (
              <Checkbox
                checked={categoryPromotion}
                indeterminate={categoryPromotionIndeterminate}
                disabled
                inputProps={{ 'aria-label': `יש ממומן ${categoryName}` }}
              />
            ) : savingPromotion ? (
              <CircularProgress size={20} />
            ) : (
              <Checkbox
                checked={categoryPromotion}
                indeterminate={categoryPromotionIndeterminate}
                onChange={(_e, checked) => void onPromotionChange(categoryName, checked)}
                inputProps={{ 'aria-label': `יש ממומן ${categoryName}` }}
              />
            )}
          </Box>
        </TableCell>
      </TableRow>
      {isExpanded &&
        items.map((r) => {
          const serviceMatches = hasActiveSearch && normalizeText(r?.serviceName).includes(searchQuery)
          const rowBg = serviceMatches ? highlightBg : 'inherit'
          return (
            <TableRow key={`${categoryName}-${r.id}`} sx={{ backgroundColor: rowBg }}>
              <TableCell align="right" sx={{ pr: 4, backgroundColor: rowBg }} />
              {readOnly ? (
                <>
                  <TableCell align="right" sx={{ backgroundColor: rowBg }}>
                    {r.serviceName}
                  </TableCell>
                  <TableCell align="right" sx={{ backgroundColor: rowBg }}>
                    {formatPrice(r.price)}
                  </TableCell>
                </>
              ) : (
                <>
                  <EditableServiceCell
                    row={r}
                    rowBg={rowBg}
                    draftValue={getDraftService(r)}
                    saving={savingServiceIds.has(r.id)}
                    errorText={rowServiceErrors[r.id]}
                    onDraftChange={(value) => setDraftService(r.id, value)}
                    onSave={() => void onSaveService(r)}
                  />
                  <EditablePriceCell
                    row={r}
                    rowBg={rowBg}
                    draftValue={getDraftPrice(r)}
                    saving={savingPriceIds.has(r.id)}
                    errorText={rowPriceErrors[r.id]}
                    onDraftChange={(value) => setDraftPrice(r.id, value)}
                    onSave={() => void onSavePrice(r)}
                  />
                </>
              )}
              <TableCell align="right" sx={{ backgroundColor: rowBg }}>{r.minimumCommission != null ? `${r.minimumCommission} ₪` : '—'}</TableCell>
              <TableCell align="right" sx={{ backgroundColor: rowBg }}>{r.fixedCommissionAmount ?? '—'}</TableCell>
              <TableCell align="center" sx={{ backgroundColor: rowBg }} />
            </TableRow>
          )
        })}
    </>
  )
}
