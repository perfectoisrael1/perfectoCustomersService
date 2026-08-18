import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  requestAccountDeletionCode,
  submitAccountDeletionRequest,
} from '../api/accountDeletionApi'

type Step = 'phone' | 'code' | 'done'

function normalizePhoneInput(raw: string): string {
  return String(raw || '').replace(/\D/g, '')
}

function isValidIsraeliMobile(digits: string): boolean {
  return /^05\d{8}$/.test(digits)
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fff',
    '&.Mui-focused fieldset': {
      borderColor: '#111',
      borderWidth: 2,
    },
  },
} as const

export default function AccountDeletionRequestPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyRequested, setAlreadyRequested] = useState(false)

  useEffect(() => {
    document.title = 'בקשה למחיקת חשבון, פרפקטו'
  }, [])

  const phoneDigits = normalizePhoneInput(phone)

  const sendCode = useCallback(async () => {
    setError(null)
    if (!isValidIsraeliMobile(phoneDigits)) {
      setError('יש להזין מספר טלפון ישראלי תקין (05XXXXXXXX)')
      return
    }
    setLoading(true)
    try {
      await requestAccountDeletionCode(phoneDigits)
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחת הקוד')
    } finally {
      setLoading(false)
    }
  }, [phoneDigits])

  const submitRequest = useCallback(async () => {
    setError(null)
    const trimmedCode = code.replace(/\D/g, '')
    if (trimmedCode.length !== 6) {
      setError('יש להזין קוד בן 6 ספרות')
      return
    }
    setLoading(true)
    try {
      const result = await submitAccountDeletionRequest(phoneDigits, trimmedCode)
      setAlreadyRequested(!!result.alreadyRequested)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחת הבקשה')
    } finally {
      setLoading(false)
    }
  }, [code, phoneDigits])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        direction: 'rtl',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 480,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'stretch' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: '#FFDD00',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                fontSize: 28,
                fontWeight: 800,
                color: '#111',
              }}
            >
              ×
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }} gutterBottom>
              בקשה למחיקת חשבון
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              פרפקטו, אפליקציה לבעלי מקצוע
            </Typography>
          </Box>

          {step !== 'done' ? (
            <>
              {error ? <Alert severity="error">{error}</Alert> : null}

              {step === 'phone' ? (
                <>
                  <TextField
                    label="מספר טלפון רשום באפליקציה"
                    placeholder="05XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    sx={fieldSx}
                    slotProps={{
                      htmlInput: {
                        inputMode: 'tel',
                        dir: 'ltr',
                        style: { textAlign: 'left' },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                    onClick={() => void sendCode()}
                    sx={{ fontWeight: 700, py: 1.4, color: '#111' }}
                  >
                    {loading ? 'שולח…' : 'שליחת קוד אימות'}
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    נשלח קוד SMS למספר{' '}
                    <Box component="span" dir="ltr" sx={{ fontWeight: 600 }}>
                      {phoneDigits}
                    </Box>
                  </Typography>
                  <TextField
                    label="קוד אימות"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    fullWidth
                    sx={fieldSx}
                    slotProps={{
                      htmlInput: {
                        inputMode: 'numeric',
                        dir: 'ltr',
                        style: { textAlign: 'center', letterSpacing: 6 },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                    onClick={() => void submitRequest()}
                    sx={{ fontWeight: 700, py: 1.4, color: '#111' }}
                  >
                    {loading ? 'שולח…' : 'שליחת בקשה למחיקה'}
                  </Button>
                  <Button
                    variant="text"
                    disabled={loading}
                    onClick={() => {
                      setStep('phone')
                      setCode('')
                      setError(null)
                    }}
                  >
                    שינוי מספר טלפון
                  </Button>
                </>
              )}
            </>
          ) : (
            <Alert severity="success" sx={{ textAlign: 'right' }}>
              {alreadyRequested
                ? 'בקשת מחיקה כבר הוגשה עבור חשבון זה. צוות התמיכה יטפל בה בהקדם.'
                : 'הבקשה התקבלה בהצלחה. צוות התמיכה יבדוק אותה ויצור קשר במידת הצורך.'}
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', pt: 1 }}>
            לשאלות נוספות ניתן לפנות לשירות הלקוחות דרך האפליקציה.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
