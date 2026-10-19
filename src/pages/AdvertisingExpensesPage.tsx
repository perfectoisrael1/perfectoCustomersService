import { Box, Card, CardContent, Stack } from '@mui/material'
import { CS_PAGE_FILL_MIN_HEIGHT_CSS } from '../layout/headerLayout'
import AdvertisingExpensesTab from '../components/AdvertisingExpensesTab'

export default function AdvertisingExpensesPage() {
  return (
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
          sx={{ px: 2, pb: 2, pt: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Stack spacing={0} sx={{ flex: 1, minHeight: 0, direction: 'rtl', textAlign: 'right' }}>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <AdvertisingExpensesTab />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
