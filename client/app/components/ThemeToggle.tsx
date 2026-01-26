'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { IoMoon, IoSunny } from 'react-icons/io5'

type ThemeToggleProps = {
  showLabel?: boolean
  variant?: 'solid' | 'ghost'
  onToggle?: () => void
}

export default function ThemeToggle({ showLabel = false, variant = 'solid', onToggle }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const effectiveTheme = resolvedTheme || theme
  const nextTheme = effectiveTheme === 'dark' ? 'light' : 'dark'
  const isDark = effectiveTheme === 'dark'

  const base = 'flex items-center gap-2 rounded transition-all'
  const styles = variant === 'solid'
    ? 'bg-blue-500 dark:bg-blue-800 text-white px-2 py-2 hover:bg-blue-700 dark:hover:bg-blue-700 active:bg-blue-800'
    : 'bg-blue-500/80 dark:bg-blue-800/80 text-white px-3 py-2 hover:bg-blue-700 dark:hover:bg-blue-700 active:bg-blue-800'

  return (
    <button
      onClick={() => { setTheme(nextTheme); onToggle?.(); }}
      className={`${base} ${styles}`}
      aria-label="Toggle theme"
    >
      {isDark ? <IoSunny size={20} /> : <IoMoon size={20} />}
      {showLabel && (isDark ? 'Light mode' : 'Dark mode')}
    </button>
  )
}
