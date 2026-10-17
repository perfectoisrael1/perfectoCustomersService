import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { isManagerUser } from '../lib/roles'

export default function DefaultHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={isManagerUser(user) ? '/jobs/today' : '/personal-area'} replace />
}
