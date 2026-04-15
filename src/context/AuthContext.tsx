import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredToken, loginRequest, meRequest, setStoredToken, type User } from '../api/csApi'

type AuthContextValue = {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isCheckingAuth: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

type ApiError = Error & { status?: number }

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const isCheckingAuth = false

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const u = await meRequest(token)
        if (!cancelled) setUser(u)
      } catch (error) {
        const apiError = error as ApiError
        if (!cancelled && (apiError.status === 401 || apiError.status === 403 || !apiError.status)) {
          setStoredToken(null)
          setToken(null)
          setUser(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginRequest(username, password)
    setStoredToken(res.token)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      isCheckingAuth,
      login,
      logout,
    }),
    [token, user, isCheckingAuth, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
