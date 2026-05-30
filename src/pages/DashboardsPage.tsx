import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Card, CardContent, Stack, Tab, Tabs } from '@mui/material'
import {
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
} from '../layout/headerLayout'

type DashboardsTab = 'leads' | 'suppliers' | 'customer-service' | 'inquiries' | 'revenue'

const VALID_SEGMENTS: DashboardsTab[] = [
  'leads',
  'suppliers',
  'customer-service',
  'inquiries',
  'revenue',
]

const TAB_LABELS: Record<DashboardsTab, string> = {
  leads: 'לידים',
  suppliers: 'ספקים',
  'customer-service': 'שירות לקוחות',
  inquiries: 'פניות',
  revenue: 'הכנסות',
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
              <Tabs
                value={tab}
                onChange={(_e, v) => setTab(v as DashboardsTab)}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{
                  borderBottom: 'none',
                  minHeight: 48,
                  '& .MuiTabs-indicator': { height: 3 },
                }}
              >
                {VALID_SEGMENTS.map((key) => (
                  <Tab key={key} value={key} label={TAB_LABELS[key]} />
                ))}
              </Tabs>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
