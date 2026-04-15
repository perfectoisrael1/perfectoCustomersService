import { useEffect, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import JobsPage from './pages/JobsPage'
import AccountsPage from './pages/AccountsPage'
import LeadsPage from './pages/LeadsPage'
import TicketsPage from './pages/TicketsPage'
import TasksPage from './pages/TasksPage'
import CitiesPage from './pages/CitiesPage'
import CommissionsPage from './pages/CommissionsPage'

export default function App() {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('dir')
    document.documentElement.setAttribute('dir', 'rtl')
    return () => {
      if (prev) document.documentElement.setAttribute('dir', prev)
      else document.documentElement.removeAttribute('dir')
    }
  }, [])

  const theme = useMemo(
    () =>
      createTheme({
        direction: 'rtl' as const,
        palette: {
          mode: 'light',
          primary: {
            main: '#FFDD00',
            contrastText: '#111111',
          },
          secondary: {
            main: '#111111',
            contrastText: '#FFDD00',
          },
          background: { default: '#fafafa', paper: '#ffffff' },
        },
        typography: {
          fontFamily: ['Rubik', 'Heebo', 'Segoe UI', 'Arial', 'sans-serif'].join(','),
        },
        components: {
          MuiButton: {
            styleOverrides: {
              contained: {
                '&.MuiButton-containedPrimary': { color: '#111', fontWeight: 700 },
              },
            },
          },
        },
      }),
    [],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={(
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              )}
            >
              <Route path="/" element={<Navigate to="/jobs" replace />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/cities" element={<CitiesPage />} />
              <Route path="/commissions" element={<CommissionsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
