import { Box } from '@mui/material'
import TablePagination, { type TablePaginationProps } from '@mui/material/TablePagination'

/** פוטר פגינציה מחוץ ל־`<Table>` — מתחבר לגלילת הטבלה מעל ונשאר למטה בעמודת flex עם `margin-top: auto` (יקירוס) */
export type CsTablePaginationFooterProps = Omit<TablePaginationProps, 'component' | 'colSpan'>

const paginationToolbarSx = {
  borderBottom: 'none',
  direction: 'rtl' as const,
  '& .MuiTablePagination-toolbar': {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 1,
    px: { xs: 1, sm: 2 },
    py: 1,
    justifyContent: 'center',
    minHeight: 48,
    boxSizing: 'border-box',
  },
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    direction: 'rtl',
    textAlign: 'right',
    margin: 0,
  },
}

export default function CsTablePaginationFooter({ sx, ...props }: CsTablePaginationFooterProps) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        mt: 'auto',
        width: '100%',
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        direction: 'rtl',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <TablePagination
        component="div"
        {...props}
        sx={[
          paginationToolbarSx,
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    </Box>
  )
}
