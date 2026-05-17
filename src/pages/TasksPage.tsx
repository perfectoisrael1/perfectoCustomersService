import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import SearchIcon from '@mui/icons-material/Search'
import {
  TASK_PRIORITY_OPTIONS,
  TASK_PROJECT_OPTIONS,
  TASK_STATUS_OPTIONS,
  jerusalemYmd,
  taskPriorityCellColors,
  taskProjectChipColors,
  taskStatusCellColors,
} from '../lib/caliberUi'
import CsTablePaginationFooter from '../components/CsTablePaginationFooter'
import CsTableContainer from '../components/CsStandardTable'
import CsDialogTitleWithMenu from '../components/CsDialogTitleWithMenu'
import { csDataTableSx, csPagedTableOuterBoxSx, csTableInnerPagedScrollSx } from '../lib/csTableUi'
import {
  STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
  GAP_BELOW_INNER_NAV_PX,
  CS_PAGE_FILL_MIN_HEIGHT_CSS,
} from '../layout/headerLayout'
import { useAuth } from '../context/useAuth'
import {
  createTask,
  deleteTask,
  getTasks,
  putTask,
  uploadTaskFiles,
  type Task,
  type TaskInput,
} from '../api/csApi'

type TaskTab = 'myTasks' | 'all' | 'urgent' | 'done'

type TasksSortColumn =
  | 'task_name'
  | 'description'
  | 'responsible'
  | 'status'
  | 'priority'
  | 'project_name'
  | 'sprint_number'
  | 'execution_date'
  | 'created_at'

const TASK_TAB_SLUGS: Record<TaskTab, string> = {
  myTasks: 'my-tasks',
  all: 'all',
  urgent: 'urgent',
  done: 'done',
}

const SLUG_TO_TAB: Record<string, TaskTab> = {
  'my-tasks': 'myTasks',
  all: 'all',
  urgent: 'urgent',
  done: 'done',
}

const VALID_SLUGS = new Set(Object.keys(SLUG_TO_TAB))

const TASK_FILE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'
/** תצוגת תמונה מיניאטורית לפי סיומת ב־URL (כמו בשירות הקלוחות ייקירוס). */
const TASK_URL_IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i
const TASK_UPLOAD_MAX_BATCH = 10

function splitTaskFileUrls(raw: string | null | undefined): string[] {
  return String(raw ?? '')
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter(Boolean)
}

function mergeTaskFileUrls(...parts: Array<string | null | undefined>): string {
  const set = new Set<string>()
  for (const p of parts) {
    for (const u of splitTaskFileUrls(p)) set.add(u)
  }
  return Array.from(set).join('\n')
}

/** מיקום תווית וטקסט מימין לשמאל בשדות Outlined של דיאלוג המשימה */
const TASK_EDITOR_RTL_FIELD_SX = {
  direction: 'rtl' as const,
  '& .MuiInputLabel-root': {
    right: 26,
    left: 'auto',
    transformOrigin: 'top right',
  },
  '& .MuiInputLabel-shrink': {
    transform: 'translate(-0.5px, -9px) scale(0.75)',
    transformOrigin: 'top right',
  },
  '& .MuiOutlinedInput-notchedOutline legend': {
    marginInlineEnd: '2px',
  },
  '& .MuiOutlinedInput-root': {
    direction: 'rtl' as const,
  },
  '& .MuiInputBase-input': {
    textAlign: 'right',
    direction: 'rtl' as const,
  },
  '& textarea': {
    textAlign: 'right',
    direction: 'rtl' as const,
  },
  '& .MuiSelect-select': {
    textAlign: 'right',
    direction: 'rtl' as const,
  },
  '& .MuiSelect-icon': {
    left: 8,
    right: 'auto',
  },
  '& .MuiFormHelperText-root': {
    direction: 'rtl' as const,
    textAlign: 'right',
    marginRight: '2px',
  },
}

const TASK_EDITOR_SELECT_MENU_PROPS = {
  slotProps: {
    paper: {
      sx: {
        direction: 'rtl',
        '& .MuiMenuItem-root': { justifyContent: 'flex-start', direction: 'rtl' },
      },
    },
  },
} as const

function taskIsUrgent(r: Task): boolean {
  return String(r.priority || '').trim() === 'דחוף'
}

