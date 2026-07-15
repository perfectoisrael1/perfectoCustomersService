import { Box, Tab, Tabs } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SupplierNotificationsPanel from '../components/SupplierNotificationsPanel'

export default function NotificationsPage() {
  const theme = useTheme()

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        direction: 'rtl',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Tabs
          value="suppliers"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            direction: 'rtl',
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: 15,
              minWidth: 100,
            },
          }}
        >
          <Tab value="suppliers" label="התראה לספקים" />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', direction: 'rtl', textAlign: 'right' }}>
        <SupplierNotificationsPanel />
      </Box>
    </Box>
  )
}
