'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Inbox } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, name } from '@/lib/format'
import { Avatar, PageHeader, Empty, Tabs, PostSkeleton } from '@/components/ui'

const P = 'id,username,display_name,avatar_url'
const SEL = `id,content,created_at,status,sender_id,recipient_id,
  sender:profiles!messages_sender_id_fkey(${P}),
  recipient:profiles!messages_recipient_id_fkey(${P})`

export default function MessagesPage() {
  const { profile: me } = useAuth()
  const [tab, setTab] = useState('inbox')
  const [msgs, setMsgs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('messages').select(SEL)
      .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`).order('created_at', { ascending: false }).limit(300)
    setMsgs(data || []); setLoading(false)
  }, [me.id])

  useEffect(() => {
    load()
    const ch = supabase.channel('messages-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const inbox = []
  const seen = new Set()
  for (const m of msgs) {
    if (m.status === 'pending' && m.recipient_id === me.id) continue
    const o = m.sender_id === me.id ? m.recipient : m.sender
    if (!o || seen.has(o.id)) continue
    seen.add(o.id); inbox.push({ other: o, m })
  }
  const reqs = []
  const rseen = new Set()
  for (const m of msgs) {
    if (m.status !== 'pending' || m.recipient_id !== me.id || rseen.has(m.sender_id) || !m.sender) continue
    rseen.add(m.sender_id)
    reqs.push({ other: m.sender, m, n: msgs.filter((x) => x.status === 'pending' && x.sender_id === m.sender_id && x.recipient_id === me.id).length })
  }

  const respond = async (id, accept) => {
    await supabase.rpc(accept ? 'accept_message_request' : 'decline_message_request', { p_sender: id })
    load()
  }

  return (
    <>
      <PageHeader title="Messages" />
      <Tabs value={tab} onChange={setTab} tabs={[['inbox', 'Inbox'], ['requests', `Requests${reqs.length ? ` (${reqs.length})` : ''}`]]} />
      {loading ? <PostSkeleton n={3} /> : tab === 'inbox' ? (
        inbox.length === 0 ? <Empty icon={MessageSquare} title="No conversations yet">Open a profile and tap Message.</Empty> :
        inbox.map(({ other, m }) => (
          <Link key={other.id} href={`/messages/${other.username}`} className="row transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30">
            <Avatar profile={other} size={46} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-semibold">{name(other)}</span>
                <span className="muted shrink-0 text-xs">{timeAgo(m.created_at)}</span>
              </div>
              <div className="muted truncate text-sm">{m.sender_id === me.id ? 'You: ' : ''}{m.content}</div>
            </div>
          </Link>
        ))
      ) : reqs.length === 0 ? <Empty icon={Inbox} title="No message requests">Messages from non-friends show up here when your privacy setting is on.</Empty> : reqs.map(({ other, m, n }) => (
        <div key={other.id} className="row">
          <Avatar profile={other} size={46} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{name(other)} <span className="muted text-sm font-normal">@{other.username}</span></div>
            <div className="muted truncate text-sm">{n > 1 ? `${n} messages · ` : ''}{m.content}</div>
          </div>
          <button className="btn btn-primary" onClick={() => respond(other.id, true)}>Accept</button>
          <button className="btn" onClick={() => respond(other.id, false)}>Decline</button>
        </div>
      ))}
    </>
  )
}
