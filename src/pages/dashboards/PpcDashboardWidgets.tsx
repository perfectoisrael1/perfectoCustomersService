import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import CampaignIcon from '@mui/icons-material/Campaign'
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import DashboardCountWidget from '../../components/DashboardCountWidget'
import CsDialogTitleWithMenu from '../../components/CsDialogTitleWithMenu'
import type { Job, PpcDashboardKind, PpcDashboardSummary } from '../../api/csApi'
import { expenseRtlFieldSx } from '../../lib/expensesUi'
import { formatCsDateTime, formatCsPhoneDisplay, jobStatusChipColors } from '../../lib/caliberUi'
import { GAP_BELOW_INNER_NAV_PX } from '../../layout/headerLayout'
import {
  formatDashboardCurrency,
  REVENUE_PERIOD_OPTIONS,
  type RevenuePeriodId,
} from '../../lib/paymentLinksDashboard'
import { csDataTableSx } from '../../lib/csTableUi'
import { ppcDashboardPath } from '../../lib/ppcDashboardRoutes'

type PpcDashboardWidgetsProps = {
  loading: boolean
  error: string | null
  summary: PpcDashboardSummary
  period: RevenuePeriodId
  onPeriodChange: (period: RevenuePeriodId) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  kind: PpcDashboardKind | null
  jobId: number | null
}

const KIND_TITLE: Record<PpcDashboardKind, string> = {
  profit: 'שורת רווח — פניות ששולמו',
  ppcLeads: 'לידים שהגיעו מ-PPC',
  ppcApproved: 'נסגרו בסטטוס מאושר',
  followUpsCreated: 'פולואפים שנוצרו ממומן',
  followUpsApproved: 'פולואפים שנסגרו ממומן',
}

function jobCustomerName(row: Job): string {
  return String(row.customerName || row.accountName || '').trim() || '—'
}

function jobProName(row: Job): string {
  if (row.accountId == null) return 'לא משויך'
  return String(row.accountName || '').trim() || '—'
}

function jobSourceLabel(source: string | null | undefined): string {
  const raw = String(source || '').trim()
  if (!raw) return '—'
  if (raw.toLowerCase() === 'ppc') return 'PPC'
  return raw
}

