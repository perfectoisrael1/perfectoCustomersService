import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  searchAccountsForNotification,
  sendSupplierNotification,
  type Account,
} from '../api/csApi'

const MAX_SELECTED_SUPPLIERS = 50

const outlinedTextFieldRtlSx = {
  direction: 'rtl',
  '& .MuiOutlinedInput-root': { direction: 'rtl' },
  '& .MuiInputBase-input': { textAlign: 'right' },
  '& .MuiInputLabel-root': {
    right: 28,
    left: 'auto',
    transformOrigin: 'top right',
  },
  '& .MuiOutlinedInput-notchedOutline legend': {
    textAlign: 'right',
    float: 'unset',
  },
  '& .MuiFormHelperText-root': {
    direction: 'rtl',
    textAlign: 'right',
    marginRight: 0,
    marginLeft: 0,
  },
} as const

function initialsFromLabel(label: string, id: number): string {
  const t = String(label || '').trim()
  if (t && !/^\d+$/.test(t)) {
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`
    }
    return t.slice(0, 2)
  }
  return String(id ?? '').slice(0, 2)
}

type SelectedSupplier = { id: number; label: string }

export default function SupplierNotificationsPanel() {
  const theme = useTheme()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'single' | 'all'>('single')
  const [selectedSuppliers, setSelectedSuppliers] = useState<SelectedSupplier[]>([])
  const [nameSearchInput, setNameSearchInput] = useState('')
  const [nameOptions, setNameOptions] = useState<Account[]>([])
  const [nameSearchLoading, setNameSearchLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const nameSearchInputRef = useRef(nameSearchInput)
  nameSearchInputRef.current = nameSearchInput

  const addSupplier = useCallback((item: { id: number; label: string }) => {
    const id = Number(item.id)
    if (!Number.isFinite(id) || id <= 0) return false
    const label = String(item.label || '').trim() || `ספק ${id}`
    setSelectedSuppliers((prev) => {
      if (prev.some((p) => p.id === id)) return prev
      if (prev.length >= MAX_SELECTED_SUPPLIERS) return prev
      return [...prev, { id, label }]
    })
    return true
  }, [])

  const removeSupplier = useCallback((id: number) => {
    setSelectedSuppliers((prev) => prev.filter((p) => p.id !== id))
  }, [])

  useEffect(() => {
    if (mode !== 'single') return undefined

    const handle = setTimeout(async () => {
      const q = String(nameSearchInputRef.current || '').trim()
      if (!q) {
        setNameOptions([])
        return
      }

      setNameSearchLoading(true)
      try {
        const rows = await searchAccountsForNotification(q, 25)
        setNameOptions(Array.isArray(rows) ? rows : [])
      } catch {
        setNameOptions([])
      } finally {
        setNameSearchLoading(false)
      }
    }, 350)

    return () => clearTimeout(handle)
  }, [nameSearchInput, mode])

  const validateBeforePreview = useCallback(() => {
    const t = String(title || '').trim()
    const b = String(body || '').trim()
    if (!t || !b) return 'נא למלא כותרת ותוכן'
    if (mode === 'single') {
      if (selectedSuppliers.length === 0) return 'נא להוסיף לפחות ספק אחד (לפי שם או מזהה)'
      if (selectedSuppliers.length > MAX_SELECTED_SUPPLIERS) {
        return `ניתן לשלוח לכל היותר ${MAX_SELECTED_SUPPLIERS} ספקים בבת אחת`
      }
    }
    return null
  }, [title, body, mode, selectedSuppliers])

  const openPreview = useCallback(() => {
    setError(null)
    setSuccess(null)
    const err = validateBeforePreview()
    if (err) {
      setError(err)
      return
    }
    setPreviewOpen(true)
  }, [validateBeforePreview])

  const closePreview = useCallback(() => {
    if (submitting) return
    setPreviewOpen(false)
  }, [submitting])

  const confirmSend = useCallback(async () => {
    const err = validateBeforePreview()
    if (err) {
      setError(err)
      setPreviewOpen(false)
      return
    }
    setError(null)
    setSuccess(null)
    const t = String(title || '').trim()
    const b = String(body || '').trim()
    setSubmitting(true)
    try {
      if (mode === 'all') {
        const res = await sendSupplierNotification({ title: t, body: b, mode: 'all' })
        const n = Number(res?.sent ?? 0)
        const queued = Boolean(res?.queued)
        setSuccess(
          queued
            ? `השליחה ל־${n} ספקים התחילה ברקע — ההתראות והפוש (Firebase) יגיעו בהדרגה (במערכות גדולות זה עלול לקחת מספר דקות).`
            : `נשלח ל־${n} ספקים (כולל רישום במרכז ההתראות וניסיון פוש דרך Firebase)`,
        )
        setPreviewOpen(false)
        return
      }

      const accountIds = selectedSuppliers.map((s) => s.id)
      const res = await sendSupplierNotification({
        title: t,
        body: b,
        mode: 'single',
        accountIds,
      })
      const n = Number(res?.sent ?? 0)
      if (n === 1) {
        setSuccess(`נשלח לספק מספר ${accountIds[0]}`)
      } else {
        setSuccess(`נשלח ל־${n} ספקים: ${accountIds.join(', ')}`)
      }
      setPreviewOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שליחה נכשלה')
      setPreviewOpen(false)
    } finally {
      setSubmitting(false)
    }
  }, [title, body, mode, selectedSuppliers, validateBeforePreview])

  const noOptionsCopy = (() => {
    const q = nameSearchInput.trim()
    if (!q) return 'הקלידו שם, טלפון או מזהה מספרי'
    const digitsOnly = /^\d+$/.test(q)
    const looksLikeId =
      digitsOnly && !q.startsWith('0') && q.length >= 1 && q.length <= 12
    if (looksLikeId && q.length < 2) {
      return 'לא נמצא ספק עם המזהה — או הקלידו לפחות 2 תווים לחיפוש לפי שם'
    }
    if (q.length < 2) return 'הקלידו לפחות 2 תווים לחיפוש לפי שם או טלפון'
    return 'לא נמצאו תוצאות'
  })()

  const previewTargetSummary =
    mode === 'all'
      ? 'כל הספקים הרשומים במערכת'
      : selectedSuppliers.length === 0
        ? 'לא נבחרו ספקים'
        : `${selectedSuppliers.length} ספקים נבחרו`

  const autocompleteRtlSx = {
    direction: 'rtl',
    mb: 1,
    '& .MuiOutlinedInput-root': { direction: 'rtl' },
    '& .MuiAutocomplete-inputRoot': { flexDirection: 'row-reverse', paddingRight: '14px !important' },
    '& .MuiAutocomplete-endAdornment': { left: 9, right: 'auto' },
    '& .MuiAutocomplete-popupIndicator': { display: 'none' },
  } as const

  return (
    <Box
      sx={{
        width: '50%',
        maxWidth: '100%',
        minWidth: 0,
        mx: 'auto',
        alignSelf: 'center',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          p: 2.5,
          direction: 'rtl',
          textAlign: 'right',
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : alpha(theme.palette.primary.main, 0.03),
        }}
      >
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          התראה לספקים
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2, direction: 'rtl' }}>
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" sx={{ mb: 2, direction: 'rtl' }}>
            {success}
          </Alert>
        ) : null}

        <TextField
          label="כותרת"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2, ...outlinedTextFieldRtlSx }}
          slotProps={{ htmlInput: { maxLength: 255, dir: 'rtl', style: { textAlign: 'right' } } }}
        />
        <TextField
          label="תוכן ההתראה"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          fullWidth
          required
          multiline
          minRows={5}
          sx={{ mb: 2, ...outlinedTextFieldRtlSx }}
          slotProps={{ htmlInput: { maxLength: 20000, dir: 'rtl', style: { textAlign: 'right' } } }}
        />

        <FormControl component="fieldset" sx={{ mb: 2, width: '100%', direction: 'rtl', textAlign: 'right' }}>
          <Typography component="legend" sx={{ fontWeight: 700, mb: 1, fontSize: '0.95rem', textAlign: 'right', width: '100%' }}>
            יעד שליחה
          </Typography>
          <RadioGroup
            value={mode}
            onChange={(e) => setMode(e.target.value as 'single' | 'all')}
            sx={{ gap: 0.5, direction: 'rtl', alignItems: 'flex-start' }}
          >
            <FormControlLabel
              value="single"
              control={<Radio />}
              label="ספקים לבחירה (לבדיקות)"
              sx={{ mr: 0, ml: 0, direction: 'rtl', '& .MuiFormControlLabel-label': { textAlign: 'right' } }}
            />
            <FormControlLabel
              value="all"
              control={<Radio />}
              label="כל הספקים במערכת"
              sx={{ mr: 0, ml: 0, direction: 'rtl', '& .MuiFormControlLabel-label': { textAlign: 'right' } }}
            />
          </RadioGroup>
        </FormControl>

        {mode === 'single' ? (
          <Box sx={{ mb: 2, direction: 'rtl', textAlign: 'right' }}>
            <Autocomplete
              size="small"
              options={nameOptions}
              loading={nameSearchLoading}
              value={null}
              inputValue={nameSearchInput}
              forcePopupIcon={false}
              onInputChange={(_, v) => setNameSearchInput(v)}
              onChange={(_, option) => {
                if (option && typeof option === 'object' && option.id != null) {
                  const id = Number(option.id)
                  const label =
                    String(option.accountName || '').trim() || `ספק ${id}`
                  addSupplier({ id, label })
                  setNameSearchInput('')
                  setNameOptions([])
                }
              }}
              getOptionLabel={(o) => {
                const name = String(o?.accountName || '').trim()
                const id = o?.id != null ? Number(o.id) : NaN
                if (name && Number.isFinite(id)) return `${name} (#${id})`
                if (Number.isFinite(id)) return `ספק #${id}`
                return ''
              }}
              isOptionEqualToValue={(a, b) => Number(a?.id) === Number(b?.id)}
              filterOptions={(opts) => opts}
              noOptionsText={noOptionsCopy}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="חיפוש ספק · שם / טלפון / מזהה"
                  placeholder="למשל: יוסי · 054… · או מספר מזהה כמו 12"
                  sx={{ ...outlinedTextFieldRtlSx }}
                />
              )}
              sx={{ ...autocompleteRtlSx, mb: 1.5 }}
            />

            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{
                mt: 0.5,
                minHeight: 30,
                direction: 'rtl',
                justifyContent: 'flex-end',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {selectedSuppliers.map((s) => (
                <Tooltip key={s.id} title={`${s.label} · מזהה ${s.id} — לחיצה להסרה`} arrow placement="top">
                  <Box
                    component="button"
                    type="button"
                    onClick={() => removeSupplier(s.id)}
                    sx={{
                      width: 26,
                      height: 26,
                      minWidth: 26,
                      borderRadius: '50%',
                      border: 'none',
                      p: 0,
                      cursor: 'pointer',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'transform 0.12s ease, opacity 0.12s ease',
                      '&:hover': { opacity: 0.92, transform: 'scale(1.06)' },
                      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.dark}`, outlineOffset: 2 },
                    }}
                  >
                    {initialsFromLabel(s.label, s.id)}
                  </Box>
                </Tooltip>
              ))}
            </Stack>
            {selectedSuppliers.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                עדיין לא נבחרו ספקים
              </Typography>
            ) : null}
          </Box>
        ) : null}

        <Box sx={{ width: '100%', direction: 'rtl' }}>
          <Button
            variant="contained"
            color="primary"
            disabled={submitting}
            onClick={openPreview}
            fullWidth
            sx={{ fontWeight: 700, py: 1.25 }}
          >
            שליחה
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={previewOpen}
        onClose={(_, reason) => {
          if (submitting) return
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') closePreview()
        }}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        disableEnforceFocus
        slotProps={{
          paper: {
            sx: {
              direction: 'rtl',
              borderRadius: 3,
              overflow: 'hidden',
              maxWidth: 440,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            textAlign: 'right',
            py: 1.5,
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            fontSize: '1.05rem',
          }}
        >
          תצוגה מקדימה לפני שליחה
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              py: 1.25,
              px: 2,
              color: 'text.secondary',
              bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.06 : 0.04),
            }}
          >
            תצוגת דמה — כך תיראה התראת הפוש על המכשיר (Firebase / FCM)
          </Typography>

          <Box
            sx={{
              position: 'relative',
              px: 2.5,
              py: 3.5,
              overflow: 'hidden',
              background: 'linear-gradient(155deg, #111111 0%, #333333 42%, #000000 100%)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.45,
                background:
                  'radial-gradient(circle at 78% 18%, rgba(255,221,0,0.35) 0%, transparent 42%), radial-gradient(circle at 12% 88%, rgba(255,221,0,0.15) 0%, transparent 38%)',
                pointerEvents: 'none',
              }}
            />
            <Paper
              elevation={0}
              sx={{
                position: 'relative',
                borderRadius: '18px',
                p: 2,
                bgcolor: '#ffffff',
                color: '#121212',
                maxWidth: 340,
                mx: 'auto',
                boxShadow: '0 14px 44px rgba(0,0,0,0.32)',
              }}
            >
              <Stack
                direction="row"
                sx={{ direction: 'rtl', gap: '18px', alignItems: 'flex-start' }}
              >
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '13px',
                    bgcolor: '#111111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    p: 0.65,
                    boxSizing: 'border-box',
                  }}
                  aria-hidden
                >
                  <Box
                    component="img"
                    src="/perfecto-logo.svg"
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                      direction: 'rtl',
                      mb: 0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.94rem',
                        lineHeight: 1.35,
                        textAlign: 'right',
                        flex: 1,
                        wordBreak: 'break-word',
                      }}
                    >
                      {title.trim() || '(ללא כותרת)'}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: 'rgba(0,0,0,0.42)',
                        flexShrink: 0,
                        pt: 0.15,
                        fontSize: '0.72rem',
                        fontWeight: 500,
                      }}
                    >
                      לפני דקה
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      color: 'rgba(0,0,0,0.82)',
                      textAlign: 'right',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {body.trim() || '(ללא תוכן)'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 1.75,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : alpha(theme.palette.grey[500], 0.06),
              borderTop: 1,
              borderColor: 'divider',
              textAlign: 'right',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
              יעד שליחה (במערכת הניהול)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {previewTargetSummary}
            </Typography>
            {mode === 'single' && selectedSuppliers.length > 0 ? (
              <Box
                component="ul"
                sx={{
                  m: 0,
                  mt: 1,
                  pr: 2.25,
                  pl: 0,
                  maxHeight: 120,
                  overflow: 'auto',
                  '& li': { mb: 0.35 },
                }}
              >
                {selectedSuppliers.map((s) => (
                  <Typography key={s.id} component="li" variant="caption" sx={{ textAlign: 'right', color: 'text.secondary' }}>
                    {s.label}{' '}
                    <Typography component="span" variant="caption" color="text.disabled">
                      (מזהה {s.id})
                    </Typography>
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            direction: 'rtl',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            gap: 1,
            px: 2.5,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button variant="outlined" disabled={submitting} onClick={closePreview} sx={{ fontWeight: 700 }}>
            חזרה לעריכה
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={submitting}
            onClick={() => void confirmSend()}
            sx={{ fontWeight: 700, minWidth: 132 }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'אישור שליחה'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
