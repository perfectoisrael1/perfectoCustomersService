import { lazy, Suspense, useEffect, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import SpaRedirectBootstrap from './components/SpaRedirectBootstrap'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const JobsPage = lazy(() => import('./pages/JobsPage'))
const AccountsPage = lazy(() => import('./pages/AccountsPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const TicketsPage = lazy(() => import('./pages/TicketsPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const DomainsPage = lazy(() => import('./pages/DomainsPage'))
const CitiesPage = lazy(() => import('./pages/CitiesPage'))
const CommissionsPage = lazy(() => import('./pages/CommissionsPage'))
const CompanyEmployeesPage = lazy(() => import('./pages/CompanyEmployeesPage'))
const DashboardsPage = lazy(() => import('./pages/DashboardsPage'))
const PersonalAreaPage = lazy(() => import('./pages/PersonalAreaPage'))

function PageLoadFallback() {
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
          <SpaRedirectBootstrap />
          <Suspense fallback={<PageLoadFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={(
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                )}
              >
                <Route path="/" element={<Navigate to="/jobs/today" replace />} />
                <Route path="/jobs" element={<Navigate to="/jobs/today" replace />} />
                <Route path="/jobs/:segment" element={<JobsPage />} />
                <Route path="/accounts" element={<Navigate to="/accounts/businesses" replace />} />
                <Route path="/accounts/:segment" element={<AccountsPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/tasks" element={<Navigate to="/tasks/my-tasks" replace />} />
                <Route path="/tasks/:tabSlug" element={<TasksPage />} />
                <Route path="/domains" element={<DomainsPage />} />
                <Route path="/cities" element={<CitiesPage />} />
                <Route path="/commissions" element={<CommissionsPage />} />
                <Route path="/company-employees" element={<CompanyEmployeesPage />} />
                <Route path="/dashboards" element={<Navigate to="/dashboards/leads" replace />} />
                <Route path="/dashboards/:segment" element={<DashboardsPage />} />
                <Route path="/personal-area/attendance" element={<Navigate to="/personal-area/attendance/attendance" replace />} />
                <Route path="/personal-area/attendance/:subTab" element={<PersonalAreaPage />} />
                <Route path="/personal-area/availability" element={<PersonalAreaPage />} />
                <Route path="/personal-area/details" element={<Navigate to="/personal-area" replace />} />
                <Route path="/personal-area" element={<PersonalAreaPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/jobs/today" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
