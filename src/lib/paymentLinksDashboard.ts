import type { PaymentLinkRow } from '../api/csApi'
import { isoDatePrefix, jerusalemYmd } from './caliberUi'
import { jerusalemMonthStartYmd, jerusalemWeekStartYmd } from './leadsDashboard'

export function isPaidPaymentLink(row: PaymentLinkRow): boolean {
  return String(row.status || '').trim().toLowerCase() === 'paid'
}

export function paymentLinkDateYmd(row: PaymentLinkRow): string | null {
  return isoDatePrefix(row.created)
}

export function paymentLinkAmount(row: PaymentLinkRow): number {
  const n = Number(row.amount)
  return Number.isFinite(n) ? n : 0
}

export function sumPaidPaymentLinksSince(rows: PaymentLinkRow[], fromYmd: string | null): number {
  return rows.reduce((sum, row) => {
    if (!isPaidPaymentLink(row)) return sum
    const ymd = paymentLinkDateYmd(row)
    if (!ymd) return sum
    if (fromYmd && ymd < fromYmd) return sum
    return sum + paymentLinkAmount(row)
  }, 0)
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
