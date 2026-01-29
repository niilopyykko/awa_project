'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface AuthContextType {
  user: string | null
  avatarUrl: string | null
  login: (username: string, avatarUrl?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  serverUser,
  serverAvatarUrl,
}: {
  children: ReactNode
  serverUser?: string | null
  serverAvatarUrl?: string | null
}) {
  const [user, setUser] = useState<string | null>(serverUser ?? null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(serverAvatarUrl ?? null)

  // Sync state when serverUser/serverAvatarUrl props change
  useEffect(() => {
    if (serverUser !== undefined) {
      setUser(serverUser)
    }
    if (serverAvatarUrl !== undefined) {
      setAvatarUrl(serverAvatarUrl)
    }
  }, [serverUser, serverAvatarUrl])

  const login = (username: string, avatar?: string) => {
    setUser(username)
    if (avatar) setAvatarUrl(avatar)
  }

  const logout = async () => {
    try {
      await fetch('/api/proxy/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      try { localStorage.clear() } catch { }
      try { sessionStorage.clear() } catch { }
      setUser(null)
      setAvatarUrl(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, avatarUrl, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
