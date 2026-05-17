import type { ReactNode } from 'react'
import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Box, DialogTitle, IconButton, Menu, MenuItem, type SxProps, type Theme } from '@mui/material'
import type { DialogTitleProps } from '@mui/material/DialogTitle'
import CloseIcon from '@mui/icons-material/Close'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'

export type CsDialogTitleWithMenuProps = {
  /** תוכן הכותרת (מוצג במרכז) */
  heading: ReactNode
  onClose: () => void
  closeDisabled?: boolean
  /** מציג ⋮ בפינה השמאלית (במסך); בתוך התפריט — מחיקה */
  onRequestDelete?: () => void
  menuDisabled?: boolean
  /** מאוחד עם שאר הדיאלוגים — ברירת מחדל רק תוכן flex */
  dialogTitleSx?: SxProps<Theme>
} & Omit<DialogTitleProps, 'children'>

/**
 * שורת כותרת לדיאלוג: ⋮ משמאל (מנו \u200e ltr), כותרת במרכז, ✕ מימין.
 */
export default function CsDialogTitleWithMenu({
  heading,
  onClose,
  closeDisabled,
  onRequestDelete,
  menuDisabled,
  dialogTitleSx,
  sx,
  ...dialogTitleProps
}: CsDialogTitleWithMenuProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const open = Boolean(anchor)

  const mergedTitleSx: SxProps<Theme> = [
    ...(dialogTitleSx ? [dialogTitleSx] : []),
    ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
  ]

  return (
    <DialogTitle {...dialogTitleProps} sx={mergedTitleSx}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
          direction: 'ltr',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40, justifyContent: 'flex-start' }}>
          {onRequestDelete ? (
            <>
              <IconButton
                aria-label="תפריט פעולות"
                size="small"
                onClick={(e: MouseEvent<HTMLButtonElement>) => setAnchor(e.currentTarget)}
                disabled={menuDisabled}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchor}
                open={open}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { direction: 'rtl' } } }}
              >
                <MenuItem
                  onClick={() => {
                    setAnchor(null)
                    onRequestDelete()
                  }}
                  disabled={menuDisabled}
                  sx={{ color: 'error.main', gap: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                  מחיקה
                </MenuItem>
              </Menu>
            </>
          ) : null}
        </Box>
        <Box
          component="div"
          sx={{
            flex: 1,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '1.1rem',
            lineHeight: 1.3,
            minWidth: 0,
          }}
        >
          {heading}
        </Box>
        <IconButton onClick={onClose} aria-label="סגור" size="small" disabled={closeDisabled}>
          <CloseIcon />
        </IconButton>
      </Box>
    </DialogTitle>
  )
}
