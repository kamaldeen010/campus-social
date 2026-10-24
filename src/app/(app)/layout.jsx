'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useUnread } from '@/hooks/useUnread'
import Nav from '@/components/Nav'

function Shell({ children }) {
  const { profile } = useAuth()
  const unread = useUnread(profile.id)
  const path = usePathname()
  const focus = /^\/(messages|groups)\/[^/]+$/.test(path)
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl md:justify-center">
      <Nav unread={unread} />
      <main className={`w-full min-w-0 border-zinc-100 dark:border-zinc-800/70 md:max-w-[640px] md:border-x ${focus ? '' : 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'}`}>
        {children}
      </main>
    </div>
  )
}

export default function AppLayout({ children }) {
  const { session, profile, loading, profileReady, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  useEffect(() => { if (!loading && !session) router.replace('/login') }, [loading, session, router])

  if (loading || !session || !profileReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-accent" />
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center text-sm">
        <div>
          <p className="mb-4">Couldn't load your account.</p>
          <button className="btn btn-primary mr-2" onClick={refreshProfile}>Retry</button>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    )
  }
  return <Shell>{children}</Shell>
}
