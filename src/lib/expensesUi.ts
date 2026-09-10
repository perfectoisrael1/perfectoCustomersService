import type { Expense } from '../api/csApi'

export const EXPENSE_CURRENCY_OPTIONS = [
  { value: 'ILS', symbol: '₪', name: 'שקל' },
  { value: 'USD', symbol: '$', name: 'דולר' },
  { value: 'EUR', symbol: '€', name: 'יורו' },
] as const

export function expenseCurrencySymbol(currency: string | null | undefined): string {
  const hit = EXPENSE_CURRENCY_OPTIONS.find((o) => o.value === String(currency || '').toUpperCase())
  return hit?.symbol || currency || '₪'
}

export function formatExpenseAmount(row: Pick<Expense, 'amount' | 'currency'>): string {
  const amount = Number(row.amount)
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'
  return `${formatted} ${expenseCurrencySymbol(row.currency)}`
}

export function formatExpenseDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('he-IL')
}

export function todayDateInputValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const expenseRtlFieldSx = {
  direction: 'rtl',
  '& .MuiOutlinedInput-root': { direction: 'rtl' },
  '& .MuiInputBase-input': {
    textAlign: 'right',
    direction: 'rtl',
  },
  '& .MuiInputBase-input::placeholder': {
    textAlign: 'right',
    direction: 'rtl',
    opacity: 1,
  },
  '& .MuiInputLabel-root': {
    right: 28,
    left: 'auto',
    transformOrigin: 'top right',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    right: 24,
    left: 'auto',
    transformOrigin: 'top right',
  },
  '& .MuiOutlinedInput-notchedOutline legend': {
    textAlign: 'right',
    float: 'unset',
  },
  '& .MuiSelect-select': {
    textAlign: 'right',
    direction: 'rtl',
  },
  '& .MuiSelect-icon': {
    left: 8,
    right: 'auto',
  },
  '& .MuiAutocomplete-endAdornment': {
    left: 8,
    right: 'auto',
  },
  '& .MuiFormHelperText-root': {
    direction: 'rtl',
    textAlign: 'right',
    marginRight: 0,
    marginLeft: 0,
  },
} as const
