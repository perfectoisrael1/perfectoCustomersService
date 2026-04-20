import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getCities, type City } from '../api/csApi'

type CityTab = 'list' | 'regions'

export default function CitiesPage() {
  const [rows, setRows] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<CityTab>('list')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getCities())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ערים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        String(r.city || '').toLowerCase().includes(q) ||
        String(r.region || '').toLowerCase().includes(q),
    )
  }, [rows, query])

  const byRegion = useMemo(() => {
    const map = new Map<string, City[]>()
    for (const r of filteredList) {
      const key = String(r.region || '—').trim() || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'he'))
  }, [filteredList])

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>אזורים וערים</Typography>

          <Tabs value={tab} onChange={(_e, v) => setTab(v as CityTab)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab value="list" label="כל הערים" />
            <Tab value="regions" label="לפי אזור" />
          </Tabs>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" placeholder="חיפוש עיר או אזור…" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="outlined" onClick={() => void load()}>רענון</Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>טוען…</Box>
          ) : tab === 'list' ? (
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>אזור</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>עיר</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>slug</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredList.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.region}</TableCell>
                      <TableCell>{row.city}</TableCell>
                      <TableCell>{row.slug || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredList.length === 0 ? (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6 }}>אין נתונים</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Stack spacing={1}>
              {byRegion.map(([region, cities]) => {
                const open = expanded[region] ?? false
                return (
                  <Box key={region} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    <Stack
                      direction="row"
                      onClick={() => setExpanded((e) => ({ ...e, [region]: !open }))}
                      sx={{ cursor: 'pointer', bgcolor: 'action.hover', px: 2, py: 1.5, alignItems: 'center' }}
                    >
                      <IconButton size="small" aria-label={open ? 'סגור' : 'פתח'}>
                        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography sx={{ fontWeight: 800, flex: 1 }}>{region}</Typography>
                      <Typography variant="body2" color="text.secondary">{cities.length} ערים</Typography>
                    </Stack>
                    <Collapse in={open}>
                      <Table size="small">
                        <TableBody>
                          {cities
                            .slice()
                            .sort((a, b) => a.city.localeCompare(b.city, 'he'))
                            .map((c) => (
                              <TableRow key={c.id}>
                                <TableCell sx={{ pl: 6 }}>{c.city}</TableCell>
                                <TableCell>{c.slug || '—'}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </Collapse>
                  </Box>
                )
              })}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
