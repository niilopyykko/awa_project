'use client'

import { ThemeProvider } from 'next-themes'
import { AuthProvider } from './context/AuthContext'

export function Providers({ children, serverToken, serverUser }: { children: React.ReactNode; serverToken: string | null; serverUser: string | null }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider serverToken={serverToken} serverUser={serverUser}>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
