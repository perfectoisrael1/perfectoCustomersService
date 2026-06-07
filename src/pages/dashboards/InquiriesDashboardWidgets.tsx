import { Alert, Box } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DateRangeIcon from '@mui/icons-material/DateRange'
import TodayIcon from '@mui/icons-material/Today'
import DashboardCountWidget from '../../components/DashboardCountWidget'
import DashboardPieChartWidget from '../../components/DashboardPieChartWidget'
import type { JobStatusBreakdownItem } from '../../lib/jobsDashboard'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'

type InquiriesDashboardWidgetsProps = {
  loading: boolean
  error: string | null
  counts: {
    today: number
    week: number
    month: number
    total: number
  }
  statusBreakdown: JobStatusBreakdownItem[]
}

export default function InquiriesDashboardWidgets({
  loading,
  error,
  counts,
  statusBreakdown,
}: InquiriesDashboardWidgetsProps) {
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
          title="כמות פניות היום"
          value={loading ? null : counts.today}
          loading={loading}
          icon={<TodayIcon sx={{ fontSize: 28 }} />}
          accentColor="#ef6c00"
        />
        <DashboardCountWidget
          title="כמות פניות השבוע"
          value={loading ? null : counts.week}
          loading={loading}
          icon={<DateRangeIcon sx={{ fontSize: 28 }} />}
          accentColor="#1565c0"
        />
        <DashboardCountWidget
          title="כמות פניות החודש"
          value={loading ? null : counts.month}
          loading={loading}
          icon={<CalendarMonthIcon sx={{ fontSize: 28 }} />}
          accentColor="#2e7d32"
        />
        <DashboardCountWidget
          title="כמות פניות בכללי"
          value={loading ? null : counts.total}
          loading={loading}
          icon={<AssignmentIcon sx={{ fontSize: 28 }} />}
          accentColor="#111"
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <DashboardPieChartWidget
          title="חלוקה לפי סטטוס הפנייה"
          loading={loading}
          slices={statusBreakdown.map((item) => ({
            label: item.label,
            value: item.count,
            color: item.color,
            percentage: item.percentage,
          }))}
        />
      </Box>
    </Box>
  )
}
