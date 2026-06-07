import type { ReactNode } from 'react'
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material'

type DashboardCountWidgetProps = {
  title: string
  value: number | null
  loading?: boolean
  icon?: ReactNode
  accentColor?: string
  valueFormatter?: (value: number) => string
}

export default function DashboardCountWidget({
  title,
  value,
  loading = false,
  icon,
  accentColor = '#111',
  valueFormatter,
}: DashboardCountWidgetProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderWidth: 2,
        borderColor: accentColor,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
        minWidth: 0,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            minHeight: 120,
            textAlign: 'center',
          }}
        >
          {icon ? (
            <Box sx={{ color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </Box>
          ) : null}
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={28} sx={{ color: accentColor, my: 1 }} />
          ) : (
            <Typography
              variant="h3"
              component="div"
              sx={{ fontWeight: 900, color: accentColor, lineHeight: 1.1, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
            >
              {value != null ? (valueFormatter ? valueFormatter(value) : value.toLocaleString('he-IL')) : '—'}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
