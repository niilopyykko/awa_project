'use client'

import { ThemeProvider } from 'next-themes'
import { AuthProvider } from './context/AuthContext'

export function Providers({
  children,
  serverUser,
  serverAvatarUrl,
}: {
  children: React.ReactNode
  serverUser: string | null
  serverAvatarUrl: string | null
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider
        serverUser={serverUser}
        serverAvatarUrl={serverAvatarUrl}
      >
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
