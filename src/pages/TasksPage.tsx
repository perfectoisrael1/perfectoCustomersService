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
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Popover,
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
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { TASK_PROJECT_OPTIONS, TASK_STATUS_OPTIONS, taskProjectChipColors } from '../lib/caliberUi'
import { useAuth } from '../context/useAuth'
import {
  createTask,
  deleteTask,
  getTasks,
  putTask,
  type Task,
  type TaskInput,
} from '../api/csApi'

type TaskTab = 'myTasks' | 'all'

const TASK_TAB_SLUGS: Record<TaskTab, string> = {
  myTasks: 'my-tasks',
  all: 'all',
}

const SLUG_TO_TAB: Record<string, TaskTab> = {
  'my-tasks': 'myTasks',
  all: 'all',
}

const VALID_SLUGS = new Set(Object.keys(SLUG_TO_TAB))

function tabCriteriaLabel(tab: TaskTab): string {
  switch (tab) {
    case 'myTasks':
      return 'משימות שבהן אתה האחראי, שאינן בוצע, ושאינן בפרויקט «שיפורים».'
    default:
      return 'כל המשימות במערכת.'
  }
}

export default function TasksPage() {
  const { user } = useAuth()
  const { tabSlug } = useParams<{ tabSlug: string }>()
  const navigate = useNavigate()

  const [rows, setRows] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TaskTab>('myTasks')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Task | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TaskInput>({})
  const [criteriaAnchor, setCriteriaAnchor] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (tabSlug === 'icarus') {
      navigate('/tasks/all', { replace: true })
      return
    }
    if (!tabSlug || !VALID_SLUGS.has(tabSlug)) {
      navigate('/tasks/my-tasks', { replace: true })
      return
    }
    setActiveTab(SLUG_TO_TAB[tabSlug])
  }, [tabSlug, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getTasks())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const myName = String(user?.fullName || user?.username || '').trim()

  const tabCounts = useMemo(() => {
    return {
      myTasks: rows.filter(
        (r) =>
          String(r.responsible || '').trim() === myName &&
          r.status !== 'בוצע' &&
          r.project_name !== 'שיפורים',
      ).length,
      all: rows.length,
    }
  }, [rows, myName])

  const filteredRows = useMemo(() => {
    let result = rows
    if (activeTab === 'myTasks') {
      result = result.filter((r) => {
        const isMe = String(r.responsible || '').trim() === myName
        const notCompleted = r.status !== 'בוצע'
        const notImprovements = r.project_name !== 'שיפורים'
        return isMe && notCompleted && notImprovements
      })
    }

    const q = query.trim().toLowerCase()
    if (!q) return result
    return result.filter((r) =>
      [r.task_name, r.description, r.project_name, r.status, r.responsible, r.sprint_number]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
        .includes(q),
    )
  }, [rows, activeTab, query, myName])

  const handleTabChange = (_: unknown, value: TaskTab) => {
    setActiveTab(value)
    const slug = TASK_TAB_SLUGS[value] || 'my-tasks'
    navigate(`/tasks/${slug}`, { replace: true })
  }

  const openNew = () => {
    setForm({
      task_name: '',
      description: '',
      responsible: user?.fullName || user?.username || '',
      status: 'חדשה',
      project_name: 'פרפקטו',
      sprint_number: '',
      execution_date: null,
    })
    setEditor('new')
  }

  const openEdit = (row: Task) => {
    setForm({
      task_name: row.task_name,
      description: row.description,
      responsible: row.responsible,
      status: row.status,
      project_name: row.project_name,
      sprint_number: row.sprint_number,
      execution_date: row.execution_date ? String(row.execution_date).slice(0, 10) : null,
      file_urls: row.file_urls,
    })
    setEditor(row)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editor === 'new') await createTask(form)
      else if (editor) await putTask(editor.id, form)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (editor == null || editor === 'new') return
    if (!window.confirm('למחוק משימה?')) return
    setSaving(true)
    try {
      await deleteTask(editor.id)
      setEditor(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    } finally {
      setSaving(false)
    }
  }

  const tabLabel = (t: TaskTab, count: number) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
        {activeTab === t ? filteredRows.length : count}
      </Box>
      <span>
        {t === 'myTasks' && 'המשימות שלי'}
        {t === 'all' && 'כל המשימות'}
      </span>
    </Box>
  )

  return (
    <>
      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>משימות</Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
                משימה חדשה
              </Button>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{ borderBottom: 1, borderColor: 'divider', flex: 1, minWidth: 0 }}
              >
                <Tab value="myTasks" label={tabLabel('myTasks', tabCounts.myTasks)} />
                <Tab value="all" label={tabLabel('all', tabCounts.all)} />
              </Tabs>
              <Tooltip title="על פי מה הנתונים מוצגים">
                <IconButton size="small" onClick={(e) => setCriteriaAnchor(e.currentTarget)} aria-label="מידע על סינון טאב">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Popover
                open={Boolean(criteriaAnchor)}
                anchorEl={criteriaAnchor}
                onClose={() => setCriteriaAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                slotProps={{ paper: { sx: { p: 2, maxWidth: 360 } } }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  על פי מה הנתונים מוצגים בטאב הנוכחי
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tabCriteriaLabel(activeTab)}
                </Typography>
              </Popover>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
              <TextField size="small" placeholder="חיפוש…" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1 }} />
              <Button variant="outlined" onClick={() => void load()}>רענון</Button>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>טוען…</Box>
            ) : (
              <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>משימה</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>תיאור</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>אחראי</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>סטטוס</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>פרויקט</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>ספרינט</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>תאריך ביצוע</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>נוצר</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const pc = taskProjectChipColors(row.project_name)
                      return (
                        <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEdit(row)}>
                          <TableCell>{row.task_name}</TableCell>
                          <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description || '—'}</TableCell>
                          <TableCell>{row.responsible || '—'}</TableCell>
                          <TableCell>{row.status || '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={row.project_name || '—'}
                              sx={{ bgcolor: pc.bg, color: pc.fg, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>{row.sprint_number || '—'}</TableCell>
                          <TableCell>{row.execution_date ? String(row.execution_date).slice(0, 10) : '—'}</TableCell>
                          <TableCell>{row.created_at}</TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredRows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}>אין נתונים</TableCell></TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editor === 'new' ? 'משימה חדשה' : `עריכת משימה #${(editor as Task)?.id}`}
          <IconButton onClick={() => !saving && setEditor(null)} aria-label="סגור"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="שם משימה" value={form.task_name || ''} onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))} fullWidth />
          <TextField label="תיאור" value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} fullWidth multiline minRows={2} />
          <TextField label="אחראי" value={form.responsible || ''} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value || null }))} fullWidth />
          <TextField select label="סטטוס" value={form.status || 'חדשה'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} fullWidth>
            {TASK_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          <TextField select label="פרויקט" value={form.project_name || 'פרפקטו'} onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))} fullWidth>
            {(() => {
              const pv = form.project_name || 'פרפקטו'
              const base: string[] = [...TASK_PROJECT_OPTIONS]
              if (pv && !base.includes(pv)) base.unshift(pv)
              return base.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))
            })()}
          </TextField>
          <TextField label="ספרינט" value={form.sprint_number || ''} onChange={(e) => setForm((f) => ({ ...f, sprint_number: e.target.value || null }))} fullWidth />
          <TextField
            label="תאריך ביצוע"
            type="date"
            value={form.execution_date || ''}
            onChange={(e) => setForm((f) => ({ ...f, execution_date: e.target.value || null }))}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField label="קישורים לקבצים" value={form.file_urls || ''} onChange={(e) => setForm((f) => ({ ...f, file_urls: e.target.value || null }))} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Box>
            {editor && editor !== 'new' ? (
              <Button color="error" startIcon={<DeleteIcon />} onClick={() => void remove()} disabled={saving}>מחיקה</Button>
            ) : null}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditor(null)} disabled={saving}>ביטול</Button>
            <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  )
}
