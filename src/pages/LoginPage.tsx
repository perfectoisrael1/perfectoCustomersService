import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import LockIcon from '@mui/icons-material/Lock'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { useAuth } from '../context/useAuth'

/** RTL input + extra space from the right edge so hint/value sit left */
const loginHtmlInput = (ariaLabel: string) =>
  ({
    dir: 'rtl' as const,
    style: { textAlign: 'right' as const },
    'aria-label': ariaLabel,
  }) as const

const loginFieldInputSx = {
  '& .MuiInputBase-input': {
    paddingRight: '38px',
    py: 1.35,
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'text.secondary',
    opacity: 1,
  },
}

const outlinedFieldSurfaceSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: 'rgba(255, 255, 255, 0.92)',
    transition: 'box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
    '&:hover': {
      bgcolor: '#fff',
    },
    '&.Mui-focused': {
      bgcolor: '#fff',
      boxShadow: '0 0 0 3px rgba(255, 221, 0, 0.22)',
    },
  },
}

function LoginSplitHero() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        display: 'flex',
        flex: { xs: '0 0 auto', md: '1 1 0%' },
        minWidth: { md: 0 },
        maxWidth: { md: '50%' },
        width: '100%',
        height: { xs: 'clamp(168px, 32vh, 248px)', md: 'auto' },
        minHeight: { xs: 0, md: '100vh' },
        alignItems: 'stretch',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(158deg, #071525 0%, #0f2844 40%, #0a1e36 85%, #071a2e 100%)',
        paddingTop: { xs: 'env(safe-area-inset-top, 0px)', md: 0 },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.14,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-width='0.5' d='M30 0l25.98 15v30L30 60 4.02 45V15z'/%3E%3C/svg%3E")`,
          backgroundSize: '56px 56px',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(ellipse 90% 70% at 75% 25%, rgba(56, 189, 248, 0.12) 0%, transparent 55%)',
            'radial-gradient(ellipse 65% 50% at 15% 80%, rgba(96, 165, 250, 0.08) 0%, transparent 50%)',
          ].join(', '),
        }}
      />
      <Box
        component="svg"
        viewBox="0 0 900 920"
        preserveAspectRatio="xMidYMid slice"
        sx={{
          position: 'absolute',
          width: '112%',
          height: '112%',
          minWidth: '100%',
          minHeight: '100%',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: { xs: 0.85, md: 0.95 },
        }}
      >
        <defs>
          <linearGradient id="login-hero-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="login-hero-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          <filter id="login-hero-blur">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <path
          d="M180 560 Q320 480 460 520 T780 480"
          fill="none"
          stroke="url(#login-hero-line)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.55"
          filter="url(#login-hero-blur)"
        />
        <path
          d="M120 320 Q280 260 420 300 T720 220"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="6 10"
        />
        <path
          d="M200 200 Q380 120 540 180 T860 140"
          fill="none"
          stroke="rgba(125,211,252,0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {[
          [220, 318],
          [418, 298],
          [540, 182],
          [760, 478],
          [640, 360],
          [380, 520],
          [520, 240],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="5" fill="rgba(255,255,255,0.95)" opacity="0.9" />
            <circle cx={cx} cy={cy} r="12" fill="url(#login-hero-glow)" opacity="0.45" />
          </g>
        ))}
        <path
          d="M140 640c80-30 160 10 240-20s160-60 260-35 200 55 260 20"
          fill="none"
          stroke="rgba(147,197,253,0.45)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(148,163,184,0.2)"
          strokeWidth="0.8"
          d="M260 380c120-80 220-95 340-55s200 120 200 200-40 155-130 195-195 35-280-15-155-130-155-220 25-105 25-105z"
        />
        <path
          fill="rgba(255,255,255,0.04)"
          d="M480 300c90-50 170-40 230 20s70 130 30 195-130 90-210 75-130-60-120-135 70-130 70-155z"
        />
        <g transform="translate(580, 640)">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={i * 22}
              y={55 - i * 14}
              width="14"
              height={10 + i * 14}
              rx="3"
              fill="rgba(255,255,255,0.78)"
              opacity={0.35 + i * 0.12}
            />
          ))}
          <path
            d="M0 115 L44 72 L88 95 L132 48 L176 60"
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        </g>
        <text x="620" y="610" fill="rgba(255,255,255,0.35)" fontSize="13" fontFamily="system-ui, sans-serif">
          Global Network
        </text>
        <text x="120" y="200" fill="rgba(255,255,255,0.22)" fontSize="12" fontFamily="system-ui, sans-serif">
          Operations
        </text>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 10, md: 28 },
          left: { xs: 16, md: 28 },
          right: { xs: 16, md: 28 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 600,
            fontSize: { xs: '0.7rem', md: undefined },
          }}
        >
          Powered by פרפקטו
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', md: undefined } }}>
            MFA
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

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
        minHeight: { xs: '100dvh', md: '100vh' },
        height: { md: '100vh' },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
        direction: 'ltr',
      }}
    >
      <LoginSplitHero />
      <Box
        sx={{
          flex: { xs: '1 1 0%', md: '1 1 0%' },
          minWidth: { md: 0 },
          maxWidth: { md: '50%' },
          width: '100%',
          minHeight: { xs: 0, md: '100vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          direction: 'rtl',
          position: 'relative',
          overflowY: { xs: 'auto', md: 'hidden' },
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          px: { xs: 2, sm: 4 },
          pt: { xs: 3, sm: 6 },
          pb: { xs: 'calc(24px + env(safe-area-inset-bottom, 0px))', sm: 6 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(168deg, #eceff5 0%, #f6f7fb 42%, #eef1f6 100%)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            backgroundImage: `
              linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(255, 221, 0, 0.06) 0%, transparent 55%)',
          }}
        />
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 420,
            mx: 'auto',
            p: { xs: 3, sm: 4.5 },
            borderRadius: 3,
            textAlign: 'center',
            border: '1px solid rgba(15, 23, 42, 0.07)',
            boxShadow: [
              '0 1px 2px rgba(15, 23, 42, 0.04)',
              '0 16px 48px rgba(15, 23, 42, 0.09)',
              '0 40px 90px rgba(15, 23, 42, 0.06)',
            ].join(', '),
            bgcolor: '#fff',
          }}
        >
          <Box
            component="img"
            src="/perfecto-logo.svg"
            alt="פרפקטו"
            sx={{ width: 76, height: 76, borderRadius: '50%', mb: 2.25, mx: 'auto' }}
          />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.75, letterSpacing: '-0.02em' }}>
            פרפקטו
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mb: 3.5,
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            כניסת עובדים
          </Typography>

          <Stack component="form" spacing={2.5} onSubmit={onSubmit}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              placeholder="שם משתמש"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              sx={outlinedFieldSurfaceSx}
              slotProps={{
                htmlInput: loginHtmlInput('שם משתמש'),
                input: {
                  sx: loginFieldInputSx,
                  endAdornment: (
                    <InputAdornment position="end">
                      <PersonIcon sx={{ color: 'text.secondary', opacity: 0.85 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              placeholder="סיסמה"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              sx={outlinedFieldSurfaceSx}
              slotProps={{
                htmlInput: loginHtmlInput('סיסמה'),
                input: {
                  sx: loginFieldInputSx,
                  endAdornment: (
                    <InputAdornment position="end">
                      <LockIcon sx={{ color: 'text.secondary', opacity: 0.85 }} />
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
              sx={{
                mt: 0.25,
                py: 1.35,
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)' },
              }}
            >
              {submitting ? 'מתחבר...' : 'התחברות'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
