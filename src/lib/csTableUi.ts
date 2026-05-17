import type { SxProps, Theme } from '@mui/material/styles'

/** טבלה פנימית בתוך `csPagedTableOuterBoxSx` — בלי מסגרת משלה (המסגרת על המעטפת) */
export const csTableInnerPagedScrollSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  borderRadius: 0,
  border: 'none',
  boxShadow: 'none',
}

/** מעטפת אחידה סביב אזור גלילת הטבלה + פוטר פגינציה מתחת */
export function csPagedTableOuterBoxSx(theme: Theme): SxProps<Theme> {
  return {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    bgcolor: 'background.paper',
  }
}

/** תואם ל־calliber customer-service (`standardTableTypography.js`) */
export const CS_TABLE_BODY_FONT_PX = 14

export const CS_TABLE_HEADER_BG = '#E1EFF2'

const CELL_PAD = 18

export function csTableScrollbarSx(theme: Theme) {
  const dark = theme.palette.mode === 'dark'
  const track = dark ? 'rgba(255,255,255,0.2)' : '#ffffff'
  const thumb = dark ? 'rgba(255,255,255,0.6)' : '#e2e8f0'
  const thumbHover = dark ? 'rgba(255,255,255,0.85)' : '#cbd5e1'
  return {
    scrollbarGutter: 'stable',
    scrollbarWidth: 'auto',
    scrollbarColor: `${thumb} ${track}`,
    paddingBottom: '12px',
    boxSizing: 'border-box',
    '&::-webkit-scrollbar': { height: 16, width: 16 },
    '&::-webkit-scrollbar-track': {
      backgroundColor: track,
      borderRadius: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: thumb,
      borderRadius: 8,
      border: '3px solid transparent',
      backgroundClip: 'padding-box',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: thumbHover,
    },
    '&::-webkit-scrollbar-corner': {
      backgroundColor: track,
    },
  } as const
}

/** סגנון טבלת נתונים בסגנון יקירוס — כותרות צבעוניות, גבולות תאים, גופן אחיד */
export function csDataTableSx(theme: Theme) {
  const pad = `${CELL_PAD}px`
  const padImportant = `${CELL_PAD}px !important`
  const headerBg =
    theme.palette.mode === 'dark' ? theme.palette.background.paper : `${CS_TABLE_HEADER_BG} !important`

  return {
    width: '100%',
    minWidth: 'max-content',
    direction: 'rtl',
    borderCollapse: 'separate',
    borderSpacing: 0,
    '& thead': {
      position: 'sticky',
      top: 0,
      zIndex: 12,
      backgroundColor: headerBg,
    },
    '& thead .MuiTableCell-head': {
      color: 'text.primary',
      fontWeight: 800,
      fontSize: 15,
      borderColor: theme.palette.divider,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      backgroundColor: 'transparent !important',
      borderRight: `0.5px solid ${theme.palette.divider}`,
      borderBottom: `0.5px solid ${theme.palette.divider}`,
      paddingLeft: padImportant,
      paddingRight: padImportant,
      verticalAlign: 'middle',
      textAlign: 'right',
      direction: 'rtl',
    },
    '& th, & td': {
      height: '34px',
      maxHeight: '34px',
      paddingTop: '4px',
      paddingBottom: '4px',
      paddingLeft: pad,
      paddingRight: pad,
      boxSizing: 'border-box',
    },
    '& td': {
      color: 'text.primary',
      borderColor: theme.palette.divider,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: 1.25,
      verticalAlign: 'middle',
      fontSize: CS_TABLE_BODY_FONT_PX,
      textAlign: 'right',
      direction: 'rtl',
      borderRight: `0.5px solid ${theme.palette.divider}`,
      borderBottom: `0.5px solid ${theme.palette.divider}`,
      '& .MuiTypography-root': {
        fontSize: `${CS_TABLE_BODY_FONT_PX}px !important`,
      },
      '& .MuiChip-label': {
        fontSize: `${CS_TABLE_BODY_FONT_PX}px !important`,
      },
      '& .MuiButton-root': {
        fontSize: `${CS_TABLE_BODY_FONT_PX}px !important`,
      },
    },
    '& tbody tr': {
      backgroundColor: theme.palette.background.paper,
    },
    '& tbody tr:hover': {
      backgroundColor: 'action.hover',
    },
    '& thead .MuiTableCell-head:first-of-type': {
      position: 'sticky',
      top: 0,
      zIndex: 14,
      backgroundColor: headerBg,
    },
    /** כותרות ממוינות: טקסט מימין, אייקון המיון משמאל לטקסט */
    '& thead .MuiTableSortLabel-root': {
      width: '100%',
      justifyContent: 'flex-end',
      flexDirection: 'row-reverse',
    },
    '& td.MuiTableCell-alignCenter, & th.MuiTableCell-alignCenter': {
      textAlign: 'center',
    },
  }
}
