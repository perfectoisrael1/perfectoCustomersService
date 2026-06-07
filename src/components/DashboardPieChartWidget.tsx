import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material'

export type PieChartSlice = {
  label: string
  value: number
  color: string
  percentage?: number
}

type DashboardPieChartWidgetProps = {
  title: string
  slices: PieChartSlice[]
  loading?: boolean
  emptyMessage?: string
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  }
}

function describeSlicePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle - startAngle >= 359.999) {
    return [
      `M ${cx} ${cy}`,
      `m 0 -${radius}`,
      `a ${radius} ${radius} 0 1 1 0 ${radius * 2}`,
      `a ${radius} ${radius} 0 1 1 0 -${radius * 2}`,
      'Z',
    ].join(' ')
  }

  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function buildSlicePaths(slices: PieChartSlice[], cx: number, cy: number, radius: number) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  if (total <= 0) return []

  let currentAngle = 0
  return slices.map((slice) => {
    const sliceAngle = (slice.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle
    currentAngle = endAngle
    return {
      ...slice,
      path: describeSlicePath(cx, cy, radius, startAngle, endAngle),
    }
  })
}

export default function DashboardPieChartWidget({
  title,
  slices,
  loading = false,
  emptyMessage = 'אין נתונים להצגה',
}: DashboardPieChartWidgetProps) {
  const chartSize = 220
  const cx = chartSize / 2
  const cy = chartSize / 2
  const radius = 92
  const slicePaths = buildSlicePaths(slices, cx, cy, radius)
  const hasData = slices.some((slice) => slice.value > 0)

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderWidth: 2,
        borderColor: '#111',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
        minWidth: 0,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, color: 'text.primary', mb: 2, textAlign: 'center' }}
        >
          {title}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#111' }} />
          </Box>
        ) : !hasData ? (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: 'center',
              gap: { xs: 2, md: 4 },
            }}
          >
            <Box sx={{ flexShrink: 0 }}>
              <svg
                width={chartSize}
                height={chartSize}
                viewBox={`0 0 ${chartSize} ${chartSize}`}
                role="img"
                aria-label={title}
              >
                {slicePaths.map((slice) => (
                  <path
                    key={slice.label}
                    d={slice.path}
                    fill={slice.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </svg>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                width: '100%',
                maxWidth: 360,
              }}
            >
              {slicePaths.map((slice) => (
                <Box
                  key={slice.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: slice.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {slice.label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {slice.value.toLocaleString('he-IL')}
                    {slice.percentage != null ? ` (${slice.percentage.toFixed(1)}%)` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
