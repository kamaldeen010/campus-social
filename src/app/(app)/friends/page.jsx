'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { PageHeader, PersonRow, Empty } from '@/components/ui'

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
    if (term.length < 2) return setFound([])
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
  const related = new Set(rows.map((r) => other(r).id))

  const act = async (query) => { const { error } = await query; setError(error?.message || ''); load() }
  const accept = (id) => act(supabase.from('friendships').update({ status: 'accepted' }).eq('id', id))
  const remove = (id) => act(supabase.from('friendships').delete().eq('id', id))
  const add = (id) => act(supabase.from('friendships').insert({ requester_id: me.id, addressee_id: id }))

  const tabs = [['friends', 'Friends'], ['requests', `Requests${incoming.length ? ` (${incoming.length})` : ''}`], ['find', 'Find people']]

  return (
    <>
      <PageHeader title="Friends" />
      <div className="flex border-b border-zinc-200 text-sm dark:border-zinc-800">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2.5 ${tab === k ? 'border-b-2 border-zinc-900 font-medium dark:border-zinc-100' : 'muted'}`}>{l}</button>
        ))}
      </div>
      {error && <p className="px-4 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {tab === 'friends' && (friends.length === 0 ? <Empty>No friends yet. Find people to add.</Empty> :
        friends.map((r) => <PersonRow key={r.id} profile={other(r)}><button className="btn" onClick={() => remove(r.id)}>Remove</button></PersonRow>))}

      {tab === 'requests' && (
        <>
          {incoming.length === 0 && outgoing.length === 0 && <Empty>No pending requests.</Empty>}
          {incoming.map((r) => (
            <PersonRow key={r.id} profile={r.requester}>
              <button className="btn btn-primary" onClick={() => accept(r.id)}>Accept</button>
              <button className="btn" onClick={() => remove(r.id)}>Decline</button>
            </PersonRow>
          ))}
          {outgoing.length > 0 && <div className="muted border-b border-zinc-200 px-4 py-2 text-xs dark:border-zinc-800">Sent</div>}
          {outgoing.map((r) => (
            <PersonRow key={r.id} profile={r.addressee}><button className="btn" onClick={() => remove(r.id)}>Cancel</button></PersonRow>
          ))}
        </>
      )}

      {tab === 'find' && (
        <>
          <div className="p-4"><input className="input" placeholder="Search by @username" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {q.trim().length >= 2 && found.length === 0 && <Empty>No accounts match “{q}”.</Empty>}
          {found.map((u) => (
            <PersonRow key={u.id} profile={u}>
              {related.has(u.id) ? <span className="muted text-xs">Connected or pending</span>
                : <button className="btn" onClick={() => add(u.id)}>Add friend</button>}
            </PersonRow>
          ))}
        </>
      )}
    </>
  )
}
