'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { getAccounts, forgetAccount } from '@/lib/savedAccounts'
import { Avatar, Logo } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setAccounts(getAccounts()) }, [])
  useEffect(() => { if (!loading && session) router.replace('/feed') }, [loading, session, router])

  async function oneClick(a) {
    setBusy(true); setError('')
    const { error } = await supabase.auth.refreshSession({ refresh_token: a.refresh_token })
    if (error) {
      forgetAccount(a.id); setAccounts(getAccounts()); setEmail(a.email)
      setError('That session expired. Enter your password to sign in again.')
    }
    setBusy(false)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(''); setInfo('')
    if (mode === 'signup') {
      const u = username.trim().toLowerCase().replace(/^@/, '')
      if (!/^[a-z0-9_]{3,20}$/.test(u)) {
        setError('Username must be 3-20 characters: letters, numbers or underscore.')
        return setBusy(false)
      }
      const { data: free } = await supabase.rpc('username_available', { u })
      if (!free) { setError(`@${u} is taken. Try another username.`); return setBusy(false) }
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { username: u, display_name: displayName.trim() || u } }
      })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Account created. Confirm your email, then sign in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-12 text-zinc-100 md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-2.5"><Logo size={36} /><span className="text-xl font-semibold tracking-tight">Campus</span></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Your campus,<br />in one place.</h2>
          <p className="mt-4 max-w-sm text-zinc-400">Post updates, message friends, join groups and speak freely in anonymous rooms.</p>
        </div>
        <p className="relative z-10 text-xs text-zinc-500">Made for students.</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </aside>

      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-2.5 md:hidden"><Logo size={36} /><span className="text-xl font-semibold tracking-tight">Campus</span></div>
          <h1 className="text-2xl font-semibold tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted mb-6 mt-1 text-sm">{mode === 'signin' ? 'Sign in to continue.' : 'Pick a username and get started.'}</p>

          {mode === 'signin' && accounts.length > 0 && (
            <div className="card mb-6 overflow-hidden">
              <div className="muted border-b border-zinc-100 px-3.5 py-2 text-xs font-medium dark:border-zinc-800/70">Continue as</div>
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 border-b border-zinc-100 px-3.5 py-2.5 last:border-0 dark:border-zinc-800/70">
                  <button disabled={busy} onClick={() => oneClick(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar profile={{ username: a.username, avatar_url: a.avatar_url }} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">@{a.username}</span>
                      <span className="muted block truncate text-xs">{a.email}</span>
                    </span>
                  </button>
                  <button className="muted text-xs hover:underline" onClick={() => { forgetAccount(a.id); setAccounts(getAccounts()) }}>Forget</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input className="input" placeholder="@username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <input className="input" placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </>
            )}
            <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="Password" minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {info && <p className="muted text-sm">{info}</p>}
            <button className="btn btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>
          <button className="muted mt-5 text-sm hover:underline" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}>
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </div>
      </main>
    </div>
  )
}
