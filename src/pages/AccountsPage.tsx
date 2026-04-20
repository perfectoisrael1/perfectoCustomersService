import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
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
import CloseIcon from '@mui/icons-material/Close'
import {
  accountStatusCellBg,
  formatCsPhoneDisplay,
  isCreatedTodayJerusalem,
  mapAccountStatusLabel,
} from '../lib/caliberUi'
import { getAccounts, type Account } from '../api/csApi'

type AccountTab = 'customers' | 'today'

export default function AccountsPage() {
  const { segment } = useParams<{ segment: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    const s = String(segment || '')
    if (s && s !== 'businesses' && s !== 'today') {
      navigate('/accounts/businesses', { replace: true })
    }
  }, [segment, navigate])

  const tab: AccountTab = segment === 'today' ? 'today' : 'customers'

  const [rows, setRows] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Account | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAccounts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת לקוחות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const tabRows = useMemo(() => {
    if (tab === 'today') return rows.filter((r) => isCreatedTodayJerusalem(r.createdAt))
    return rows
  }, [rows, tab])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabRows
    const qDigits = q.replace(/\D/g, '')
    return tabRows.filter((r) => {
      const name = String(r.accountName || '').toLowerCase()
      const phone = String(r.phoneNumber || '').replace(/\D/g, '')
      const blob = [
        r.businessName,
        r.email,
        r.specialtiesCategory,
        r.phoneNumber,
        mapAccountStatusLabel(r.perfectoStatus || r.accountStatus),
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return name.includes(q) || blob.includes(q) || (qDigits.length > 0 && phone.includes(qDigits))
    })
  }, [query, tabRows])

  const counts = useMemo(
    () => ({
      customers: rows.length,
      today: rows.filter((r) => isCreatedTodayJerusalem(r.createdAt)).length,
    }),
    [rows],
  )

  return (
    <>
      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              לקוחות
            </Typography>

            <Tabs
              value={tab}
              onChange={(_e, v) => {
                const next = v as AccountTab
                navigate(next === 'today' ? '/accounts/today' : '/accounts/businesses')
              }}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab value="customers" label={`כל הלקוחות (${counts.customers})`} />
              <Tab value="today" label={`הצטרפויות היום (${counts.today})`} />
            </Tabs>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                placeholder="חיפוש לפי שם, טלפון, תחום…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="contained" onClick={() => void load()}>
                רענון
              </Button>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>טוען…</Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  מוצגות {filtered.length} רשומות
                </Typography>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>שם</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>טלפון</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>תחום</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>סטטוס</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>קרדיטים</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>עודכן</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((row) => {
                        const statusRaw = row.perfectoStatus || row.accountStatus
                        const statusDisp = mapAccountStatusLabel(statusRaw)
                        const bg = accountStatusCellBg(statusDisp)
                        return (
                          <TableRow
                            key={row.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setDetail(row)}
                          >
                            <TableCell>{row.accountName}</TableCell>
                            <TableCell>{formatCsPhoneDisplay(row.phoneNumber)}</TableCell>
                            <TableCell>{row.specialtiesCategory || '—'}</TableCell>
                            <TableCell sx={bg ? { bgcolor: bg } : undefined}>
                              <Chip size="small" label={statusDisp} variant="outlined" />
                            </TableCell>
                            <TableCell>{row.credits ?? '—'}</TableCell>
                            <TableCell>{row.updatedAt}</TableCell>
                          </TableRow>
                        )
                      })}
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            אין נתונים
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {detail?.accountName}
          <IconButton onClick={() => setDetail(null)} aria-label="סגור">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detail ? (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2"><strong>טלפון:</strong> {formatCsPhoneDisplay(detail.phoneNumber)}</Typography>
              <Typography variant="body2"><strong>אימייל:</strong> {detail.email || '—'}</Typography>
              <Typography variant="body2"><strong>עסק:</strong> {detail.businessName || '—'}</Typography>
              <Typography variant="body2"><strong>תחום:</strong> {detail.specialtiesCategory || '—'}</Typography>
              <Typography variant="body2"><strong>אזורי עבודה:</strong> {detail.workingAreas || '—'}</Typography>
              <Typography variant="body2"><strong>סטטוס:</strong> {mapAccountStatusLabel(detail.perfectoStatus || detail.accountStatus)}</Typography>
              <Typography variant="body2"><strong>קרדיטים:</strong> {detail.credits ?? '—'}</Typography>
              <Typography variant="body2"><strong>אודות:</strong> {detail.about || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">
                נוצר: {detail.createdAt}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
