import './globals.css'
import { Providers } from '@/providers/Providers'

export const metadata = { title: 'Campus', description: 'Student social and chat' }

const themeScript = `try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
