'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saveAccount } from '@/lib/savedAccounts'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); setProfileReady(true); return }
    let data = null
    for (let i = 0; i < 3 && !data; i++) {
      const res = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
      data = res.data
      if (!data) await new Promise((r) => setTimeout(r, 800))
    }
    setProfile(data)
    setProfileReady(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setProfileReady(false)
    loadProfile(session?.user?.id)
  }, [session?.user?.id, loadProfile])

  useEffect(() => {
    if (!session || !profile) return
    saveAccount({
      id: session.user.id, email: session.user.email, username: profile.username,
      avatar_url: profile.avatar_url, refresh_token: session.refresh_token
    })
  }, [session?.refresh_token, profile?.username, profile?.avatar_url]) // eslint-disable-line

  // scope 'local' keeps the saved refresh token valid for one-click login.
  const signOut = () => supabase.auth.signOut({ scope: 'local' })

  return (
    <Ctx.Provider value={{
      session, profile, loading, profileReady, signOut,
      refreshProfile: () => loadProfile(session?.user?.id)
    }}>
      {children}
    </Ctx.Provider>
  )
}
export const useAuth = () => useContext(Ctx)
