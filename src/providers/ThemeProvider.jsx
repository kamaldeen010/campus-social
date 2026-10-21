'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setT] = useState('light')
  useEffect(() => {
    setT(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])
  const setTheme = (t) => {
    setT(t)
    try { localStorage.setItem('theme', t) } catch {}
    document.documentElement.classList.toggle('dark', t === 'dark')
  }
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
