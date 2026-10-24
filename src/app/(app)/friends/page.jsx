'use client'
import { useCallback, useEffect, useState } from 'react'
import { Users, Search, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { PageHeader, PersonRow, Empty, Tabs } from '@/components/ui'

const P = 'id,username,display_name,avatar_url'
const SEL = `id,status,requester_id,addressee_id,
  requester:profiles!friendships_requester_id_fkey(${P}),
  addressee:profiles!friendships_addressee_id_fkey(${P})`

export default function FriendsPage() {
  const { profile: me } = useAuth()
  const [tab, setTab] = useState('friends')
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('friendships').select(SEL)
    setRows(data || [])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('friendships-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  useEffect(() => {
    const term = q.trim().toLowerCase().replace(/^@/, '')
    if (term.length < 2) { setFound([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select(P).neq('id', me.id).ilike('username', `%${term}%`).limit(20)
      setFound(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [q, me.id])

  const other = (r) => (r.requester_id === me.id ? r.addressee : r.requester)
  const friends = rows.filter((r) => r.status === 'accepted')
  const incoming = rows.filter((r) => r.status === 'pending' && r.addressee_id === me.id)
  const outgoing = rows.filter((r) => r.status === 'pending' && r.requester_id === me.id)
  const related = new Set(rows.map((r) => other(r)?.id))

  const act = async (query) => { const { error } = await query; setError(error?.message || ''); load() }
  const accept = (id) => act(supabase.from('friendships').update({ status: 'accepted' }).eq('id', id))
  const remove = (id) => act(supabase.from('friendships').delete().eq('id', id))
  const add = (id) => act(supabase.from('friendships').insert({ requester_id: me.id, addressee_id: id }))

  return (
    <>
      <PageHeader title="Friends" />
      <Tabs value={tab} onChange={setTab}
        tabs={[['friends', 'Friends'], ['requests', `Requests${incoming.length ? ` (${incoming.length})` : ''}`], ['find', 'Find people']]} />
      {error && <p className="px-4 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {tab === 'friends' && (friends.length === 0
        ? <Empty icon={Users} title="No friends yet">Use Find people to add classmates.</Empty>
        : friends.map((r) => other(r) && (
          <PersonRow key={r.id} profile={other(r)}><button className="btn" onClick={() => remove(r.id)}>Remove</button></PersonRow>
        )))}

      {tab === 'requests' && (
        <>
          {incoming.length === 0 && outgoing.length === 0 && <Empty icon={UserPlus} title="No pending requests" />}
          {incoming.map((r) => r.requester && (
            <PersonRow key={r.id} profile={r.requester}>
              <button className="btn btn-primary" onClick={() => accept(r.id)}>Accept</button>
              <button className="btn" onClick={() => remove(r.id)}>Decline</button>
            </PersonRow>
          ))}
          {outgoing.length > 0 && <div className="muted border-b border-zinc-100 px-4 py-2 text-xs font-medium uppercase tracking-wide dark:border-zinc-800/70">Sent</div>}
          {outgoing.map((r) => r.addressee && (
            <PersonRow key={r.id} profile={r.addressee}><button className="btn" onClick={() => remove(r.id)}>Cancel</button></PersonRow>
          ))}
        </>
      )}

      {tab === 'find' && (
        <>
          <div className="relative p-4">
            <Search size={16} className="muted pointer-events-none absolute left-7 top-1/2 -translate-y-1/2" />
            <input className="input pl-10" placeholder="Search by @username" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {q.trim().length >= 2 && found.length === 0 && <Empty icon={Search} title="No matches">Nobody matches “{q}”.</Empty>}
          {found.map((u) => (
            <PersonRow key={u.id} profile={u}>
              {related.has(u.id) ? <span className="muted text-xs">Connected or pending</span>
                : <button className="btn" onClick={() => add(u.id)}>Add</button>}
            </PersonRow>
          ))}
        </>
      )}
    </>
  )
}
