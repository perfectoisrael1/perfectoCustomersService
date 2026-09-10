import type { OutgoingCall, OutgoingCallStatus } from '../api/csApi'

export type OutgoingCallStatusFilter = 'all' | OutgoingCallStatus

export function outgoingCallStatusLabel(status: string | null | undefined): string {
  switch (String(status || '').trim().toLowerCase()) {
    case 'pending':
      return 'ממתין'
    case 'completed':
      return 'חויג'
    case 'failed':
      return 'נכשל'
    default:
      return status || '—'
  }
}

export function outgoingCallStatusChip(
  status: string | null | undefined,
): { bg: string; fg: string } {
  switch (String(status || '').trim().toLowerCase()) {
    case 'pending':
      return { bg: '#FFB300', fg: '#111' }
    case 'completed':
      return { bg: '#66BB6A', fg: '#FFF' }
    case 'failed':
      return { bg: '#E53935', fg: '#FFF' }
    default:
      return { bg: '#E0E0E0', fg: '#111' }
  }
}

export function outgoingCallMatchesFilter(
  row: OutgoingCall,
  filter: OutgoingCallStatusFilter,
): boolean {
  if (filter === 'all') return true
  return String(row.status || '').trim().toLowerCase() === filter
}
