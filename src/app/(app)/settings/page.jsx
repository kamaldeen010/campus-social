'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { getAccounts, forgetAccount } from '@/lib/savedAccounts'
import { Avatar, PageHeader, PersonRow, Toggle } from '@/components/ui'

function Section({ title, children }) {
  return (
    <section className="space-y-3 border-b border-zinc-200 px-4 py-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">{title}</h2>{children}
    </section>
  )
}

export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio)
  const [msg, setMsg] = useState('')
  const [blocked, setBlocked] = useState([])
  const [accounts, setAccounts] = useState([])
  const file = useRef(null)

  const loadBlocked = useCallback(async () => {
    const { data } = await supabase.from('blocks')
      .select('blocked:profiles!blocks_blocked_id_fkey(id,username,display_name,avatar_url)').eq('blocker_id', profile.id)
    setBlocked((data || []).map((x) => x.blocked).filter(Boolean))
  }, [profile.id])
  useEffect(() => { loadBlocked(); setAccounts(getAccounts()) }, [loadBlocked])

  async function update(fields) {
    const { error } = await supabase.from('profiles').update(fields).eq('id', profile.id)
    setMsg(error ? error.message : 'Saved')
    refreshProfile()
  }
  async function upload(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) return setMsg('Image must be under 2 MB.')
    const path = `${profile.id}/avatar-${Date.now()}.${f.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, f, { upsert: true, contentType: f.type })
    if (error) return setMsg(error.message)
    update({ avatar_url: supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl })
  }
  async function unblock(id) {
    await supabase.from('blocks').delete().eq('blocker_id', profile.id).eq('blocked_id', id)
    loadBlocked()
  }
  async function logout() { await signOut(); router.replace('/login') }

  return (
    <>
      <PageHeader title="Settings" />

      <Section title="Appearance">
        <div className="flex gap-2">
          {[['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTheme(k)} aria-pressed={theme === k}
              className={`btn flex-1 ${theme === k ? 'btn-primary' : ''}`}><Icon size={14} />{l}</button>
          ))}
        </div>
      </Section>

      <Section title="Privacy">
        <Toggle label="Only allow friends to message me" hint="Messages from non-friends go to your Requests inbox."
          checked={profile.only_friends_dm} onChange={(v) => update({ only_friends_dm: v })} />
      </Section>

      <Section title="Profile">
        <div className="flex items-center gap-3">
          <Avatar profile={profile} size={56} />
          <button className="btn" onClick={() => file.current?.click()}>Change photo</button>
          <input ref={file} type="file" accept="image/*" hidden onChange={upload} />
        </div>
        <input className="input" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
        <textarea className="input" rows={2} value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={() => update({ display_name: displayName.trim() || profile.username, bio })}>Save changes</button>
          {msg && <span className="muted text-sm">{msg}</span>}
        </div>
      </Section>

      <Section title="Blocked accounts">
        {blocked.length === 0 ? <p className="muted text-sm">You haven't blocked anyone.</p> :
          <div className="-mx-4 border-t border-zinc-200 dark:border-zinc-800">
            {blocked.map((b) => <PersonRow key={b.id} profile={b}><button className="btn" onClick={() => unblock(b.id)}>Unblock</button></PersonRow>)}
          </div>}
      </Section>

      <Section title="Account">
        {accounts.length > 0 && (
          <div className="space-y-2">
            <p className="muted text-xs">Accounts available for one-click login on this device</p>
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>@{a.username}</span>
                <button className="muted text-xs hover:underline" onClick={() => { forgetAccount(a.id); setAccounts(getAccounts()) }}>Forget</button>
              </div>
            ))}
          </div>
        )}
        <button className="btn" onClick={logout}>Sign out</button>
      </Section>
    </>
  )
}
