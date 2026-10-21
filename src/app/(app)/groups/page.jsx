'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { PageHeader, Empty, Toggle } from '@/components/ui'

const G = 'id,name,description,is_public,is_anonymous'

function GroupRow({ g }) {
  return (
    <Link href={`/groups/${g.id}`} className="row hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{g.name}</span>
          {g.is_anonymous && <span className="muted flex items-center gap-1 text-xs font-normal"><EyeOff size={12} />Anonymous</span>}
          {!g.is_public && <span className="muted flex items-center gap-1 text-xs font-normal"><Lock size={12} />Private</span>}
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
  return (
    <>
      <PageHeader title="Groups">
        <button className="btn" onClick={() => setCreating(!creating)}>{creating ? 'Close' : 'New group'}</button>
      </PageHeader>

      {creating && (
        <form onSubmit={create} className="space-y-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <input className="input" placeholder="Group name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Description (optional)" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Toggle label="Public" hint="Anyone can find and join. Off = invite code only." checked={form.is_public} onChange={(v) => setForm({ ...form, is_public: v })} />
          <Toggle label="Anonymous room" hint="Everyone, including you, appears as Anon #1, Anon #2…" checked={form.is_anonymous} onChange={(v) => setForm({ ...form, is_anonymous: v })} />
          <button className="btn btn-primary">Create group</button>
        </form>
      )}

      <form onSubmit={joinByCode} className="flex gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <input className="input" placeholder="Have an invite code?" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn" disabled={!code.trim()}>Join</button>
      </form>
      {error && <p className="px-4 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="muted border-b border-zinc-200 px-4 py-2 text-xs dark:border-zinc-800">Your groups</div>
      {mine.length === 0 ? <Empty>You haven't joined any groups.</Empty> : mine.map((g) => <GroupRow key={g.id} g={g} />)}
      <div className="muted border-b border-zinc-200 px-4 py-2 text-xs dark:border-zinc-800">Discover public groups</div>
      {pub.filter((g) => !mineIds.has(g.id)).map((g) => <GroupRow key={g.id} g={g} />)}
    </>
  )
}
