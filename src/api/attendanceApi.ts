import { csFetch, getStoredToken } from './csApi'
import { getIsraelDayBoundsIso } from '../lib/israelTime'

export type AttendanceRecord = {
  id?: number
  responsible?: string
  createdAt?: string
  created_at?: string
  totalSeconds?: number
  total_seconds?: number
  lastStartTime?: string | null
  last_start_time?: string | null
  isRunning?: boolean | number
  is_running?: boolean | number
  attendanceStatus?: string | null
  attendance_status?: string | null
  bonus?: number
  eventType?: string | null
  event_type?: string | null
  isApproved?: boolean
  is_approved?: boolean
  adminNote?: string | null
  admin_note?: string | null
  fileAttachmentUrl?: string | null
  file_attachment_url?: string | null
  lunchBreakSeconds?: number
  lunch_break_seconds?: number
  lunchBreakLastStart?: string | null
  lunch_break_last_start?: string | null
  endedDayAt?: string | null
  ended_day_at?: string | null
  virtual?: boolean
  csUserId?: number
}

function tokenOrThrow(token?: string | null): string {
  const t = token ?? getStoredToken()
  if (!t) throw new Error('Missing token')
  return t
}

export async function startAttendance(responsible: string, token?: string | null) {
  const name = String(responsible || '').trim()
  if (!name) throw new Error('Missing responsible')
  return csFetch<AttendanceRecord>('/customer-service/attendance/start', {
    method: 'POST',
    body: { responsible: name },
    token: tokenOrThrow(token),
  })
}

export async function getTodayAttendance(token?: string | null, responsible?: string | null) {
  const qs = responsible ? `?responsible=${encodeURIComponent(responsible)}` : ''
  const row = await csFetch<AttendanceRecord | null>(`/customer-service/attendance/today${qs}`, {
    token: tokenOrThrow(token),
  })
  if (!row?.id) return null
  return row
}

export async function listAllAttendanceToday(token?: string | null, dateStr?: string | null) {
  const stamp =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim()) ? String(dateStr).trim() : null
  const { from, to } = getIsraelDayBoundsIso(stamp ?? undefined)
  const params = new URLSearchParams()
  if (from && to) {
    params.set('from', from)
    params.set('to', to)
  }
  if (stamp) params.set('date', stamp)
  const qs = params.toString()
  const res = await csFetch<{ items: AttendanceRecord[] }>(
    `/customer-service/attendance/all-today${qs ? `?${qs}` : ''}`,
    { token: tokenOrThrow(token) },
  )
  return Array.isArray(res?.items) ? res.items : []
}

export async function listAttendance(
  token?: string | null,
  opts: {
    limit?: number
    offset?: number
    fromDate?: string
    toDate?: string
    responsible?: string
    userId?: number
  } = {},
) {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.offset) params.set('offset', String(opts.offset))
  if (opts.fromDate) params.set('fromDate', opts.fromDate)
  if (opts.toDate) params.set('toDate', opts.toDate)
  if (opts.responsible) params.set('responsible', opts.responsible)
  if (opts.userId) params.set('userId', String(opts.userId))
  const qs = params.toString()
  return csFetch<{ items: AttendanceRecord[] }>(
    `/customer-service/attendance${qs ? `?${qs}` : ''}`,
    { token: tokenOrThrow(token) },
  )
}

export async function updateAttendance(
  id: number,
  payload: Record<string, unknown>,
  token?: string | null,
) {
  return csFetch<AttendanceRecord>(`/customer-service/attendance/${id}`, {
    method: 'PATCH',
    body: payload,
    token: tokenOrThrow(token),
  })
}

export async function createSuperadminManualAttendance(
  token: string | null | undefined,
  body: { responsible: string; date: string; eventType: string; adminNote?: string | null },
) {
  return csFetch<AttendanceRecord>('/customer-service/attendance/superadmin-manual', {
    method: 'POST',
    body,
    token: tokenOrThrow(token),
  })
}

export async function uploadAttendanceAttachment(
  id: number,
  file: File,
  token?: string | null,
  dateStr?: string | null,
) {
  const t = tokenOrThrow(token)
  const qs =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())
      ? `?date=${encodeURIComponent(String(dateStr).trim())}`
      : ''
  const form = new FormData()
  form.append('file', file)
  const base = import.meta.env.VITE_PERFECTO_API_BASE_URL || 'https://perfecto-backend-535608507694.me-west1.run.app'
  const url = `${String(base).replace(/\/$/, '')}/customer-service/attendance/${id}/attachment${qs}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Source': 'perfecto-customer-service-ui',
      Authorization: `Bearer ${t}`,
    },
    body: form,
    cache: 'no-store',
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.json()
      msg = body?.message || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg || 'Upload failed')
  }
  return res.json()
}

export async function listAttendanceResponsiblesInRange(
  token?: string | null,
  opts: { fromDate: string; toDate: string } = { fromDate: '', toDate: '' },
) {
  const params = new URLSearchParams()
  if (opts.fromDate) params.set('fromDate', opts.fromDate)
  if (opts.toDate) params.set('toDate', opts.toDate)
  const qs = params.toString()
  const res = await csFetch<{ names: string[] }>(
    `/customer-service/attendance/responsibles-in-range${qs ? `?${qs}` : ''}`,
    { token: tokenOrThrow(token) },
  )
  return Array.isArray(res?.names) ? res.names : []
}
