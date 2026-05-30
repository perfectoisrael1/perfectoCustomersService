import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/useAuth'
import { meRequest, patchPerfectoCustomerServiceUser } from '../api/csApi'

export default function PersonalDetailsTab() {
  const { token, user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setFullName(user.fullName || '')
    setUsername(user.username || '')
    setPassword('')
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user?.id) return
    const name = fullName.trim()
    if (!name) {
      setError('יש להזין שם מלא')
      return
    }
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const body: Record<string, string> = { fullName: name }
      if (password.trim()) body.password = password.trim()
      await patchPerfectoCustomerServiceUser(user.id, body)
      const fresh = await meRequest(token)
      refreshUser(fresh)
      setPassword('')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא ניתן לשמור')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ direction: 'rtl', display: 'flex', justifyContent: 'flex-start' }}>
      <Box
        component="form"
        onSubmit={(e) => void handleSubmit(e)}
        sx={{
          width: 'min(100%, 520px)',
          p: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: 2,
        }}
      >
        <Stack spacing={2.5}>
          <FormControl fullWidth>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>שם מלא</Typography>
            <OutlinedInput value={fullName} onChange={(e) => setFullName(e.target.value)} size="small" />
          </FormControl>
          <FormControl fullWidth>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>שם משתמש</Typography>
            <OutlinedInput value={username} disabled size="small" />
          </FormControl>
          <FormControl fullWidth>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>סיסמה חדשה (אופציונלי)</Typography>
            <OutlinedInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              placeholder="השאר ריק אם אין שינוי"
            />
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
          {success && !error && <Alert severity="success">הפרופיל נשמר בהצלחה</Alert>}
          <Button type="submit" variant="contained" disabled={saving || !token}>
            {saving ? 'שומר...' : 'שמירת פרופיל'}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
