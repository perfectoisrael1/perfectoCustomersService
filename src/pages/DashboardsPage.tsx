import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Card, CardContent, Stack, Tab, Tabs } from '@mui/material'
import {
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
} from '../layout/headerLayout'
import { useLeadsDashboard } from '../hooks/useLeadsDashboard'
import { useCustomerServiceDashboard } from '../hooks/useCustomerServiceDashboard'
import { useInquiriesDashboard } from '../hooks/useInquiriesDashboard'
import { useSuppliersDashboard } from '../hooks/useSuppliersDashboard'
import CustomerServiceDashboardWidgets from './dashboards/CustomerServiceDashboardWidgets'
import InquiriesDashboardWidgets from './dashboards/InquiriesDashboardWidgets'
import LeadsDashboardWidgets from './dashboards/LeadsDashboardWidgets'
import SuppliersDashboardWidgets from './dashboards/SuppliersDashboardWidgets'
import PayslipsDashboardPanel from './dashboards/PayslipsDashboardPanel'

const REFRESH_BUTTON_SX = {
  backgroundColor: '#FFDD00',
  color: '#fff',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: '#e6c700',
  },
  '&.Mui-disabled': {
    backgroundColor: 'rgba(255, 221, 0, 0.5)',
    color: 'rgba(255, 255, 255, 0.8)',
  },
} as const

type DashboardsTab = 'leads' | 'suppliers' | 'customer-service' | 'inquiries' | 'revenue' | 'payslips'

const VALID_SEGMENTS: DashboardsTab[] = [
  'leads',
  'suppliers',
  'customer-service',
  'inquiries',
  'revenue',
  'payslips',
]

const TAB_LABELS: Record<DashboardsTab, string> = {
  leads: 'לידים',
  suppliers: 'ספקים',
  'customer-service': 'שירות ספקים',
  inquiries: 'פניות',
  revenue: 'הכנסות',
  payslips: 'תלושים',
}

function segmentToTab(segment: string | undefined): DashboardsTab {
  const s = String(segment || '').trim()
  return (VALID_SEGMENTS.includes(s as DashboardsTab) ? s : 'leads') as DashboardsTab
}

function tabToPath(tab: DashboardsTab): string {
  return `/dashboards/${tab}`
}

export default function DashboardsPage() {
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()
  const tab = segmentToTab(segment)
  const isLeadsTab = tab === 'leads'
  const isSuppliersTab = tab === 'suppliers'
  const isCustomerServiceTab = tab === 'customer-service'
  const isInquiriesTab = tab === 'inquiries'
  const isPayslipsTab = tab === 'payslips'
  const { loading: leadsLoading, error: leadsError, load: loadLeads, counts } = useLeadsDashboard(isLeadsTab)
  const {
    loading: suppliersLoading,
    error: suppliersError,
    load: loadSuppliers,
    totals: suppliersTotals,
  } = useSuppliersDashboard(isSuppliersTab)
  const {
    loading: customerServiceLoading,
    error: customerServiceError,
    load: loadCustomerService,
    counts: customerServiceCounts,
    issueTypeBreakdown: customerServiceIssueTypeBreakdown,
  } = useCustomerServiceDashboard(isCustomerServiceTab)
  const {
    loading: inquiriesLoading,
    error: inquiriesError,
    load: loadInquiries,
    counts: inquiriesCounts,
    statusBreakdown: inquiriesStatusBreakdown,
  } = useInquiriesDashboard(isInquiriesTab)

  const showRefresh = isLeadsTab || isSuppliersTab || isCustomerServiceTab || isInquiriesTab
  const refreshLoading = isLeadsTab
    ? leadsLoading
    : isSuppliersTab
      ? suppliersLoading
      : isCustomerServiceTab
        ? customerServiceLoading
        : inquiriesLoading
  const handleRefresh = () => {
    if (isLeadsTab) void loadLeads()
    else if (isSuppliersTab) void loadSuppliers()
    else if (isCustomerServiceTab) void loadCustomerService()
    else if (isInquiriesTab) void loadInquiries()
  }

  useEffect(() => {
    const s = String(segment || '').trim()
    if (s && !VALID_SEGMENTS.includes(s as DashboardsTab)) {
      navigate(tabToPath('leads'), { replace: true })
    }
  }, [segment, navigate])

  const setTab = (next: DashboardsTab) => {
    if (next !== tab) navigate(tabToPath(next))
  }

  return (
    <Box sx={{ mx: -2 }}>
      <Card
        elevation={1}
        sx={{
          borderRadius: 3,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: CS_PAGE_FILL_MIN_HEIGHT_CSS,
        }}
      >
        <CardContent
          sx={{ px: 2, pb: 2, pt: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Stack spacing={0} sx={{ flex: 1, minHeight: 0, direction: 'rtl', textAlign: 'right' }}>
            <Box
              sx={{
                position: 'sticky',
                top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
                zIndex: (theme) => theme.zIndex.appBar - 1,
                bgcolor: 'background.paper',
                mx: -2,
                px: 2,
                py: 0,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  direction: 'rtl',
                  width: '100%',
                }}
              >
                <Tabs
                  value={tab}
                  onChange={(_e, v) => setTab(v as DashboardsTab)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  sx={{
                    flex: '1 1 auto',
                    minWidth: { xs: 'min(100%, 280px)', sm: 120 },
                    borderBottom: 'none',
                    minHeight: 48,
                    '& .MuiTabs-indicator': { height: 3 },
                  }}
                >
                  {VALID_SEGMENTS.map((key) => (
                    <Tab key={key} value={key} label={TAB_LABELS[key]} />
                  ))}
                </Tabs>

                {showRefresh ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      onClick={handleRefresh}
                      disabled={refreshLoading}
                      sx={REFRESH_BUTTON_SX}
                    >
                      רענון
                    </Button>
                  </Box>
                ) : null}
              </Box>
            </Box>

            {isLeadsTab ? (
              <LeadsDashboardWidgets loading={leadsLoading} error={leadsError} counts={counts} />
            ) : null}
            {isSuppliersTab ? (
              <SuppliersDashboardWidgets
                loading={suppliersLoading}
                error={suppliersError}
                totals={suppliersTotals}
              />
            ) : null}
            {isCustomerServiceTab ? (
              <CustomerServiceDashboardWidgets
                loading={customerServiceLoading}
                error={customerServiceError}
                counts={customerServiceCounts}
                issueTypeBreakdown={customerServiceIssueTypeBreakdown}
              />
            ) : null}
            {isInquiriesTab ? (
              <InquiriesDashboardWidgets
                loading={inquiriesLoading}
                error={inquiriesError}
                counts={inquiriesCounts}
                statusBreakdown={inquiriesStatusBreakdown}
              />
            ) : null}
            {isPayslipsTab ? <PayslipsDashboardPanel /> : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
