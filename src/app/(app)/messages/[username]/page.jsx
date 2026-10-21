'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { name } from '@/lib/format'
import { Avatar, Empty } from '@/components/ui'

export default function ThreadPage() {
  const { username } = useParams()
  const { profile: me } = useAuth()
  const [other, setOther] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState('loading')
  const bottom = useRef(null)

  const load = useCallback(async () => {
    const { data: o } = await supabase.from('profiles').select('id,username,display_name,avatar_url')
      .eq('username', String(username).toLowerCase()).maybeSingle()
    if (!o) return setState('missing')
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${me.id},recipient_id.eq.${o.id}),and(sender_id.eq.${o.id},recipient_id.eq.${me.id})`)
      .order('created_at').limit(300)
    setOther(o); setMsgs(data || []); setState('ready')
  }, [username, me.id])

  useEffect(() => {
    load()
    const ch = supabase.channel(`dm-${me.id}-${username}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, me.id, username])

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  const visible = msgs.filter((m) => m.status === 'accepted' || m.sender_id === me.id)
  const pendingFromThem = msgs.filter((m) => m.status === 'pending' && m.sender_id === other?.id).length

  async function send(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setError('')
    const { data, error } = await supabase.from('messages')
      .insert({ sender_id: me.id, recipient_id: other.id, content }).select().single()
    if (error) return setError(error.message)
    setText(''); setMsgs((c) => (c.some((m) => m.id === data.id) ? c : [...c, data]))
  }
  const respond = async (accept) => {
    await supabase.rpc(accept ? 'accept_message_request' : 'decline_message_request', { p_sender: other.id }); load()
  }

  if (state === 'loading') return <Empty>Loading…</Empty>
  if (state === 'missing') return <Empty>No account with the username @{username}.</Empty>

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col md:h-[calc(100vh-2.5rem)]">
      <Link href={`/u/${other.username}`} className="flex items-center gap-3 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <Avatar profile={other} size={32} />
        <div><div className="text-sm font-medium">{name(other)}</div><div className="muted text-xs">@{other.username}</div></div>
      </Link>

      {pendingFromThem > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span>{name(other)} sent you a message request.</span>
          <span className="flex gap-2">
            <button className="btn btn-primary" onClick={() => respond(true)}>Accept</button>
            <button className="btn" onClick={() => respond(false)}>Decline</button>
          </span>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {visible.length === 0 && <Empty>Say hello to {name(other)}.</Empty>}
        {visible.map((m) => {
          const mine = m.sender_id === me.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap break-words border px-3 py-2 text-sm ${mine ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-200 dark:border-zinc-800'} rounded`}>
                {m.content}
                {m.status === 'pending' && <div className="mt-1 text-[11px] opacity-70">Sent as a request. Waiting for them to accept.</div>}
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {error && <p className="px-4 pb-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Write a message" />
        <button className="btn btn-primary" aria-label="Send"><Send size={15} /></button>
      </form>
    </div>
  )
}
