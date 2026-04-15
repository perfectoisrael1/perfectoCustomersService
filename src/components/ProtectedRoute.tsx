import { Box, CircularProgress } from '@mui/material'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isCheckingAuth } = useAuth()

  if (isCheckingAuth) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#fafafa',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
