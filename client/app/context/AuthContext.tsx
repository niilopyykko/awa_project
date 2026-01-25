'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface AuthContextType {
  token: string | null
  user: string | null
  avatarUrl: string | null
  login: (token: string, username: string, avatarUrl?: string) => void
  refresh: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  serverToken,
  serverUser,
}: {
  children: ReactNode
  serverToken?: string | null
  serverUser?: string | null
}) {
  // Token is HttpOnly on the server; keep client-side token null and rely on cookies
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<string | null>(serverUser ?? null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    // On client mount always derive `user` from the readable `user` cookie.
    // This ensures a refresh or navigation will restore auth UI state.
    try {
      const m = document.cookie.split('; ').find(c => c.startsWith('user='))
      if (m) setUser(decodeURIComponent(m.split('=')[1]))
      else setUser(null)
    } catch {
      setUser(null)
    }
  }, [])

  const login = (t: string, u: string, avatar?: string) => {
    // After login the backend should set HttpOnly token cookie and a readable user cookie.
    // Client-side just update `user` for immediate UI response.
    setUser(u)
    if (avatar) setAvatarUrl(avatar)
  }

  const refresh = () => {
    // Re-read the non-HttpOnly `user` cookie and update state accordingly.
    try {
      const m = document.cookie.split('; ').find(c => c.startsWith('user='))
      if (m) setUser(decodeURIComponent(m.split('=')[1]))
      else setUser(null)
    } catch {
      setUser(null)
    }
  }

  const logout = () => {
    // Call server-side logout to clear HttpOnly token cookie, then clear client state
    fetch('/api/proxy/logout', { method: 'POST', credentials: 'include' }).finally(() => {
      try {
        localStorage.clear()
      } catch { }
      try {
        sessionStorage.clear()
      } catch { }
      setToken(null)
      setUser(null)
      setAvatarUrl(null)
    })
  }

  return (
    <AuthContext.Provider value={{ token, user, avatarUrl, login, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
