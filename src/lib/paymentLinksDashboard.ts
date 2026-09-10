import type { PaymentLinkRow } from '../api/csApi'
import { isoDatePrefix, jerusalemYmd } from './caliberUi'
import { jerusalemMonthStartYmd, jerusalemWeekStartYmd } from './leadsDashboard'

export const INQUIRY_PAYMENT_PURPOSES = new Set(['lead_checkout', 'lead_charge'])
export const MEMBERSHIP_PAYMENT_PURPOSES = new Set(['membership'])

export function isPaidPaymentLink(row: PaymentLinkRow): boolean {
  return String(row.status || '').trim().toLowerCase() === 'paid'
}

export function paymentLinkPurpose(row: PaymentLinkRow): string {
  return String(row.purpose || '').trim()
}

export function paymentLinkMatchesPurposes(
  row: PaymentLinkRow,
  purposes: ReadonlySet<string>,
): boolean {
  return purposes.has(paymentLinkPurpose(row))
}

export function paymentLinkDateYmd(row: PaymentLinkRow): string | null {
  return isoDatePrefix(row.created)
}

export function paymentLinkAmount(row: PaymentLinkRow): number {
  const n = Number(row.amount)
  return Number.isFinite(n) ? n : 0
}

export function sumPaidPaymentLinksSince(
  rows: PaymentLinkRow[],
  fromYmd: string | null,
  purposes?: ReadonlySet<string>,
): number {
  return rows.reduce((sum, row) => {
    if (!isPaidPaymentLink(row)) return sum
    if (purposes && !paymentLinkMatchesPurposes(row, purposes)) return sum
    const ymd = paymentLinkDateYmd(row)
    if (!ymd) return sum
    if (fromYmd && ymd < fromYmd) return sum
    return sum + paymentLinkAmount(row)
  }, 0)
}

export function sumPaidPaymentLinksInRange(
  rows: PaymentLinkRow[],
  fromYmd: string | null,
  toYmd: string | null,
  purposes?: ReadonlySet<string>,
): number {
  return rows.reduce((sum, row) => {
    if (!isPaidPaymentLink(row)) return sum
    if (purposes && !paymentLinkMatchesPurposes(row, purposes)) return sum
    const ymd = paymentLinkDateYmd(row)
    if (!ymd) return sum
    if (fromYmd && ymd < fromYmd) return sum
    if (toYmd && ymd > toYmd) return sum
    return sum + paymentLinkAmount(row)
  }, 0)
}

export function jerusalemYearStartYmd(d = new Date()): string {
  const dateStr = jerusalemYmd(d)
  const [y] = dateStr.split('-')
  return `${y}-01-01`
}

export type RevenuePeriodId = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

export const REVENUE_PERIOD_OPTIONS: { id: RevenuePeriodId; label: string }[] = [
  { id: 'today', label: 'היום' },
  { id: 'week', label: 'השבוע' },
  { id: 'month', label: 'החודש' },
  { id: 'year', label: 'השנה' },
  { id: 'all', label: 'הכל' },
  { id: 'custom', label: 'טווח' },
]

export function revenuePeriodRange(
  period: RevenuePeriodId,
  customFrom: string,
  customTo: string,
): { fromYmd: string | null; toYmd: string | null } {
  const today = jerusalemYmd()
  switch (period) {
    case 'today':
      return { fromYmd: today, toYmd: today }
    case 'week':
      return { fromYmd: jerusalemWeekStartYmd(), toYmd: today }
    case 'month':
      return { fromYmd: jerusalemMonthStartYmd(), toYmd: today }
    case 'year':
      return { fromYmd: jerusalemYearStartYmd(), toYmd: today }
    case 'custom': {
      const from = String(customFrom || '').trim().slice(0, 10) || null
      const to = String(customTo || '').trim().slice(0, 10) || null
      if (from && to && from > to) return { fromYmd: to, toYmd: from }
      return { fromYmd: from, toYmd: to }
    }
    case 'all':
    default:
      return { fromYmd: null, toYmd: null }
  }
}

export function sumPaidInquiryPaymentLinksInRange(
  rows: PaymentLinkRow[],
  fromYmd: string | null,
  toYmd: string | null,
): number {
  return sumPaidPaymentLinksInRange(rows, fromYmd, toYmd, INQUIRY_PAYMENT_PURPOSES)
}

export function sumPaidMembershipPaymentLinksInRange(
  rows: PaymentLinkRow[],
  fromYmd: string | null,
  toYmd: string | null,
): number {
  return sumPaidPaymentLinksInRange(rows, fromYmd, toYmd, MEMBERSHIP_PAYMENT_PURPOSES)
}

export function sumPaidPaymentLinksToday(rows: PaymentLinkRow[]): number {
  const todayYmd = jerusalemYmd()
  return rows.reduce((sum, row) => {
    if (!isPaidPaymentLink(row)) return sum
    const ymd = paymentLinkDateYmd(row)
    if (ymd !== todayYmd) return sum
    return sum + paymentLinkAmount(row)
  }, 0)
}

export function sumPaidPaymentLinksThisWeek(rows: PaymentLinkRow[]): number {
  return sumPaidPaymentLinksSince(rows, jerusalemWeekStartYmd())
}

export function sumPaidPaymentLinksThisMonth(rows: PaymentLinkRow[]): number {
  return sumPaidPaymentLinksSince(rows, jerusalemMonthStartYmd())
}

export function sumPaidPaymentLinksTotal(rows: PaymentLinkRow[]): number {
  return sumPaidPaymentLinksSince(rows, null)
}

export function formatDashboardCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const hasFraction = Math.abs(rounded % 1) > 0.001
  return `${rounded.toLocaleString('he-IL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} ₪`
}
