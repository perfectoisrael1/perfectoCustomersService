import { useMemo, useState } from 'react'
import { Alert, Box, Tab, Tabs, TextField } from '@mui/material'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import DashboardCountWidget from '../../components/DashboardCountWidget'
import type { PaymentLinkRow } from '../../api/csApi'
import { jerusalemYmd } from '../../lib/caliberUi'
import { expenseRtlFieldSx } from '../../lib/expensesUi'
import { jerusalemMonthStartYmd } from '../../lib/leadsDashboard'
import {
  formatDashboardCurrency,
  REVENUE_PERIOD_OPTIONS,
  revenuePeriodRange,
  sumPaidInquiryPaymentLinksInRange,
  sumPaidMembershipPaymentLinksInRange,
  type RevenuePeriodId,
} from '../../lib/paymentLinksDashboard'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'

type RevenueDashboardWidgetsProps = {
  loading: boolean
  error: string | null
  rows: PaymentLinkRow[]
}

const formatIncome = (value: number) => formatDashboardCurrency(value)

export default function RevenueDashboardWidgets({
  loading,
  error,
  rows,
}: RevenueDashboardWidgetsProps) {
  const [period, setPeriod] = useState<RevenuePeriodId>('month')
  const [customFrom, setCustomFrom] = useState(() => jerusalemMonthStartYmd())
  const [customTo, setCustomTo] = useState(() => jerusalemYmd())

  const { fromYmd, toYmd } = useMemo(
    () => revenuePeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const totals = useMemo(
    () => ({
      inquiries: sumPaidInquiryPaymentLinksInRange(rows, fromYmd, toYmd),
      membership: sumPaidMembershipPaymentLinksInRange(rows, fromYmd, toYmd),
    }),
    [rows, fromYmd, toYmd],
  )

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
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Tabs
          value={period}
          onChange={(_e, v) => setPeriod(v as RevenuePeriodId)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            '& .MuiTabs-indicator': { height: 3 },
            '& .MuiTab-root': { minHeight: 40, py: 0, fontWeight: 700 },
          }}
        >
          {REVENUE_PERIOD_OPTIONS.map((option) => (
            <Tab key={option.id} value={option.id} label={option.label} />
          ))}
        </Tabs>
        {period === 'custom' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="date"
              label="מתאריך"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              sx={{ ...expenseRtlFieldSx, minWidth: 160 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              size="small"
              type="date"
              label="עד תאריך"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              sx={{ ...expenseRtlFieldSx, minWidth: 160 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { dir: 'rtl' } }}
            />
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
          width: '100%',
          maxWidth: 880,
          alignItems: 'stretch',
        }}
      >
        <DashboardCountWidget
          title="הכנסות מפניות"
          value={loading ? null : totals.inquiries}
          loading={loading}
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 28 }} />}
          accentColor="#1565c0"
          valueFormatter={formatIncome}
        />
        <DashboardCountWidget
          title="הכנסות מדמי הרשמה"
          value={loading ? null : totals.membership}
          loading={loading}
          icon={<HowToRegIcon sx={{ fontSize: 28 }} />}
          accentColor="#2e7d32"
          valueFormatter={formatIncome}
        />
      </Box>
    </Box>
  )
}
