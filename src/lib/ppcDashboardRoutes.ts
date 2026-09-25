import type { PpcDashboardKind } from '../api/csApi'
import type { RevenuePeriodId } from './paymentLinksDashboard'

export const PPC_DASHBOARD_PATH = '/dashboards/ppc'

export const PPC_KIND_SLUGS: Record<PpcDashboardKind, string> = {
  profit: 'profit',
  ppcLeads: 'leads',
  ppcApproved: 'approved',
  followUpsCreated: 'follow-ups',
  followUpsApproved: 'follow-ups-approved',
}

export const PPC_KIND_PATHS: Record<PpcDashboardKind, string> = {
  profit: '/dashboards/ppc/profit',
  ppcLeads: '/dashboards/ppc/leads',
  ppcApproved: '/dashboards/ppc/approved',
  followUpsCreated: '/dashboards/ppc/follow-ups',
  followUpsApproved: '/dashboards/ppc/follow-ups-approved',
}

const SLUG_TO_KIND = Object.fromEntries(
  Object.entries(PPC_KIND_SLUGS).map(([kind, slug]) => [slug, kind]),
) as Record<string, PpcDashboardKind>

const PERIOD_IDS = new Set<RevenuePeriodId>(['today', 'week', 'month', 'year', 'all', 'custom'])

export function ppcKindFromSlug(slug: string | undefined): PpcDashboardKind | null {
  const key = String(slug || '').trim()
  return SLUG_TO_KIND[key] ?? null
}

export function ppcDashboardPath(kind?: PpcDashboardKind | null, jobId?: number | null): string {
  if (!kind) return PPC_DASHBOARD_PATH
  const base = PPC_KIND_PATHS[kind]
  if (jobId != null && Number.isFinite(jobId) && jobId > 0) return `${base}/${jobId}`
  return base
}

export function parsePpcPeriod(value: string | null | undefined): RevenuePeriodId | null {
  const key = String(value || '').trim() as RevenuePeriodId
  return PERIOD_IDS.has(key) ? key : null
}
