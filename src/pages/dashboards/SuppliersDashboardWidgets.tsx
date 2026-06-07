import { Alert, Box } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DateRangeIcon from '@mui/icons-material/DateRange'
import PaidIcon from '@mui/icons-material/Paid'
import TodayIcon from '@mui/icons-material/Today'
import DashboardCountWidget from '../../components/DashboardCountWidget'
import { formatDashboardCurrency } from '../../lib/paymentLinksDashboard'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'

type SuppliersDashboardWidgetsProps = {
  loading: boolean
  error: string | null
  totals: {
    today: number
    week: number
    month: number
    total: number
  }
}

const formatIncome = (value: number) => formatDashboardCurrency(value)

export default function SuppliersDashboardWidgets({ loading, error, totals }: SuppliersDashboardWidgetsProps) {
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
          title="הכנסות היום"
          value={loading ? null : totals.today}
          loading={loading}
          icon={<TodayIcon sx={{ fontSize: 28 }} />}
          accentColor="#ef6c00"
          valueFormatter={formatIncome}
        />
        <DashboardCountWidget
          title="הכנסות השבוע"
          value={loading ? null : totals.week}
          loading={loading}
          icon={<DateRangeIcon sx={{ fontSize: 28 }} />}
          accentColor="#1565c0"
          valueFormatter={formatIncome}
        />
        <DashboardCountWidget
          title="הכנסות החודש"
          value={loading ? null : totals.month}
          loading={loading}
          icon={<CalendarMonthIcon sx={{ fontSize: 28 }} />}
          accentColor="#2e7d32"
          valueFormatter={formatIncome}
        />
        <DashboardCountWidget
          title="הכנסות כללי"
          value={loading ? null : totals.total}
          loading={loading}
          icon={<PaidIcon sx={{ fontSize: 28 }} />}
          accentColor="#111"
          valueFormatter={formatIncome}
        />
      </Box>
    </Box>
  )
}
