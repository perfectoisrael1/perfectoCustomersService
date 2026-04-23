const SOURCE = 'perfecto-customer-service-ui'

const DEFAULT_CLOUD_API_BASE =
  'https://perfecto-backend-535608507694.me-west1.run.app'

export const TOKEN_KEY = 'perfectoCustomerServiceToken'

export type User = { id: number; fullName: string; username: string }

export type Job = {
  id: number
  accountId: number
  serialId: string | null
  accountName: string
  phoneNumber: string
  businessName: string
  specialtiesCategory: string
  /** מולא אחרי שליחת וובהוק התאמה לרלוונטים — ריק אם הפנייה לא נוצרה דרך התהליך הזה */
  leadDomain: string
  description: string
  status: string
  statusLabel: string
  exclusionReason: string
  created: string
  updated: string
}

export type Account = {
  id: number
  accountName: string
  phoneNumber: string
  payPerLead: number | null
  businessName: string | null
  email: string | null
  accountStatus: string | null
  perfectoStatus: string | null
  specialties: string | null
  specialtiesCategory: string | null
  workingAreas: string | null
  yearsOfExperience: string | null
  about: string | null
  workingHours: string | null
  certificateNumber: string | null
  profileImageUrl: string | null
  workImages: string | null
  acceptedTerms: boolean | null
  slug: string | null
  availability: string | null
  credits: number | null
  createdAt: string
  updatedAt: string
}

export type Lead = {
  id: number
  name: string
  businessName: string | null
  phone: string
  email: string | null
  category: string | null
  isPaid: boolean
  amount: number | null
  bonus: number | null
  responsible: string | null
  followUpDate: string | null
  details: string | null
  status: string | null
  leadSource: string | null
  timeToCall: string | null
  linkId: string | null
  linkUrl: string | null
  statusUpdateDate: string | null
  created: string
  updated: string | null
}

export type Ticket = {
  id: number
  name: string | null
  followUpDate: string | null
  responsible: string | null
  phoneNumber: string | null
  details: string | null
  status: string | null
  issueType: string | null
  notes: string | null
  created: string
  updated: string
}

export type Task = {
  id: number
  task_name: string
  description: string | null
  responsible: string | null
  status: string | null
  project_name: string | null
  sprint_number: string | null
  execution_date: string | null
  file_urls: string | null
  created_at: string
}

export type City = {
  id: number
  region: string
  city: string
  slug?: string | null
}

export type Service = {
  id: number
  category: string
  service: string
  subService?: string | null
  price?: number | null
  slug?: string | null
}

type ApiError = Error & { status?: number }

