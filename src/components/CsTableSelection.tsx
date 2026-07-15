import { useCallback, useState, type ChangeEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  TableCell,
  Typography,
  type TableCellProps,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

/**
 * בחירת שורות לטבלאות שירות לקוחות (סטנדרט יקירוס):
 * עמודת צ'קבוקסים (RTL — עמודה ראשונה ב-DOM, ימין ויזואלי) + סרגל תחתון קבוע.
 *
 * @example
 * const sel = useCsTableSelection()
 * <CsTableSelectAllHeaderCell pageRows={pageRows} selectedIds={sel.selectedIds} onTogglePage={() => sel.toggleAllOnPage(pageRows)} />
 * <CsTableRowCheckboxCell rowId={row.id} selected={sel.isSelected(row.id)} onToggle={sel.toggleRow} />
 * <CsTableSelectionBar open={sel.selectedCount > 0} selectedCount={sel.selectedCount} onClear={sel.clearSelection} />
 */
export function useCsTableSelection(options: { getRowId?: (row: unknown) => unknown } = {}) {
  const getRowId = options.getRowId ?? ((row: unknown) => (row as { id?: unknown })?.id)
  const [selectedIds, setSelectedIds] = useState(() => new Set<unknown>())

  const toggleRow = useCallback((id: unknown, e?: MouseEvent | ChangeEvent<HTMLInputElement>) => {
    e?.stopPropagation?.()
    if (id == null) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAllOnPage = useCallback(
    <T,>(pageRows: T[]) => {
      if (!Array.isArray(pageRows) || pageRows.length === 0) return
      setSelectedIds((prev) => {
        const next = new Set(prev)
        const pageIds = pageRows.map(getRowId).filter((id) => id != null)
        if (!pageIds.length) return prev
        const allChecked = pageIds.every((id) => next.has(id))
        if (allChecked) pageIds.forEach((id) => next.delete(id))
        else pageIds.forEach((id) => next.add(id))
        return next
      })
    },
    [getRowId],
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: unknown) => id != null && selectedIds.has(id), [selectedIds])

  return {
    selectedIds,
    setSelectedIds,
    toggleRow,
    toggleAllOnPage,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.size,
    getRowId,
  }
}

export const csTableCheckboxHeaderSx = {
  p: 0.25,
  color: 'text.disabled',
  '&.Mui-checked': { color: 'primary.main' },
  '&.MuiCheckbox-indeterminate': { color: 'primary.main' },
} as const

export const csTableCheckboxRowSx = {
  p: 0.25,
  color: 'text.disabled',
  '&.Mui-checked': { color: 'primary.main' },
} as const

export const csTableCheckboxCellSx = {
  width: 36,
  minWidth: 36,
  p: 0.5,
} as const

type SelectAllHeaderProps = {
  pageRows?: unknown[]
  getRowId?: (row: unknown) => unknown
  selectedIds: Set<unknown>
  onTogglePage?: () => void
} & TableCellProps

export function CsTableSelectAllHeaderCell({
  pageRows = [],
  getRowId = (r: unknown) => (r as { id?: unknown })?.id,
  selectedIds,
  onTogglePage,
  sx: sxProp,
  onClick: onClickProp,
  ...tableCellRest
}: SelectAllHeaderProps) {
  const pageIds = pageRows.map(getRowId).filter((id) => id != null)
  const hasRows = pageIds.length > 0
  const checked = hasRows && pageIds.every((id) => selectedIds.has(id))
  const indeterminate = hasRows && pageIds.some((id) => selectedIds.has(id)) && !checked

  return (
    <TableCell
      sx={{ ...csTableCheckboxCellSx, ...sxProp }}
      onClick={(e) => {
        onClickProp?.(e)
        e.stopPropagation()
      }}
      {...tableCellRest}
    >
      {hasRows ? (
        <Checkbox
          size="small"
          checked={checked}
          indeterminate={indeterminate}
          onChange={() => onTogglePage?.()}
          sx={csTableCheckboxHeaderSx}
        />
      ) : null}
    </TableCell>
  )
}

type RowCheckboxProps = {
  rowId: unknown
  selected: boolean
  onToggle: (id: unknown, e?: MouseEvent | ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
} & TableCellProps

export function CsTableRowCheckboxCell({
  rowId,
  selected,
  onToggle,
  disabled = false,
  sx: sxProp,
  onClick: onClickProp,
  ...tableCellRest
}: RowCheckboxProps) {
  return (
    <TableCell
      sx={{ ...csTableCheckboxCellSx, verticalAlign: 'middle', ...sxProp }}
      onClick={(e) => {
        onClickProp?.(e)
        e.stopPropagation()
      }}
      {...tableCellRest}
    >
      {rowId != null ? (
        <Checkbox
          size="small"
          checked={Boolean(selected)}
          disabled={disabled}
          onChange={(e) => onToggle(rowId, e)}
          sx={csTableCheckboxRowSx}
        />
      ) : null}
    </TableCell>
  )
}

type SelectionBarProps = {
  open: boolean
  selectedCount: number
  onClear: () => void
  children?: ReactNode
  containerSx?: Record<string, unknown>
}

export function CsTableSelectionBar({
  open,
  selectedCount,
  onClear,
  children,
  containerSx = {},
}: SelectionBarProps) {
  const bar = (
    <Fade in={open}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1.5,
          px: 3,
          py: 1.5,
          borderRadius: 999,
          maxWidth: 'min(96vw, 920px)',
          backgroundColor: 'background.paper',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          border: '1px solid',
          borderColor: 'divider',
          direction: 'rtl',
          ...containerSx,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}>
          {selectedCount} נבחרו
        </Typography>
        {children}
        <IconButton
          size="small"
          onClick={onClear}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Fade>
  )
  if (typeof document === 'undefined') return bar
  return createPortal(bar, document.body)
}

type SelectionDeleteButtonProps = {
  selectedCount: number
  /** שם הישות ברבים, למשל «פניות» או «לידים» */
  entityLabel: string
  /** כותרת דיאלוג — ברירת מחדל: `מחיקת {entityLabel}` */
  dialogTitle?: string
  onDelete: () => Promise<void>
  disabled?: boolean
}

/** כפתור «מחיקה» לסרגל בחירה + דיאלוג אישור (סטנדרט יקירוס). */
export function CsTableSelectionDeleteButton({
  selectedCount,
  entityLabel,
  dialogTitle,
  onDelete,
  disabled = false,
}: SelectionDeleteButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = useCallback(async () => {
    setDeleting(true)
    try {
      await onDelete()
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }, [onDelete])

  return (
    <>
      <Button
        variant="contained"
        color="error"
        size="small"
        disabled={disabled || selectedCount === 0}
        onClick={() => setConfirmOpen(true)}
        sx={{ borderRadius: 999, fontWeight: 700, px: 2.5, fontSize: 13 }}
      >
        מחיקה
      </Button>

      <Dialog
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 340, direction: 'rtl' } } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 17,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {dialogTitle ?? `מחיקת ${entityLabel}`}
          <IconButton
            size="small"
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
            sx={{ color: 'text.secondary' }}
            aria-label="סגירה"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 15, lineHeight: 1.8 }}>
            האם אתה בטוח שברצונך למחוק {selectedCount} {entityLabel}?
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>
            פעולה זו אינה ניתנת לביטול.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, direction: 'rtl' }}>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirm()}
            disabled={deleting}
            endIcon={
              deleting ? (
                <Box sx={{ display: 'inline-flex', width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={18} color="inherit" />
                </Box>
              ) : null
            }
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            {deleting ? 'מוחק...' : 'מחק'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
            sx={{ borderRadius: 2 }}
          >
            ביטול
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
