'use client'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from './AuthProvider'

export function Providers({ children }) {
  return <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
}
