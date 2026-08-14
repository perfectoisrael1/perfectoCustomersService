import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  closeConversation,
  getConversationMessages,
  getConversations,
  sendConversationAgentMessage,
  type Conversation,
  type ConversationMessage,
} from '../api/csApi'
import CsTableContainer from '../components/CsStandardTable'
import { csDataTableSx } from '../lib/csTableUi'
import { CS_PAGE_FILL_MIN_HEIGHT_CSS, GAP_BELOW_INNER_NAV_PX, STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS } from '../layout/headerLayout'

type StatusTab = 'all' | 'open' | 'in_progress' | 'closed'

const STATUS_TABS: { value: StatusTab; label: string; filter?: string }[] = [
  { value: 'open', label: 'פתוחות', filter: 'open' },
  { value: 'in_progress', label: 'בטיפול', filter: 'in_progress' },
  { value: 'closed', label: 'סגורות', filter: 'closed' },
  { value: 'all', label: 'הכל' },
]

function statusLabel(status: string) {
  switch (status) {
    case 'in_progress':
      return 'בטיפול'
    case 'closed':
      return 'סגורה'
    default:
      return 'פתוחה'
  }
}

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'in_progress':
      return 'warning'
    case 'closed':
      return 'default'
    default:
      return 'success'
  }
}

function formatDateTime(raw: string | null) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

const CHAT_POLL_MS = 3_000

