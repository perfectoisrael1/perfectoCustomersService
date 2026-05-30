import type { AttendanceRecord } from '../api/attendanceApi'

export const ATTENDANCE_STATUS_EXIT_END_OF_DAY = 'יציאה - סוף יום'

export const ATTENDANCE_DELAY_SHORTAGE_OPTIONS = [
  'איחור באישור',
  'איחור לא מאושר',
  'מחלה (אישור מחלה)',
  'מחלת ילד (אישור מחלה)',
  'מילואים (טופס 3010)',
  'חיסור באישור',
  'חיסור לא מאושר',
  'יציאה מוקדמת ללא אישור',
] as const

export function formatTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return '—'
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function checkIsRunning(record: AttendanceRecord | null | undefined): boolean {
  if (!record) return false
  const val = record.isRunning ?? record.is_running
  if (val === true) return true
  if (val === 1) return true
  if (String(val) === '1') return true
  if (String(val).toLowerCase() === 'true') return true
  return false
}

export function isEndOfDayExitStatus(status: string | null | undefined): boolean {
  const t = String(status ?? '').trim()
  return t === ATTENDANCE_STATUS_EXIT_END_OF_DAY || t === 'יציאה'
}

export function isActive(record: AttendanceRecord | null | undefined): boolean {
  if (!record) return false
  const status = String(record.attendanceStatus ?? record.attendance_status ?? '').trim()
  return checkIsRunning(record) || status === 'פעיל'
}

export function normalizeIdentity(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function isAdminOrSuperadminRole(role: string | null | undefined): boolean {
  const r = String(role || '').trim().toLowerCase()
  return r === 'admin' || r === 'administrator' || r === 'superadmin'
}

export function getElapsedSeconds(record: AttendanceRecord | null | undefined): number {
  if (!record) return 0
  const base = Number(record.totalSeconds ?? record.total_seconds) || 0
  if (!checkIsRunning(record)) return base

  const lastRaw = record.lastStartTime ?? record.last_start_time
  const createdRaw = record.createdAt ?? record.created_at
  let startTime = lastRaw ? new Date(String(lastRaw)) : null
  if ((!startTime || Number.isNaN(startTime.getTime())) && base === 0 && createdRaw) {
    startTime = new Date(String(createdRaw))
  }
  if (!startTime || Number.isNaN(startTime.getTime())) return base

  const diff = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000))
  return base + diff
}

export function listAttendancePeersForResponsible(
  rawRecords: AttendanceRecord[],
  responsible: string,
): AttendanceRecord[] {
  const name = String(responsible || '').trim()
  return rawRecords.filter(
    (r) => !r?.virtual && r?.id != null && String(r?.responsible || '').trim() === name,
  )
}

export function sumDailyElapsedForResponsible(
  rawRecords: AttendanceRecord[],
  responsible: string,
): number {
  const peers = listAttendancePeersForResponsible(rawRecords, responsible)
  let sum = 0
  for (const r of peers) sum += getElapsedSeconds(r)
  return Math.max(0, Math.floor(sum))
}

export function getAvailabilityStatusLabel(
  displayRow: AttendanceRecord,
  rawRecords: AttendanceRecord[],
): string {
  if (!displayRow) return '—'
  if (displayRow.virtual) {
    return String(displayRow.attendanceStatus ?? displayRow.attendance_status ?? '').trim() || '—'
  }
  if (isActive(displayRow)) return 'פעיל'
  const peers = listAttendancePeersForResponsible(rawRecords, displayRow.responsible || '')
  for (const p of peers) {
    const st = String(p.attendanceStatus ?? p.attendance_status ?? '').trim()
    if (st === 'הפסקת צהריים') return 'הפסקת צהריים'
  }
  const st = String(displayRow.attendanceStatus ?? displayRow.attendance_status ?? '').trim()
  return st || 'הפסקה'
}

export function buildAttendanceDisplayRowsFromApi(
  rawArr: AttendanceRecord[],
  csUsers: Array<{ id: number; fullName?: string; username?: string; status?: string }>,
  availabilityDate: string,
  todayIsrael: string,
): AttendanceRecord[] {
  const arr = Array.isArray(rawArr) ? rawArr : []
  const byResponsible: Record<string, AttendanceRecord> = {}
  for (const r of arr) {
    const key = String(r.responsible || '').trim() || '—'
    const existing = byResponsible[key]
    const rTime = new Date(String(r.createdAt ?? r.created_at ?? 0)).getTime()
    const eTime = existing
      ? new Date(String(existing.createdAt ?? existing.created_at ?? 0)).getTime()
      : 0
    if (!existing || (isActive(r) && !isActive(existing)) || rTime > eTime) {
      byResponsible[key] = r
    }
  }
  const base = Object.values(byResponsible).sort((a, b) => {
    const aActive = isActive(a)
    const bActive = isActive(b)
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    return String(a.responsible || '').localeCompare(String(b.responsible || ''))
  })

  const isTodayOrFuture = availabilityDate >= todayIsrael
  if (!isTodayOrFuture) return base

  const present = new Set(base.map((r) => normalizeIdentity(r.responsible)))
  const virtualRows: AttendanceRecord[] = []
  for (const u of csUsers || []) {
    if (String(u.status || '').toLowerCase() !== 'active') continue
    const name = String(u.fullName || u.username || '').trim()
    if (!name || present.has(normalizeIdentity(name))) continue
    virtualRows.push({
      id: undefined,
      virtual: true,
      csUserId: u.id,
      responsible: name,
      attendanceStatus: 'לא פעיל',
      totalSeconds: 0,
      isRunning: false,
    })
  }
  return [...base, ...virtualRows].sort((a, b) => {
    const aActive = isActive(a)
    const bActive = isActive(b)
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    return String(a.responsible || '').localeCompare(String(b.responsible || ''))
  })
}

export function pickUserAttendanceRecord(
  rows: AttendanceRecord[],
  identityCandidates: string[],
): AttendanceRecord | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const candidateSet = new Set(identityCandidates.map(normalizeIdentity).filter(Boolean))
  if (candidateSet.size === 0) return null
  const byUser = rows.filter((r) => candidateSet.has(normalizeIdentity(r?.responsible)))
  if (byUser.length === 0) return null
  return [...byUser].sort((a, b) => {
    const aActive = isActive(a)
    const bActive = isActive(b)
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    const aTime = new Date(String(a?.createdAt ?? a?.created_at ?? 0)).getTime()
    const bTime = new Date(String(b?.createdAt ?? b?.created_at ?? 0)).getTime()
    return bTime - aTime
  })[0]
}

export function buildIdentityCandidates(
  user: { fullName?: string; username?: string } | null,
): string[] {
  const candidates = new Set<string>()
  const add = (v: string | null | undefined) => {
    const key = normalizeIdentity(v)
    if (key) candidates.add(key)
  }
  add(user?.fullName)
  add(user?.username)
  if (typeof window !== 'undefined') {
    const fromStorage = window.localStorage.getItem('perfectoCustomerServiceResponsible')
    add(fromStorage)
  }
  return [...candidates]
}

export function resolveAttendanceResponsible(
  user: { fullName?: string; username?: string } | null,
): string {
  if (typeof window !== 'undefined') {
    const fromStorage = window.localStorage.getItem('perfectoCustomerServiceResponsible')
    if (String(fromStorage || '').trim()) return String(fromStorage).trim()
  }
  return String(user?.fullName || user?.username || '').trim()
}
