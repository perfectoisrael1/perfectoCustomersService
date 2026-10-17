import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/useAuth'
import { isManagerUser } from '../lib/roles'

export default function ManagerProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!isManagerUser(user)) {
    return <Navigate to="/personal-area" replace />
  }
  return <>{children}</>
}