export default function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') as StatusTab | null
  const tab =
    rawTab && STATUS_TABS.some((t) => t.value === rawTab) ? rawTab : 'open'
  const [rows, setRows] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [chatOpen, setChatOpen] = useState(false)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [chatStatus, setChatStatus] = useState('open')
  const [chatLoading, setChatLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)

  const statusFilter = useMemo(
    () => STATUS_TABS.find((t) => t.value === tab)?.filter,
    [tab],
  )

  const load = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await getConversations(statusFilter ? { status: statusFilter } : undefined)
      setRows(Array.isArray(res.items) ? res.items : [])
    } catch (e) {
      if (!silent) {
        setRows([])
        setError(e instanceof Error ? e.message : 'שגיאה בטעינת השיחות')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [statusFilter])

  const refreshChatMessages = useCallback(async (conversationId: number) => {
    try {
      const res = await getConversationMessages(conversationId)
      const items = Array.isArray(res.items) ? res.items : []
      setMessages(items)
      setChatStatus(String(res.status || 'open'))
      if (items.length !== lastMessageCountRef.current) {
        lastMessageCountRef.current = items.length
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        })
      }
      void load({ silent: true })
    } catch {
      // polling errors are ignored
    }
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  const openChat = async (row: Conversation) => {
    setActiveConversation(row)
    setChatOpen(true)
    setChatLoading(true)
    setDraft('')
    lastMessageCountRef.current = 0
    try {
      const res = await getConversationMessages(row.id)
      const items = Array.isArray(res.items) ? res.items : []
      setMessages(items)
      lastMessageCountRef.current = items.length
      setChatStatus(String(res.status || row.status))
      void load({ silent: true })
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בטעינת ההודעות')
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    if (!chatOpen || !activeConversation?.id) return
    const conversationId = activeConversation.id
    const poll = setInterval(() => {
      void refreshChatMessages(conversationId)
    }, CHAT_POLL_MS)
    return () => clearInterval(poll)
  }, [chatOpen, activeConversation?.id, refreshChatMessages])

  const closeChatDialog = () => {
    setChatOpen(false)
    setActiveConversation(null)
    setMessages([])
    setDraft('')
    setCloseConfirmOpen(false)
  }

  const handleSend = async () => {
    if (!activeConversation) return
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const res = await sendConversationAgentMessage(activeConversation.id, body)
      if (res.message) {
        setMessages((prev) => [...prev, res.message])
      }
      setDraft('')
      setChatStatus('in_progress')
      lastMessageCountRef.current += 1
      void load({ silent: true })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'לא ניתן לשלוח הודעה')
    } finally {
      setSending(false)
    }
  }

  const handleCloseConversation = async () => {
    if (!activeConversation || closing) return
    setClosing(true)
    try {
      const res = await closeConversation(activeConversation.id)
      setChatStatus('closed')
      setCloseConfirmOpen(false)
      if (res.conversation) {
        setActiveConversation(res.conversation)
      }
      void load({ silent: true })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'לא ניתן לסגור את השיחה')
    } finally {
      setClosing(false)
    }
  }

  const handleCloseFromTable = async (row: Conversation) => {
    if (row.status === 'closed') return
    if (!window.confirm(`לסגור שיחה ${row.id}?`)) return
    try {
      await closeConversation(row.id)
      void load({ silent: true })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'לא ניתן לסגור את השיחה')
    }
  }

  const isChatClosed = chatStatus === 'closed'

  return (
    <Box sx={{ minHeight: CS_PAGE_FILL_MIN_HEIGHT_CSS }}>
      <Box sx={{ position: 'sticky', top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS, zIndex: 2, bgcolor: '#fafafa', pb: `${GAP_BELOW_INNER_NAV_PX}px` }}>
        <Tabs
          value={tab}
          onChange={(_, value: StatusTab) => setSearchParams({ tab: value })}
          variant="scrollable"
          scrollButtons="auto"
        >
          {STATUS_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : (
            <CsTableContainer>
              <Table size="small" sx={csDataTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell>מס׳</TableCell>
                    <TableCell>ספק</TableCell>
                    <TableCell>טלפון</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>הודעה אחרונה</TableCell>
                    <TableCell>עודכן</TableCell>
                    <TableCell align="center">פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        אין שיחות
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => void openChat(row)}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.accountName || '—'}</TableCell>
                        <TableCell>{row.accountPhone || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={statusLabel(row.status)} color={statusColor(row.status)} />
                          {row.unreadFromAccount > 0 ? (
                            <Chip size="small" color="error" label={row.unreadFromAccount} sx={{ ml: 1 }} />
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.lastMessageBody || '—'}
                        </TableCell>
                        <TableCell>{formatDateTime(row.lastMessageAt || row.updatedAt)}</TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                            <Button size="small" variant="outlined" onClick={() => void openChat(row)}>
                              צפייה
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              disabled={row.status === 'closed'}
                              onClick={() => void handleCloseFromTable(row)}
                            >
                              סגירה
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CsTableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={chatOpen}
        onClose={closeChatDialog}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { minHeight: '72vh' } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2, gap: 1 }}>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }}>
            שיחה {activeConversation?.id ?? ''}
            {activeConversation?.accountName ? ` — ${activeConversation.accountName}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {!isChatClosed ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={closing}
                onClick={() => setCloseConfirmOpen(true)}
              >
                סגירת שיחה
              </Button>
            ) : null}
            <IconButton onClick={closeChatDialog} aria-label="סגור">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
        <DialogContent dividers sx={{ minHeight: 480, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          {chatLoading ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={1} sx={{ flex: 1, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  אין הודעות בשיחה
                </Typography>
              ) : (
                messages.map((m) => {
                  const isAgent = m.senderType === 'agent'
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        alignSelf: isAgent ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        bgcolor: isAgent ? '#fff' : '#FFDD00',
                        border: '1px solid #eee',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <Typography variant="body2">{m.messageBody}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(m.createdAt)}
                      </Typography>
                    </Box>
                  )
                })
              )}
              <Box ref={messagesEndRef} />
            </Stack>
          )}
          {isChatClosed ? (
            <Typography color="text.secondary" align="center" sx={{ pt: 1 }}>
              השיחה סגורה
            </Typography>
          ) : null}
        </DialogContent>
        {!isChatClosed ? (
          <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 2, pb: 2 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="כתבו הודעה ללקוח..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={sending}
              />
              <Button variant="contained" onClick={() => void handleSend()} disabled={sending || !draft.trim()}>
                שליחה
              </Button>
            </Stack>
          </DialogActions>
        ) : null}
      </Dialog>

      <Dialog
        open={closeConfirmOpen}
        onClose={() => !closing && setCloseConfirmOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 340, direction: 'rtl' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>סגירת שיחה</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 15, lineHeight: 1.8 }}>האם אתה בטוח?</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>
            הלקוח לא יוכל לשלוח הודעות נוספות באותה שיחה.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, direction: 'rtl' }}>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleCloseConversation()}
            disabled={closing}
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            {closing ? 'סוגר...' : 'סגור שיחה'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setCloseConfirmOpen(false)}
            disabled={closing}
            sx={{ borderRadius: 2 }}
          >
            ביטול
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
