'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, EyeOff, Hash, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { PageHeader, Empty, Toggle } from '@/components/ui'

const G = 'id,name,description,is_public,is_anonymous'
const hue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h }

function GroupRow({ g }) {
  return (
    <Link href={`/groups/${g.id}`} className="row transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30">
      <div style={{ background: `hsl(${hue(g.name)} 42% 40%)` }} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white">
        {g.is_anonymous ? <EyeOff size={18} /> : <Hash size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="truncate">{g.name}</span>
          {g.is_anonymous && <span className="muted shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium dark:bg-zinc-900">Anonymous</span>}
          {!g.is_public && <Lock size={12} className="muted shrink-0" />}
        </div>
        {g.description && <div className="muted truncate text-sm">{g.description}</div>}
      </div>
    </Link>
  )
}

export default function GroupsPage() {
  const { profile: me } = useAuth()
  const router = useRouter()
  const [mine, setMine] = useState([])
  const [pub, setPub] = useState([])
  const [form, setForm] = useState({ name: '', description: '', is_public: true, is_anonymous: false })
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [{ data: m }, { data: g }] = await Promise.all([
      supabase.from('group_members').select(`group:groups!group_members_group_id_fkey(${G})`).eq('user_id', me.id),
      supabase.from('groups').select(G).eq('is_public', true).order('created_at', { ascending: false }).limit(50)
    ])
    setMine((m || []).map((x) => x.group).filter(Boolean)); setPub(g || [])
  }, [me.id])
  useEffect(() => { load() }, [load])

  async function create(e) {
    e.preventDefault(); setError('')
    const { data, error } = await supabase.from('groups').insert({ ...form, name: form.name.trim(), created_by: me.id }).select('id').single()
    if (error) return setError(error.message)
    router.push(`/groups/${data.id}`)
  }
  async function joinByCode(e) {
    e.preventDefault(); setError('')
    const { data, error } = await supabase.rpc('join_group_by_code', { p_code: code })
    if (error) return setError(error.message)
    router.push(`/groups/${data}`)
  }

  const mineIds = new Set(mine.map((g) => g.id))
  const discover = pub.filter((g) => !mineIds.has(g.id))
  const label = 'muted border-b border-zinc-100 px-4 py-2 text-xs font-medium uppercase tracking-wide dark:border-zinc-800/70'

  return (
    <>
      <PageHeader title="Groups">
        <button className="btn btn-primary" onClick={() => setCreating(!creating)}>
          {creating ? <><X size={14} />Close</> : <><Plus size={14} />New</>}
        </button>
      </PageHeader>

      {creating && (
        <form onSubmit={create} className="animate-rise space-y-3 border-b border-zinc-100 p-4 dark:border-zinc-800/70">
          <input className="input" placeholder="Group name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Description (optional)" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Toggle label="Public" hint="Anyone can find and join. Off means invite code only." checked={form.is_public} onChange={(v) => setForm({ ...form, is_public: v })} />
          <Toggle label="Anonymous room" hint="Everyone, including you, appears as Anon #1, Anon #2…" checked={form.is_anonymous} onChange={(v) => setForm({ ...form, is_anonymous: v })} />
          <button className="btn btn-primary w-full">Create group</button>
        </form>
      )}

      <form onSubmit={joinByCode} className="flex gap-2 border-b border-zinc-100 p-4 dark:border-zinc-800/70">
        <input className="input" placeholder="Have an invite code?" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn" disabled={!code.trim()}>Join</button>
      </form>
      {error && <p className="px-4 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={label}>Your groups</div>
      {mine.length === 0 ? <Empty icon={Hash} title="No groups yet">Create one or join a public group below.</Empty> : mine.map((g) => <GroupRow key={g.id} g={g} />)}
      <div className={label}>Discover</div>
      {discover.length === 0 ? <p className="muted px-4 py-6 text-center text-sm">No other public groups yet.</p> : discover.map((g) => <GroupRow key={g.id} g={g} />)}
    </>
  )
}
