import { Alert, Box } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DateRangeIcon from '@mui/icons-material/DateRange'
import GroupsIcon from '@mui/icons-material/Groups'
import TodayIcon from '@mui/icons-material/Today'
import DashboardCountWidget from '../../components/DashboardCountWidget'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'

type LeadsDashboardWidgetsProps = {
  loading: boolean
  error: string | null
  counts: {
    today: number
    week: number
    month: number
    total: number
  }
}

export default function LeadsDashboardWidgets({ loading, error, counts }: LeadsDashboardWidgetsProps) {
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <DashboardCountWidget
          title="כמות לידים היום"
          value={loading ? null : counts.today}
          loading={loading}
          icon={<TodayIcon sx={{ fontSize: 28 }} />}
          accentColor="#ef6c00"
        />
        <DashboardCountWidget
          title="כמות לידים השבוע"
          value={loading ? null : counts.week}
          loading={loading}
          icon={<DateRangeIcon sx={{ fontSize: 28 }} />}
          accentColor="#1565c0"
        />
        <DashboardCountWidget
          title="כמות לידים החודש"
          value={loading ? null : counts.month}
          loading={loading}
          icon={<CalendarMonthIcon sx={{ fontSize: 28 }} />}
          accentColor="#2e7d32"
        />
        <DashboardCountWidget
          title="כמות לידים כללי"
          value={loading ? null : counts.total}
          loading={loading}
          icon={<GroupsIcon sx={{ fontSize: 28 }} />}
          accentColor="#111"
        />
      </Box>
    </Box>
  )
}