export default function PpcDashboardWidgets({
  loading,
  error,
  summary,
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  kind,
  jobId,
}: PpcDashboardWidgetsProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const go = (nextKind?: PpcDashboardKind | null, nextJobId?: number | null) => {
    navigate(`${ppcDashboardPath(nextKind, nextJobId)}${location.search}`)
  }

  const rows = useMemo(() => (kind ? summary.rows[kind] ?? [] : []), [kind, summary.rows])
  const showAmount = kind === 'profit'
  const detail = useMemo(() => {
    if (!kind || jobId == null) return null
    return rows.find((row) => row.id === jobId) ?? null
  }, [kind, jobId, rows])

  useEffect(() => {
    if (loading || jobId == null || !kind || detail) return
    navigate(`${ppcDashboardPath(kind)}${location.search}`, { replace: true })
  }, [loading, jobId, kind, detail, navigate, location.search])

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
          onChange={(_e, v) => onPeriodChange(v as RevenuePeriodId)}
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
              onChange={(e) => onCustomFromChange(e.target.value)}
              sx={{ ...expenseRtlFieldSx, minWidth: 160 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              size="small"
              type="date"
              label="עד תאריך"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              sx={{ ...expenseRtlFieldSx, minWidth: 160 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { dir: 'rtl' } }}
            />
          </Box>
        ) : null}
      </Box>

      <Box sx={{ mb: 2, width: '100%' }}>
        <DashboardCountWidget
          title={KIND_TITLE.profit}
          value={loading ? null : summary.profit}
          loading={loading}
          icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
          accentColor="#2e7d32"
          valueFormatter={formatDashboardCurrency}
          layout="bar"
          onClick={loading ? undefined : () => go('profit')}
        />
      </Box>

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
          title={KIND_TITLE.ppcLeads}
          value={loading ? null : summary.ppcLeads}
          loading={loading}
          icon={<CampaignIcon sx={{ fontSize: 28 }} />}
          accentColor="#6a1b9a"
          onClick={loading ? undefined : () => go('ppcLeads')}
        />
        <DashboardCountWidget
          title={KIND_TITLE.ppcApproved}
          value={loading ? null : summary.ppcApproved}
          loading={loading}
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 28 }} />}
          accentColor="#1565c0"
          onClick={loading ? undefined : () => go('ppcApproved')}
        />
        <DashboardCountWidget
          title={KIND_TITLE.followUpsCreated}
          value={loading ? null : summary.followUpsCreated}
          loading={loading}
          icon={<PhoneCallbackIcon sx={{ fontSize: 28 }} />}
          accentColor="#ef6c00"
          onClick={loading ? undefined : () => go('followUpsCreated')}
        />
        <DashboardCountWidget
          title={KIND_TITLE.followUpsApproved}
          value={loading ? null : summary.followUpsApproved}
          loading={loading}
          icon={<TaskAltIcon sx={{ fontSize: 28 }} />}
          accentColor="#00838f"
          onClick={loading ? undefined : () => go('followUpsApproved')}
        />
      </Box>

      <Dialog
        open={kind != null}
        onClose={() => go()}
        maxWidth="lg"
        fullWidth
      >
        <CsDialogTitleWithMenu
          heading={kind ? `${KIND_TITLE[kind]} (${rows.length})` : ''}
          onClose={() => go()}
        />
        <DialogContent dividers sx={{ px: 0, pb: 0 }}>
          <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
            <Table stickyHeader size="small" sx={(theme) => csDataTableSx(theme)}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>מזהה</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>לקוח</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>טלפון</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>תחום</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>עיר</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>סטטוס</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>מקור</TableCell>
                  {showAmount ? <TableCell sx={{ fontWeight: 800 }}>סכום</TableCell> : null}
                  <TableCell sx={{ fontWeight: 800 }}>נוצר</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => go(kind, row.id)}
                  >
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.id}</TableCell>
                    <TableCell>{jobCustomerName(row)}</TableCell>
                    <TableCell>{formatCsPhoneDisplay(row.customerPhone || row.phoneNumber)}</TableCell>
                    <TableCell>{row.leadDomain || row.specialtiesCategory || '—'}</TableCell>
                    <TableCell>{row.city || '—'}</TableCell>
                    <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                      <Chip
                        size="small"
                        label={row.statusLabel || '—'}
                        sx={{
                          bgcolor: jobStatusChipColors(row.statusLabel).bg,
                          color: jobStatusChipColors(row.statusLabel).fg,
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>{jobSourceLabel(row.source)}</TableCell>
                    {showAmount ? (
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                        {formatDashboardCurrency(Number(row.paidAmount) || 0)}
                      </TableCell>
                    ) : null}
                    <TableCell>{formatCsDateTime(row.created)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showAmount ? 9 : 8} align="center" sx={{ py: 6 }}>
                      אין שורות להצגה
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onClose={() => go(kind)} maxWidth="md" fullWidth>
        <CsDialogTitleWithMenu
          heading={`פנייה #${detail?.id ?? ''}`}
          onClose={() => go(kind)}
        />
        <DialogContent dividers>
          {detail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pt: 0.5 }}>
              <Typography>
                <strong>לקוח:</strong> {jobCustomerName(detail)}
              </Typography>
              <Typography>
                <strong>טלפון:</strong>{' '}
                {formatCsPhoneDisplay(detail.customerPhone || detail.phoneNumber)}
              </Typography>
              <Typography>
                <strong>בעל מקצוע:</strong> {jobProName(detail)}
              </Typography>
              <Typography>
                <strong>עסק:</strong> {detail.businessName || '—'}
              </Typography>
              <Typography>
                <strong>תחום:</strong> {detail.leadDomain || detail.specialtiesCategory || '—'}
              </Typography>
              <Typography>
                <strong>עיר:</strong> {detail.city || '—'}
              </Typography>
              <Typography>
                <strong>סטטוס:</strong> {detail.statusLabel || '—'}
              </Typography>
              <Typography>
                <strong>מקור:</strong> {jobSourceLabel(detail.source)}
              </Typography>
              {detail.paidAmount != null ? (
                <Typography>
                  <strong>סכום ששולם:</strong> {formatDashboardCurrency(Number(detail.paidAmount) || 0)}
                </Typography>
              ) : null}
              <Typography>
                <strong>החרגות:</strong> {detail.exclusionReason || '—'}
              </Typography>
              <Typography>
                <strong>תיאור:</strong> {detail.description || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                נוצר: {formatCsDateTime(detail.created)} · עודכן: {formatCsDateTime(detail.updated)}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
