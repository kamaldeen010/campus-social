'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saveAccount } from '@/lib/savedAccounts'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data)
  }, [])

  // Session restoration: supabase-js persists the session in localStorage.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => { loadProfile(session?.user?.id) }, [session?.user?.id, loadProfile])

  // Keep the saved one-click token current (refresh tokens rotate).
  useEffect(() => {
    if (!session || !profile) return
    saveAccount({
      id: session.user.id, email: session.user.email, username: profile.username,
      avatar_url: profile.avatar_url, refresh_token: session.refresh_token
    })
  }, [session?.refresh_token, profile?.username, profile?.avatar_url]) // eslint-disable-line

  // scope 'local' keeps the saved refresh token valid for one-click login later.
  const signOut = () => supabase.auth.signOut({ scope: 'local' })

  return (
    <Ctx.Provider value={{ session, profile, loading, signOut, refreshProfile: () => loadProfile(session?.user?.id) }}>
      {children}
    </Ctx.Provider>
  )
}
export const useAuth = () => useContext(Ctx)
