import type { ReactNode } from 'react'
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material'

type DashboardCountWidgetProps = {
  title: string
  value: number | null
  loading?: boolean
  icon?: ReactNode
  accentColor?: string
  valueFormatter?: (value: number) => string
  /** כרטיס מלבני רחב עם תוכן ממורכז */
  layout?: 'stack' | 'bar'
  onClick?: () => void
}

export default function DashboardCountWidget({
  title,
  value,
  loading = false,
  icon,
  accentColor = '#111',
  valueFormatter,
  layout = 'stack',
  onClick,
}: DashboardCountWidgetProps) {
  const isBar = layout === 'bar'
  const formatted =
    value != null ? (valueFormatter ? valueFormatter(value) : value.toLocaleString('he-IL')) : '—'

  return (
    <Card
      variant="outlined"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      sx={{
        borderRadius: 3,
        borderWidth: 2,
        borderColor: accentColor,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
        minWidth: 0,
        height: '100%',
        ...(onClick
          ? {
              cursor: 'pointer',
              transition: 'box-shadow 120ms ease, transform 120ms ease',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
              },
            }
          : null),
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: isBar ? 2.25 : 2.5 }, height: '100%' }}>
        <Box
          sx={
            isBar
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  minHeight: { xs: 72, sm: 80 },
                  textAlign: 'center',
                }
              : {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  minHeight: 120,
                  textAlign: 'center',
                }
          }
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.25,
              minWidth: 0,
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
          </Box>
          {loading ? (
            <CircularProgress size={28} sx={{ color: accentColor, my: isBar ? 0 : 1 }} />
          ) : (
            <Typography
              variant="h3"
              component="div"
              sx={{
                fontWeight: 900,
                color: accentColor,
                lineHeight: 1.1,
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
                whiteSpace: 'nowrap',
              }}
            >
              {formatted}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
