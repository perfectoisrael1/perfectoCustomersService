import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material'
import { getLeads, type Lead } from '../api/csApi'
import { useAuth } from '../context/useAuth'
import { getIsraelDateStamp, ISRAEL_TIMEZONE } from '../lib/israelTime'

const PAID_STATUS = 'שילם'
const DAY_WINDOW = 30
const CHART_HEIGHT = 220
const BAR_COLOR = '#2E7D32'

function israelDateStamp(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE })
}

function lastIsraelDays(count: number): string[] {
  const [y, m, d] = getIsraelDateStamp().split('-').map(Number)
  const stamps: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    stamps.push(new Date(Date.UTC(y, m - 1, d - offset)).toISOString().slice(0, 10))
  }
  return stamps
}

function formatDayLabel(stamp: string): string {
  const [, month, day] = stamp.split('-')
  return `${day}/${month}`
}

function isMyLead(row: Lead, fullName: string | null | undefined, username: string | null | undefined): boolean {
  const me = [fullName, username]
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean)
  const responsible = String(row.responsible || '').trim().toLowerCase()
  if (!responsible || me.length === 0) return false
  return me.some((name) => responsible === name || responsible.includes(name))
}

function closedOnStamp(row: Lead): string | null {
  return israelDateStamp(row.statusUpdateDate) || israelDateStamp(row.updated) || israelDateStamp(row.created)
}

export default function PersonalAchievementsPanel() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getLeads()
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setRows([])
          setError(err instanceof Error ? err.message : 'שגיאה בטעינת הישגים')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const chart = useMemo(() => {
    const days = lastIsraelDays(DAY_WINDOW)
    const counts = new Map(days.map((stamp) => [stamp, 0]))
    let total = 0
    for (const row of rows) {
      if (String(row.status || '').trim() !== PAID_STATUS) continue
      if (!isMyLead(row, user?.fullName, user?.username)) continue
      total += 1
      const stamp = closedOnStamp(row)
      if (stamp && counts.has(stamp)) counts.set(stamp, (counts.get(stamp) || 0) + 1)
    }
    const points = days.map((stamp) => ({ stamp, count: counts.get(stamp) || 0 }))
    const windowTotal = points.reduce((sum, point) => sum + point.count, 0)
    const peak = Math.max(1, ...points.map((point) => point.count))
    return { points, windowTotal, total, peak }
  }, [rows, user?.fullName, user?.username])

  return (
    <Box sx={{ direction: 'rtl', p: { xs: 0.5, sm: 1 } }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 0.5 }}>הישגים</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            לידים בסטטוס «שילם» שעליהם אתה האחראי
          </Typography>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ minWidth: 140 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    נסגרו ב־{DAY_WINDOW} הימים האחרונים
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 32, color: BAR_COLOR, lineHeight: 1.1 }}>
                    {chart.windowTotal}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 140 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    סה״כ לידים שנסגרו
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1 }}>
                    {chart.total}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="svg"
                  viewBox={`0 0 ${chart.points.length * 28} ${CHART_HEIGHT + 36}`}
                  role="img"
                  aria-label="גרף לידים שנסגרו לפי ימים"
                  sx={{ width: '100%', minWidth: 640, height: 280, display: 'block', direction: 'ltr' }}
                >
                  {chart.points.map((point, index) => {
                    const slot = 28
                    const barWidth = 16
                    const x = index * slot + (slot - barWidth) / 2
                    const barHeight = (point.count / chart.peak) * CHART_HEIGHT
                    const y = CHART_HEIGHT - barHeight
                    const showLabel = index % 5 === 0 || index === chart.points.length - 1
                    return (
                      <g key={point.stamp}>
                        <title>{`${formatDayLabel(point.stamp)}: ${point.count}`}</title>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(barHeight, point.count > 0 ? 2 : 0)}
                          rx={3}
                          fill={BAR_COLOR}
                        />
                        {point.count > 0 ? (
                          <text
                            x={x + barWidth / 2}
                            y={Math.max(y - 4, 12)}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#1b5e20"
                          >
                            {point.count}
                          </text>
                        ) : null}
                        {showLabel ? (
                          <text
                            x={x + barWidth / 2}
                            y={CHART_HEIGHT + 18}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#616161"
                          >
                            {formatDayLabel(point.stamp)}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
