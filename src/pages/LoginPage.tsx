import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import LockIcon from '@mui/icons-material/Lock'
import { useAuth } from '../context/useAuth'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        background: 'linear-gradient(160deg, #1a1a1a 0%, #333 40%, #111 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Box
            component="img"
            src="/perfecto-logo.svg"
            alt="Perfecto"
            sx={{ width: 88, height: 88, borderRadius: '50%', mb: 2 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Perfecto
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            כניסת צוות שירות לקוחות
          </Typography>

          <Stack component="form" spacing={2} onSubmit={onSubmit}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="שם משתמש"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="סיסמה"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ py: 1.2, fontWeight: 700 }}
            >
              {submitting ? 'מתחבר...' : 'התחברות'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
