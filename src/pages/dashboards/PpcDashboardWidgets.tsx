import { Alert, Box } from '@mui/material'
import CampaignIcon from '@mui/icons-material/Campaign'
import DashboardCountWidget from '../../components/DashboardCountWidget'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'

type PpcDashboardWidgetsProps = {
  loading: boolean
  error: string | null
  count: number
}

export default function PpcDashboardWidgets({ loading, error, count }: PpcDashboardWidgetsProps) {
  return (
    <Box
      sx={{
        pt: GAP_BELOW_INNER_NAV_PX,
        px: { xs: 0.5, sm: 1 },
        pb: 2,
        direction: 'rtl',
        textAlign: 'right',
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ maxWidth: 320 }}>
        <DashboardCountWidget
          title="פניות PPC"
          value={loading ? null : count}
          loading={loading}
          icon={<CampaignIcon sx={{ fontSize: 28 }} />}
          accentColor="#6a1b9a"
        />
      </Box>
    </Box>
  )
}