function parseApiBaseUrl(raw: string | undefined): string | null {
  if (raw == null) return null
  let s = String(raw).trim().replace(/\/+$/, '')
  if (!s) return null
  if (/^:\d+/.test(s)) return null

  if (!/^https?:\/\//i.test(s)) {
    if (/^[\w.-]+(:\d+)?$/.test(s) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(s)) {
      s = `http://${s}`
    } else {
      return null
    }
  }

  try {
    const u = new URL(s)
    if (!u.hostname) return null
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

function baseUrl(): string {
  const fromEnv = parseApiBaseUrl(
    import.meta.env.VITE_PERFECTO_API_BASE_URL as string | undefined,
  )
  if (fromEnv) return fromEnv
  return parseApiBaseUrl(DEFAULT_CLOUD_API_BASE) ?? DEFAULT_CLOUD_API_BASE
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)?.trim() || null
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

function headers(token: string | null, extra?: Record<string, string>) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Source': SOURCE,
    ...extra,
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function parseErr(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (Array.isArray(body?.message)) return body.message.join(', ')
    return body?.message || body?.error || res.statusText
  } catch {
    return res.statusText
  }
}

export async function csFetch<T>(
  path: string,
  opts: {
    method?: string
    body?: unknown
    token?: string | null
    noAuth?: boolean
  } = {},
): Promise<T> {
  const token = opts.noAuth ? null : opts.token !== undefined ? opts.token : getStoredToken()
  const url = path.startsWith('/') ? `${baseUrl()}${path}` : `${baseUrl()}/${path}`
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: headers(token),
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const msg = await parseErr(res)
    const error = new Error(msg || 'בקשה נכשלה') as ApiError
    error.status = res.status
    throw error
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function loginRequest(username: string, password: string) {
  return csFetch<{ token: string; user: User }>('/customer-service/auth/login', {
    method: 'POST',
    body: { username, password },
    noAuth: true,
  })
}

export async function meRequest(token: string) {
  return csFetch<User>('/customer-service/auth/me', { token })
}

export async function getJobs() {
  return csFetch<Job[]>('/customer-service/jobs')
}

/** אישור החרגה: הפנייה עוברת ל«נדחה», סיבת ההחרגה ל«מאושר החרגה - …», והחזרת קרדיטים לבעל המקצוע כשנוכו בעת אישור הפנייה */
export async function approveJobExclusion(jobId: number) {
  return csFetch<Job>(`/customer-service/jobs/${jobId}/approve-exclusion`, {
    method: 'POST',
  })
}

/** דחיית החרגה: הפנייה חוזרת ל«ללא החרגות» (ללא שינוי סטטוס) */
export async function rejectJobExclusion(jobId: number) {
  return csFetch<Job>(`/customer-service/jobs/${jobId}/reject-exclusion`, {
    method: 'POST',
  })
}

/** וובהוק ציבורי: יוצר פניות לכל ה־accounts שמתאימים לתחום ולעיר */
export async function broadcastInquiryByDomainAndCity(body: {
  domain: string
  city: string
  description?: string
  phone?: string
  customerName?: string
}) {
  const payload: Record<string, string> = {
    domain: body.domain.trim(),
    city: body.city.trim(),
  }
  const d = body.description?.trim()
  if (d) payload.description = d
  const phone = body.phone?.trim()
  if (phone) payload.phone = phone
  const customerName = body.customerName?.trim()
  if (customerName) payload.customerName = customerName

  return csFetch<{ matchedAccounts: number; createdJobs: number; jobIds: number[] }>(
    '/jobs/webhook/create-job',
    {
      method: 'POST',
      body: payload,
      noAuth: true,
    },
  )
}

export async function getJobsToday() {
  const params = new URLSearchParams()
  params.set('created', 'today')
  return csFetch<Job[]>(`/customer-service/jobs?${params.toString()}`)
}

export async function getAccounts() {
  return csFetch<Account[]>('/customer-service/accounts')
}

export async function getLeads(created?: 'today') {
  if (created === 'today') {
    const params = new URLSearchParams()
    params.set('created', 'today')
    return csFetch<Lead[]>(`/customer-service/leads?${params.toString()}`)
  }
  return csFetch<Lead[]>('/customer-service/leads')
}

export type LeadInput = Partial<{
  name: string
  businessName: string
  phone: string
  email: string | null
  category: string | null
  isPaid: boolean
  amount: number | null
  bonus: number | null
  responsible: string | null
  followUpDate: string | null
  details: string | null
  status: string | null
  leadSource: string | null
  timeToCall: string | null
  linkId: string | null
  linkUrl: string | null
}>

export async function createLead(body: LeadInput) {
  return csFetch<Lead>('/customer-service/leads', { method: 'POST', body })
}

export async function patchLead(id: number, body: LeadInput) {
  return csFetch<Lead>(`/customer-service/leads/${id}`, { method: 'PATCH', body })
}

export async function deleteLead(id: number) {
  return csFetch<{ ok: boolean; id: number }>(`/customer-service/leads/${id}`, { method: 'DELETE' })
}

export type TicketQuery = {
  status?: string
  issueType?: string
  responsible?: string
  followUpDate?: string
}

export async function getTickets(query?: TicketQuery) {
  const params = new URLSearchParams()
  if (query?.status) params.set('status', query.status)
  if (query?.issueType) params.set('issueType', query.issueType)
  if (query?.responsible) params.set('responsible', query.responsible)
  if (query?.followUpDate) params.set('followUpDate', query.followUpDate)
  const qs = params.toString()
  return csFetch<Ticket[]>(qs ? `/customer-service/tickets?${qs}` : '/customer-service/tickets')
}

export type TicketInput = {
  name?: string | null
  phoneNumber?: string | null
  details?: string | null
  issueType?: string | null
  status?: string | null
  responsible?: string | null
  followUpDate?: string | null
  notes?: string | null
}

export async function createTicket(body: TicketInput) {
  return csFetch<Ticket>('/customer-service/tickets', { method: 'POST', body })
}

export async function patchTicket(id: number, body: TicketInput) {
  return csFetch<Ticket>(`/customer-service/tickets/${id}`, { method: 'PATCH', body })
}

export async function deleteTicket(id: number) {
  return csFetch<{ ok: boolean; id: number }>(`/customer-service/tickets/${id}`, {
    method: 'DELETE',
  })
}

export async function getTasks() {
  return csFetch<Task[]>('/customer-service/tasks')
}

export type TaskInput = Partial<{
  task_name: string
  description: string | null
  responsible: string | null
  status: string | null
  project_name: string | null
  sprint_number: string | null
  execution_date: string | null
  file_urls: string | null
}>

export async function createTask(body: TaskInput) {
  return csFetch<Task>('/customer-service/tasks', { method: 'POST', body })
}

export async function putTask(id: number, body: TaskInput) {
  return csFetch<Task>(`/customer-service/tasks/${id}`, { method: 'PUT', body })
}

export async function deleteTask(id: number) {
  return csFetch<void>(`/customer-service/tasks/${id}`, { method: 'DELETE' })
}

export async function getCities() {
  return csFetch<City[]>('/customer-service/catalog/cities')
}

export async function getServices() {
  return csFetch<Service[]>('/customer-service/catalog/services')
}