function tabCriteriaLabel(tab: TaskTab): string {
  switch (tab) {
    case 'myTasks':
      return 'משימות שבהן אתה האחראי, שאינן בוצע, ושאינן בפרויקט «שיפורים».'
    case 'done':
      return 'כל המשימות בסטטוס «בוצע».'
    case 'all':
      return 'כל המשימות במערכת שאינן בסטטוס «בוצע».'
    case 'urgent':
      return 'כל המשימות שהחשיבות שלהן מוגדרת כ«דחוף», בכל סטטוס.'
  }
}

function taskSortValue(row: Task, col: TasksSortColumn): string {
  switch (col) {
    case 'task_name':
      return String(row.task_name ?? '')
    case 'description':
      return String(row.description ?? '')
    case 'responsible':
      return String(row.responsible ?? '')
    case 'status':
      return String(row.status ?? '')
    case 'priority':
      return String(row.priority?.trim() || 'לא דחוף')
    case 'project_name':
      return String(row.project_name ?? '')
    case 'sprint_number':
      return String(row.sprint_number ?? '')
    case 'execution_date':
      return row.execution_date ? String(row.execution_date).slice(0, 10) : ''
    case 'created_at':
      return String(row.created_at ?? '')
    default:
      return ''
  }
}

export default function TasksPage() {
  const theme = useTheme()
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
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null)
  const [prioritySavingId, setPrioritySavingId] = useState<number | null>(null)
  const [pendingAttachFiles, setPendingAttachFiles] = useState<File[]>([])
  const [attachDragging, setAttachDragging] = useState(false)
  const [attachUploading, setAttachUploading] = useState(false)
  const attachInputRef = useRef<HTMLInputElement>(null)

  const [sort, setSort] = useState<{ col: TasksSortColumn; dir: 'asc' | 'desc' }>({
    col: 'created_at',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

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
          String(r.responsible || '').trim() === myName
          && r.status !== 'בוצע'
          && r.project_name !== 'שיפורים',
      ).length,
      all: rows.filter((r) => r.status !== 'בוצע').length,
      urgent: rows.filter((r) => taskIsUrgent(r)).length,
      done: rows.filter((r) => r.status === 'בוצע').length,
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
    } else if (activeTab === 'all') {
      result = result.filter((r) => r.status !== 'בוצע')
    } else if (activeTab === 'urgent') {
      result = result.filter((r) => taskIsUrgent(r))
    } else if (activeTab === 'done') {
      result = result.filter((r) => r.status === 'בוצע')
    }

    const q = query.trim().toLowerCase()
    if (!q) return result
    return result.filter((r) =>
      [r.task_name, r.description, r.project_name, r.status, r.priority, r.responsible, r.sprint_number]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
        .includes(q),
    )
  }, [rows, activeTab, query, myName])

  useEffect(() => {
    setPage(0)
  }, [activeTab, query, sort.col, sort.dir])

  const sortedRows = useMemo(() => {
    const list = [...filteredRows]
    const { col: sortColumn, dir: sortDir } = sort
    list.sort((a, b) => {
      const va = taskSortValue(a, sortColumn)
      const vb = taskSortValue(b, sortColumn)
      const cmp = va.localeCompare(vb, 'he', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredRows, sort])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return sortedRows.slice(start, start + rowsPerPage)
  }, [sortedRows, page, rowsPerPage])

  const onSortColumn = useCallback((col: TasksSortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'created_at' ? 'desc' : 'asc' },
    )
  }, [])

  const responsibleOptions = useMemo(() => {
    const names = new Set<string>()
    const push = (v: string | null | undefined) => {
      const t = String(v ?? '').trim()
      if (t) names.add(t)
    }
    for (const r of rows) push(r.responsible)
    push(user?.fullName)
    push(user?.username)
    push(form.responsible ?? undefined)
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'he'))
  }, [rows, user?.fullName, user?.username, form.responsible])

  const handleTabChange = (_: unknown, value: TaskTab) => {
    setActiveTab(value)
    const slug = TASK_TAB_SLUGS[value] || 'my-tasks'
    navigate(`/tasks/${slug}`, { replace: true })
  }

  const openNew = () => {
    setPendingAttachFiles([])
    setForm({
      task_name: '',
      description: '',
      responsible: user?.fullName || user?.username || '',
      status: 'חדשה',
      priority: 'לא דחוף',
      project_name: 'פרפקטו',
      sprint_number: '',
      execution_date: null,
      file_urls: null,
    })
    setEditor('new')
  }

  const openEdit = (row: Task) => {
    setPendingAttachFiles([])
    setForm({
      task_name: row.task_name,
      description: row.description,
      responsible: row.responsible,
      status: row.status,
      priority: row.priority?.trim() || 'לא דחוף',
      project_name: row.project_name,
      sprint_number: row.sprint_number,
      execution_date: row.execution_date ? String(row.execution_date).slice(0, 10) : null,
      file_urls: row.file_urls,
    })
    setEditor(row)
  }

  useEffect(() => {
    if (editor == null) {
      setPendingAttachFiles([])
      setAttachDragging(false)
      setAttachUploading(false)
    }
  }, [editor])

  const pendingPreviewEntries = useMemo(
    () =>
      pendingAttachFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [pendingAttachFiles],
  )

  useEffect(
    () => () => {
      pendingPreviewEntries.forEach((x) => URL.revokeObjectURL(x.url))
    },
    [pendingPreviewEntries],
  )

  const committedFileUrls = useMemo(() => splitTaskFileUrls(form.file_urls), [form.file_urls])

  const addDroppedOrSelectedFiles = useCallback(
    async (raw: FileList | readonly File[] | null | undefined) => {
      let list = [...(raw ?? [])].filter((f) => f && f.size >= 0) as File[]
      if (!list.length || editor == null) return
      if (list.length > TASK_UPLOAD_MAX_BATCH) {
        window.alert(`ניתן לצרף עד ${TASK_UPLOAD_MAX_BATCH} קבצים בכל העלאה`)
        list = list.slice(0, TASK_UPLOAD_MAX_BATCH)
      }
      if (editor === 'new') {
        setPendingAttachFiles((prev) => [...prev, ...list])
        return
      }
      setAttachUploading(true)
      setError(null)
      try {
        const { urls } = await uploadTaskFiles(editor.id, list)
        if (urls.length) {
          setForm((f) => ({
            ...f,
            file_urls: mergeTaskFileUrls(f.file_urls, urls.join('\n')) || null,
          }))
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'שגיאה בהעלאת קבצים')
      } finally {
        setAttachUploading(false)
      }
    },
    [editor],
  )

  const removePendingFileAt = useCallback((index: number) => {
    setPendingAttachFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeCommittedFileUrl = useCallback((removeUrl: string) => {
    setForm((f) => {
      const next = splitTaskFileUrls(f.file_urls).filter((u) => u !== removeUrl)
      return { ...f, file_urls: next.length ? next.join('\n') : null }
    })
  }, [])

  const onAttachPaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      const files = e.clipboardData?.files
      if (files?.length) {
        e.preventDefault()
        void addDroppedOrSelectedFiles(files)
      }
    },
    [addDroppedOrSelectedFiles],
  )

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editor === 'new') {
        const created = await createTask(form)
        const taskId = created?.id
        if (taskId != null && pendingAttachFiles.length > 0) {
          const { urls } = await uploadTaskFiles(taskId, pendingAttachFiles)
          if (urls.length) {
            const merged = mergeTaskFileUrls(form.file_urls, urls.join('\n'))
            await putTask(taskId, { file_urls: merged || null })
          }
        }
      } else if (editor) {
        await putTask(editor.id, form)
      }
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
    if (!window.confirm('האם אתה בטוח?')) return
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

  const taskStatusOptionSet = useMemo(() => new Set<string>(TASK_STATUS_OPTIONS), [])
  const taskPriorityOptionSet = useMemo(() => new Set<string>(TASK_PRIORITY_OPTIONS), [])

  const handleInlinePriorityChange = async (row: Task, newPriority: string) => {
    if (!row?.id || newPriority === (row.priority?.trim() || 'לא דחוף')) return
    setPrioritySavingId(row.id)
    setError(null)
    try {
      const payload: TaskInput = { priority: newPriority }
      await putTask(row.id, payload)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...payload } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון חשיבות')
      await load()
    } finally {
      setPrioritySavingId(null)
    }
  }

  const handleInlineStatusChange = async (row: Task, newStatus: string) => {
    const nextStatus: string | null = newStatus === '' ? null : newStatus
    if (!row?.id || nextStatus === row.status) return
    setStatusSavingId(row.id)
    setError(null)
    try {
      const payload: TaskInput = { status: nextStatus }
      if (nextStatus === 'בוצע' || nextStatus === 'בדיקות') {
        payload.execution_date = jerusalemYmd()
      }
      await putTask(row.id, payload)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...payload } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס')
      await load()
    } finally {
      setStatusSavingId(null)
    }
  }

  const colSpan = 9

  return (
    <>
      <Box sx={{ mx: -2 }}>
        <Card
          elevation={1}
          sx={{
            borderRadius: 3,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: CS_PAGE_FILL_MIN_HEIGHT_CSS,
          }}
        >
          <CardContent
            sx={{ px: 2, pb: 2, pt: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <Stack spacing={0} sx={{ flex: 1, minHeight: 0, direction: 'rtl', textAlign: 'right' }}>
              <Box
                sx={{
                  position: 'sticky',
                  top: STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS,
                  zIndex: (t) => t.zIndex.appBar - 1,
                  bgcolor: 'background.paper',
                  mx: -2,
                  px: 2,
                  py: 0,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    direction: 'rtl',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '1 1 auto', minWidth: 0 }}>
                    <Tabs
                      value={activeTab}
                      onChange={handleTabChange}
                      variant="scrollable"
                      allowScrollButtonsMobile
                      sx={{
                        flex: '1 1 auto',
                        minWidth: { xs: 'min(100%, 240px)', sm: 120 },
                        borderBottom: 'none',
                        minHeight: 48,
                        '& .MuiTabs-indicator': { height: 3 },
                      }}
                    >
                      <Tab value="myTasks" label={`המשימות שלי (${tabCounts.myTasks})`} />
                      <Tab value="all" label={`כל המשימות (${tabCounts.all})`} />
                      <Tab value="urgent" label={`דחוף (${tabCounts.urgent})`} />
                      <Tab value="done" label={`בוצע (${tabCounts.done})`} />
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

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexShrink: 0,
                      flexWrap: 'nowrap',
                    }}
                  >
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ whiteSpace: 'nowrap' }}>
                      משימה חדשה
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => void load()}
                      sx={{
                        backgroundColor: '#1565c0',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      רענון
                    </Button>
                    <TextField
                      size="small"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="חיפוש"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                          endAdornment: query ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setQuery('')}
                                sx={{ p: 0.2 }}
                                aria-label="ניקוי חיפוש"
                              >
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        },
                      }}
                      sx={{
                        width: { xs: 160, sm: 190 },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 999,
                          backgroundColor: 'background.paper',
                          fontSize: 14,
                          '& fieldset': { borderColor: 'rgba(0,0,0,0.18)' },
                          '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.35)' },
                          '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                        },
                        '& .MuiInputBase-input': {
                          textAlign: 'right',
                          py: '7px',
                          direction: 'rtl',
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {error ? (
                <Stack sx={{ gap: `${GAP_BELOW_INNER_NAV_PX}px`, mt: `${GAP_BELOW_INNER_NAV_PX}px` }}>
                  <Alert severity="error">{error}</Alert>
                </Stack>
              ) : null}

              {loading ? (
                <Box
                  sx={{
                    mt: `${GAP_BELOW_INNER_NAV_PX}px`,
                    py: 8,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <CircularProgress color="primary" />
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    mt: `${GAP_BELOW_INNER_NAV_PX}px`,
                  }}
                >
                  <Box sx={csPagedTableOuterBoxSx(theme)}>
                    <CsTableContainer sx={csTableInnerPagedScrollSx}>
                    <Table stickyHeader size="small" dir="rtl" sx={csDataTableSx(theme)}>
                      <TableHead>
                        <TableRow>
                          <TableCell sortDirection={sort.col === 'task_name' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'task_name'}
                              direction={sort.col === 'task_name' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('task_name')}
                            >
                              משימה
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'description' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'description'}
                              direction={sort.col === 'description' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('description')}
                            >
                              תיאור
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'responsible' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'responsible'}
                              direction={sort.col === 'responsible' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('responsible')}
                            >
                              אחראי
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'status' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'status'}
                              direction={sort.col === 'status' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('status')}
                            >
                              סטטוס
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'priority' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'priority'}
                              direction={sort.col === 'priority' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('priority')}
                            >
                              חשיבות
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'project_name' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'project_name'}
                              direction={sort.col === 'project_name' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('project_name')}
                            >
                              פרויקט
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'sprint_number' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'sprint_number'}
                              direction={sort.col === 'sprint_number' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('sprint_number')}
                            >
                              ספרינט
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center" sortDirection={sort.col === 'execution_date' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'execution_date'}
                              direction={sort.col === 'execution_date' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('execution_date')}
                            >
                              תאריך ביצוע
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={sort.col === 'created_at' ? sort.dir : false}>
                            <TableSortLabel
                              active={sort.col === 'created_at'}
                              direction={sort.col === 'created_at' ? sort.dir : 'asc'}
                              onClick={() => onSortColumn('created_at')}
                            >
                              נוצר
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row) => {
                          const pc = taskProjectChipColors(row.project_name)
                          const statusCellColors = taskStatusCellColors(row.status)
                          const priorityDisplay =
                            row.priority?.trim() || 'לא דחוף'
                          const priorityCellColors = taskPriorityCellColors(priorityDisplay)
                          return (
                            <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEdit(row)}>
                              <TableCell title={row.task_name}>{row.task_name}</TableCell>
                              <TableCell
                                sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={row.description || ''}
                              >
                                {row.description || '—'}
                              </TableCell>
                              <TableCell>{row.responsible || '—'}</TableCell>
                              <TableCell
                                align="center"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                sx={{
                                  backgroundColor: `${statusCellColors.bg} !important`,
                                  color: `${statusCellColors.fg} !important`,
                                  textAlign: 'center !important',
                                  py: 0.5,
                                  px: 0.5,
                                  verticalAlign: 'middle',
                                  overflow: 'hidden',
                                  '& > *': { backgroundColor: 'transparent !important' },
                                }}
                              >
                                <Select
                                  size="small"
                                  value={row.status != null && row.status !== '' ? row.status : ''}
                                  disabled={statusSavingId === row.id}
                                  onChange={(e) => void handleInlineStatusChange(row, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  variant="standard"
                                  disableUnderline
                                  displayEmpty
                                  renderValue={(selected) => {
                                    if (statusSavingId === row.id) {
                                      return <CircularProgress size={18} sx={{ color: 'inherit' }} />
                                    }
                                    return selected || '—'
                                  }}
                                  sx={{
                                    color: 'inherit',
                                    fontWeight: 'normal',
                                    fontSize: 15,
                                    width: '100%',
                                    '& .MuiSelect-select': { py: 0, textAlign: 'center', pr: '0 !important', pl: '0 !important' },
                                    '& .MuiSelect-icon': { display: 'none' },
                                  }}
                                  MenuProps={{
                                    slotProps: {
                                      paper: {
                                        sx: {
                                          borderRadius: 2.5,
                                          p: 1,
                                          overflow: 'hidden',
                                          '& .MuiList-root': {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, minmax(110px, 1fr))',
                                            gap: 1,
                                            p: 0.5,
                                          },
                                        },
                                      },
                                    },
                                  }}
                                >
                                  <MenuItem
                                    value=""
                                    sx={{
                                      gridColumn: '1 / -1',
                                      direction: 'rtl',
                                      justifyContent: 'center',
                                      borderRadius: 1,
                                    }}
                                  >
                                    <em>לא הוגדר</em>
                                  </MenuItem>
                                  {row.status && !taskStatusOptionSet.has(String(row.status).trim()) ? (
                                    <MenuItem
                                      key={row.status}
                                      value={row.status}
                                      sx={{
                                        backgroundColor: taskStatusCellColors(row.status).bg,
                                        color: taskStatusCellColors(row.status).fg,
                                        fontWeight: 'normal',
                                        borderRadius: 1.5,
                                        minHeight: 44,
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        px: 1,
                                        '&:hover': { backgroundColor: taskStatusCellColors(row.status).bg, opacity: 0.9 },
                                        '&.Mui-selected': { backgroundColor: taskStatusCellColors(row.status).bg },
                                        '&.Mui-selected:hover': { backgroundColor: taskStatusCellColors(row.status).bg, opacity: 0.9 },
                                      }}
                                    >
                                      {row.status}
                                    </MenuItem>
                                  ) : null}
                                  {TASK_STATUS_OPTIONS.map((opt) => {
                                    const sc = taskStatusCellColors(opt)
                                    return (
                                      <MenuItem
                                        key={opt}
                                        value={opt}
                                        sx={{
                                          backgroundColor: sc.bg,
                                          color: sc.fg,
                                          fontWeight: 'normal',
                                          borderRadius: 1.5,
                                          minHeight: 44,
                                          justifyContent: 'center',
                                          textAlign: 'center',
                                          whiteSpace: 'nowrap',
                                          px: 1,
                                          '&:hover': { backgroundColor: sc.bg, opacity: 0.9 },
                                          '&.Mui-selected': { backgroundColor: sc.bg },
                                          '&.Mui-selected:hover': { backgroundColor: sc.bg, opacity: 0.9 },
                                        }}
                                      >
                                        {opt}
                                      </MenuItem>
                                    )
                                  })}
                                </Select>
                              </TableCell>
                              <TableCell
                                align="center"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                sx={{
                                  backgroundColor: `${priorityCellColors.bg} !important`,
                                  color: `${priorityCellColors.fg} !important`,
                                  textAlign: 'center !important',
                                  py: 0.5,
                                  px: 0.5,
                                  verticalAlign: 'middle',
                                  overflow: 'hidden',
                                  '& > *': { backgroundColor: 'transparent !important' },
                                }}
                              >
                                <Select
                                  size="small"
                                  value={priorityDisplay}
                                  disabled={prioritySavingId === row.id}
                                  onChange={(e) => void handleInlinePriorityChange(row, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  variant="standard"
                                  disableUnderline
                                  renderValue={(selected) => {
                                    if (prioritySavingId === row.id) {
                                      return <CircularProgress size={18} sx={{ color: 'inherit' }} />
                                    }
                                    return selected
                                  }}
                                  sx={{
                                    color: 'inherit',
                                    fontWeight: 'normal',
                                    fontSize: 15,
                                    width: '100%',
                                    '& .MuiSelect-select': { py: 0, textAlign: 'center', pr: '0 !important', pl: '0 !important' },
                                    '& .MuiSelect-icon': { display: 'none' },
                                  }}
                                  MenuProps={{
                                    slotProps: {
                                      paper: {
                                        sx: {
                                          borderRadius: 2.5,
                                          p: 1,
                                          overflow: 'hidden',
                                          '& .MuiList-root': {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, minmax(110px, 1fr))',
                                            gap: 1,
                                            p: 0.5,
                                          },
                                        },
                                      },
                                    },
                                  }}
                                >
                                  {row.priority?.trim()
                                  && !taskPriorityOptionSet.has(row.priority.trim()) ? (
                                    <MenuItem
                                      key={row.priority.trim()}
                                      value={row.priority.trim()}
                                      sx={{
                                        backgroundColor: taskPriorityCellColors(row.priority).bg,
                                        color: taskPriorityCellColors(row.priority).fg,
                                        fontWeight: 'normal',
                                        borderRadius: 1.5,
                                        minHeight: 44,
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        px: 1,
                                        gridColumn: '1 / -1',
                                        '&:hover': {
                                          backgroundColor: taskPriorityCellColors(row.priority).bg,
                                          opacity: 0.9,
                                        },
                                        '&.Mui-selected': { backgroundColor: taskPriorityCellColors(row.priority).bg },
                                        '&.Mui-selected:hover': {
                                          backgroundColor: taskPriorityCellColors(row.priority).bg,
                                          opacity: 0.9,
                                        },
                                      }}
                                    >
                                      {row.priority.trim()}
                                    </MenuItem>
                                  ) : null}
                                  {TASK_PRIORITY_OPTIONS.map((opt) => {
                                    const pcPri = taskPriorityCellColors(opt)
                                    return (
                                      <MenuItem
                                        key={opt}
                                        value={opt}
                                        sx={{
                                          backgroundColor: pcPri.bg,
                                          color: pcPri.fg,
                                          fontWeight: 'normal',
                                          borderRadius: 1.5,
                                          minHeight: 44,
                                          justifyContent: 'center',
                                          textAlign: 'center',
                                          whiteSpace: 'nowrap',
                                          px: 1,
                                          '&:hover': { backgroundColor: pcPri.bg, opacity: 0.9 },
                                          '&.Mui-selected': { backgroundColor: pcPri.bg },
                                          '&.Mui-selected:hover': { backgroundColor: pcPri.bg, opacity: 0.9 },
                                        }}
                                      >
                                        {opt}
                                      </MenuItem>
                                    )
                                  })}
                                </Select>
                              </TableCell>
                              <TableCell sx={{ overflow: 'visible', textOverflow: 'clip' }}>
                                <Chip
                                  size="small"
                                  label={row.project_name || '—'}
                                  sx={{ bgcolor: pc.bg, color: pc.fg, fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell>{row.sprint_number || '—'}</TableCell>
                              <TableCell align="center">
                                {row.execution_date ? String(row.execution_date).slice(0, 10) : '—'}
                              </TableCell>
                              <TableCell sx={{ direction: 'ltr', textAlign: 'right', color: 'text.secondary' }}>
                                {row.created_at}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {sortedRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                              אין נתונים להצגה
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                    </CsTableContainer>
                  <CsTablePaginationFooter
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    count={sortedRows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_e, next) => setPage(next)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(Number.parseInt(e.target.value, 10))
                      setPage(0)
                    }}
                    labelRowsPerPage="שורות בעמוד:"
                    labelDisplayedRows={({ from, to, count }) =>
                      count === 0 ? '0 מתוך 0' : `${from}–${to} מתוך ${count}`
                    }
                  />
                  </Box>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} maxWidth="md" fullWidth>
        <CsDialogTitleWithMenu
          heading={editor === 'new' ? 'משימה חדשה' : `עריכת משימה #${(editor as Task)?.id}`}
          onClose={() => !saving && setEditor(null)}
          closeDisabled={saving}
          onRequestDelete={editor && editor !== 'new' ? () => void remove() : undefined}
          menuDisabled={saving}
        />
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pt: 2,
            direction: 'rtl',
            textAlign: 'right',
          }}
        >
          <TextField
            label="שם משימה"
            value={form.task_name || ''}
            onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
            fullWidth
            sx={TASK_EDITOR_RTL_FIELD_SX}
          />
          <TextField
            label="תיאור"
            value={form.description || ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
            fullWidth
            multiline
            minRows={2}
            sx={TASK_EDITOR_RTL_FIELD_SX}
          />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            sx={{ width: '100%', direction: 'rtl' }}
          >
            <TextField
              select
              label="אחראי"
              value={form.responsible || ''}
              onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value || null }))}
              sx={{ flex: 1, ...TASK_EDITOR_RTL_FIELD_SX }}
              fullWidth
              MenuProps={TASK_EDITOR_SELECT_MENU_PROPS}
            >
              <MenuItem value="">
                <em>ללא אחראי</em>
              </MenuItem>
              {responsibleOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="סטטוס"
              value={form.status || 'חדשה'}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              sx={{ flex: 1, ...TASK_EDITOR_RTL_FIELD_SX }}
              fullWidth
              MenuProps={TASK_EDITOR_SELECT_MENU_PROPS}
            >
              {TASK_STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="חשיבות"
              value={form.priority || 'לא דחוף'}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              sx={{ flex: 1, ...TASK_EDITOR_RTL_FIELD_SX }}
              fullWidth
              MenuProps={TASK_EDITOR_SELECT_MENU_PROPS}
            >
              {TASK_PRIORITY_OPTIONS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            select
            label="פרויקט"
            value={form.project_name || 'פרפקטו'}
            onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
            fullWidth
            sx={TASK_EDITOR_RTL_FIELD_SX}
            MenuProps={TASK_EDITOR_SELECT_MENU_PROPS}
          >
            {(() => {
              const pv = form.project_name || 'פרפקטו'
              const base: string[] = [...TASK_PROJECT_OPTIONS]
              if (pv && !base.includes(pv)) base.unshift(pv)
              return base.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))
            })()}
          </TextField>
          <TextField
            label="ספרינט"
            value={form.sprint_number || ''}
            onChange={(e) => setForm((f) => ({ ...f, sprint_number: e.target.value || null }))}
            fullWidth
            sx={TASK_EDITOR_RTL_FIELD_SX}
          />
          <TextField
            label="תאריך ביצוע"
            type="date"
            value={form.execution_date || ''}
            onChange={(e) => setForm((f) => ({ ...f, execution_date: e.target.value || null }))}
            fullWidth
            sx={TASK_EDITOR_RTL_FIELD_SX}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { dir: 'rtl', style: { textAlign: 'right' } },
            }}
          />
          <Box sx={{ width: '100%', direction: 'rtl' }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 0.75, fontWeight: 700, display: 'block', textAlign: 'right', color: 'text.primary' }}
            >
              קישורים לקבצים
            </Typography>

            <input
              ref={attachInputRef}
              type="file"
              multiple
              accept={TASK_FILE_ACCEPT}
              style={{ display: 'none' }}
              disabled={saving || attachUploading}
              onChange={(e) => {
                void addDroppedOrSelectedFiles(e.target.files)
                const el = e.target
                el.value = ''
              }}
            />

            {(committedFileUrls.length > 0 || pendingPreviewEntries.length > 0) ? (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 1.25,
                  direction: 'rtl',
                  justifyContent: 'flex-start',
                }}
              >
                {committedFileUrls.map((url) => (
                  <Box
                    key={url}
                    sx={{
                      position: 'relative',
                      width: 56,
                      height: 56,
                      borderRadius: 1.25,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      flexShrink: 0,
                      '&:hover .cs-task-file-remove': { opacity: 1 },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 0,
                      }}
                    >
                      <InsertDriveFileIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                    </Box>
                    {TASK_URL_IMAGE_EXT.test(url) ? (
                      <Box
                        component="img"
                        src={url}
                        alt=""
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(ev) => {
                          const t = ev.target as HTMLImageElement
                          t.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <IconButton
                      className="cs-task-file-remove"
                      size="small"
                      onClick={(ev) => {
                        ev.preventDefault()
                        ev.stopPropagation()
                        removeCommittedFileUrl(url)
                      }}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        zIndex: 3,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        width: 22,
                        height: 22,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                      }}
                      aria-label="הסר קובץ"
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <Box
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2,
                        cursor: 'pointer',
                      }}
                      title="פתח"
                    />
                  </Box>
                ))}
                {pendingPreviewEntries.map(({ file, url }, idx) => {
                  const isImg = typeof file.type === 'string' && file.type.startsWith('image/')
                  return (
                    <Box
                      key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                      sx={{
                        position: 'relative',
                        width: 56,
                        height: 56,
                        borderRadius: 1.25,
                        overflow: 'hidden',
                        border: '1px dashed',
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                        flexShrink: 0,
                        '&:hover .cs-task-file-remove': { opacity: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 0,
                        }}
                      >
                        <InsertDriveFileIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                      </Box>
                      {isImg ? (
                        <Box
                          component="img"
                          src={url}
                          alt=""
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : null}
                      <IconButton
                        className="cs-task-file-remove"
                        size="small"
                        onClick={(ev) => {
                          ev.preventDefault()
                          ev.stopPropagation()
                          removePendingFileAt(idx)
                        }}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          left: 2,
                          zIndex: 3,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: '#fff',
                          width: 22,
                          height: 22,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        }}
                        aria-label="הסר מהרשימה — יועלה רק אחרי שמירה"
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  )
                })}
              </Box>
            ) : null}

            <Box
              tabIndex={0}
              onPaste={onAttachPaste}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!saving && !attachUploading) setAttachDragging(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!saving && !attachUploading) setAttachDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setAttachDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setAttachDragging(false)
                if (!saving && !attachUploading)
                  void addDroppedOrSelectedFiles(e.dataTransfer?.files ?? null)
              }}
              sx={{
                textAlign: 'right',
                position: 'relative',
                border: '2px dashed',
                borderColor: attachDragging ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 2,
                bgcolor: attachDragging ? 'action.hover' : 'background.default',
                opacity: saving || attachUploading ? 0.7 : 1,
                outline: 'none',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              {attachUploading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                  }}
                >
                  <CircularProgress size={22} />
                  <Typography variant="body2" sx={{ direction: 'rtl' }}>
                    מעלה…
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 800, mb: 0.75, fontSize: 15, direction: 'rtl', textAlign: 'right' }}>
                    גרור לכאן קבצים
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, fontSize: 13, direction: 'rtl', textAlign: 'right' }}>
                    או לחץ לבחירה מהמחשב · ניתן להדביק תמונה מהלוח (לחץ כאן ואז Ctrl+V)
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={saving}
                      startIcon={<AttachFileIcon />}
                      sx={{
                        borderRadius: 2,
                        flexDirection: 'row-reverse',
                        '& .MuiButton-startIcon': { ml: -0.5, mr: 0.5 },
                      }}
                      onClick={() => attachInputRef.current?.click()}
                    >
                      בחירת קבצים
                    </Button>
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary', direction: 'rtl', textAlign: 'right' }}>
                    תמונות, PDF ומסמכי אופיס · עד {TASK_UPLOAD_MAX_BATCH} קבצים בכל העלאה
                  </Typography>
                </>
              )}
            </Box>

            <TextField
              label="קישורים ידניים (שורה חדשה או פסיק בין כתובות)"
              value={form.file_urls || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, file_urls: e.target.value ? e.target.value : null }))
              }
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1.5, ...TASK_EDITOR_RTL_FIELD_SX }}
              helperText="אופציונלי — אם כבר יש קישור למסמך, אפשר להדביק כאן"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditor(null)} disabled={saving}>ביטול</Button>
            <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  )
}
