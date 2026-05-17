import type { TableContainerProps } from '@mui/material'
import TableContainer from '@mui/material/TableContainer'
import { useTheme } from '@mui/material/styles'

import { csTableScrollbarSx } from '../lib/csTableUi'

/** מיכל טבלה בסגנון שירות לקוחות יקירוס — RTL, מסגרת, צל, סרגל גלילה עדין */
export default function CsTableContainer({ sx, ...props }: TableContainerProps) {
  const theme = useTheme()
  return (
    <TableContainer
      {...props}
      sx={[
        {
          direction: 'rtl',
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
          overflowX: 'auto',
          overflowY: 'auto',
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          ...csTableScrollbarSx(theme),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  )
}
