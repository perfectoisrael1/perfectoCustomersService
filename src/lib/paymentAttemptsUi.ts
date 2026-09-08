import type { PaymentLinkRow } from '../api/csApi'

export type PaymentAttemptStatusFilter = 'all' | 'paid' | 'failed' | 'pending' | 'expired'

export function paymentAttemptStatusLabel(status: string | null | undefined): string {
  switch (String(status || '').trim().toLowerCase()) {
    case 'paid':
      return 'הצליח'
    case 'failed':
      return 'נכשל'
    case 'pending':
      return 'ממתין'
    case 'expired':
      return 'לא הושלם'
    default:
      return status || '—'
  }
}

export function paymentAttemptStatusChip(
  status: string | null | undefined,
): { bg: string; fg: string } {
  switch (String(status || '').trim().toLowerCase()) {
    case 'paid':
      return { bg: '#66BB6A', fg: '#FFF' }
    case 'failed':
      return { bg: '#E53935', fg: '#FFF' }
    case 'pending':
      return { bg: '#FFB300', fg: '#111' }
    case 'expired':
      return { bg: '#9E9E9E', fg: '#FFF' }
    default:
      return { bg: '#E0E0E0', fg: '#111' }
  }
}

export function paymentAttemptPurposeLabel(purpose: string | null | undefined): string {
  switch (String(purpose || '').trim()) {
    case 'membership':
      return 'דמי הצטרפות'
    case 'save_card':
      return 'שמירת כרטיס'
    case 'lead_checkout':
      return 'תשלום פנייה'
    case 'lead_charge':
      return 'חיוב כרטיס שמור'
    case 'packages':
      return 'חבילה'
    default:
      return purpose || '—'
  }
}

export function paymentAttemptMethodLabel(method: string | null | undefined): string {
  if (method === 'bit') return 'ביט'
  if (method === 'credit') return 'אשראי'
  return '—'
}

export function paymentAttemptMatchesFilter(
  row: PaymentLinkRow,
  filter: PaymentAttemptStatusFilter,
): boolean {
  if (filter === 'all') return true
  return String(row.status || '').trim().toLowerCase() === filter
}
