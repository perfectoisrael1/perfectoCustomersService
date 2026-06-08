import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { isManagerRole } from '../lib/roles'

export default function DefaultHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={isManagerRole(user?.role) ? '/jobs/today' : '/personal-area'} replace />
}
