'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useUnread } from '@/hooks/useUnread'
import Nav from '@/components/Nav'

function Shell({ children }) {
  const { profile } = useAuth()
  const unread = useUnread(profile.id)
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl">
      <Nav />
      <main className="min-w-0 flex-1 border-zinc-200 pb-16 dark:border-zinc-800 md:border-l md:pb-0">
        <div className="flex h-10 items-center justify-end border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link href="/notifications" aria-label="Notifications" className="relative p-1">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-zinc-900 px-1 text-[10px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        </div>
        {children}
      </main>
    </div>
  )
}

export default function AppLayout({ children }) {
  const { session, profile, loading } = useAuth()
  const router = useRouter()
  useEffect(() => { if (!loading && !session) router.replace('/login') }, [loading, session, router])
  if (loading || !session || !profile) {
    return <div className="muted grid min-h-screen place-items-center text-sm">Loading…</div>
  }
  return <Shell>{children}</Shell>
}
