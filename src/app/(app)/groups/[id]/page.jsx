'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, EyeOff, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, name } from '@/lib/format'
import { Empty } from '@/components/ui'

const SEL = 'id,group_id,content,anon_no,created_at,sender:profiles!group_messages_sender_id_fkey(id,username,display_name,avatar_url)'

export default function GroupPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile: me } = useAuth()
  const [group, setGroup] = useState(null)
  const [member, setMember] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [count, setCount] = useState(0)
  const [state, setState] = useState('loading')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const bottom = useRef(null)

  const load = useCallback(async () => {
    const { data: g } = await supabase.from('groups').select('*').eq('id', id).maybeSingle()
    if (!g) return setState('missing')
    const { data: m } = await supabase.from('group_members').select('*').eq('group_id', id).eq('user_id', me.id).maybeSingle()
    setGroup(g); setMember(m)
    if (m) {
      const [{ data: ms }, { data: c }] = await Promise.all([
        supabase.from('group_messages').select(SEL).eq('group_id', id).order('created_at').limit(200),
        supabase.rpc('group_member_count', { gid: id })
      ])
      setMsgs(ms || []); setCount(c || 0)
    }
    setState('ready')
  }, [id, me.id])
  useEffect(() => { load() }, [load])

  // Real-time messages. Anonymous rooms never carry sender ids, only anon numbers.
  useEffect(() => {
    if (!member) return
    const ch = supabase.channel(`group-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` }, async ({ new: row }) => {
        const { data } = await supabase.from('group_messages').select(SEL).eq('id', row.id).maybeSingle()
        if (data) setMsgs((c) => (c.some((m) => m.id === data.id) ? c : [...c, data]))
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, member])

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function send(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setError('')
    const { data, error } = await supabase.from('group_messages').insert({ group_id: id, content }).select(SEL).single()
    if (error) return setError(error.message)
    setText(''); setMsgs((c) => (c.some((m) => m.id === data.id) ? c : [...c, data]))
  }
  async function join() {
    const { error } = await supabase.rpc('join_group', { p_group_id: id })
    if (error) setError(error.message); else load()
  }
  async function leave() {
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', me.id)
    router.push('/groups')
  }

  if (state === 'loading') return <Empty>Loading…</Empty>
  if (state === 'missing') return <Empty>This group doesn't exist or is private.</Empty>

  const anon = group.is_anonymous
  const label = (m) => anon
    ? (m.anon_no === member.anon_no ? `You · Anon #${m.anon_no}` : `Anon #${m.anon_no}`)
    : (m.sender?.id === me.id ? 'You' : name(m.sender))

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col md:h-[calc(100vh-2.5rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold"><span className="truncate">{group.name}</span>{anon && <EyeOff size={14} className="muted" />}</div>
          <div className="muted truncate text-xs">
            {anon ? 'Anonymous room · identities are hidden' : group.is_public ? 'Public group' : 'Private group'}{member ? ` · ${count} members` : ''}
          </div>
        </div>
        {member && <button className="btn" onClick={leave}>Leave</button>}
      </div>

      {!member ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <p className="muted mb-3 text-sm">{group.description || 'Join this group to read and send messages.'}</p>
            {anon && <p className="muted mb-3 text-xs">You will appear as an anonymous tag. Nobody can see your name.</p>}
            <button className="btn btn-primary" onClick={join}>Join group</button>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      ) : (
        <>
          {!group.is_public && (
            <button className="muted flex items-center gap-2 border-b border-zinc-200 px-4 py-2 text-left text-xs dark:border-zinc-800"
              onClick={() => navigator.clipboard?.writeText(group.invite_code)}>
              <Copy size={12} />Invite code: <span className="font-mono">{group.invite_code}</span> (tap to copy)
            </button>
          )}
          {anon && <div className="muted border-b border-zinc-200 px-4 py-2 text-xs dark:border-zinc-800">You are Anon #{member.anon_no} in this room.</div>}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && <Empty>No messages yet.</Empty>}
            {msgs.map((m) => (
              <div key={m.id}>
                <div className="muted text-xs"><span className="font-medium text-zinc-900 dark:text-zinc-100">{label(m)}</span> · {timeAgo(m.created_at)}</div>
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          {error && <p className="px-4 pb-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={anon ? `Message as Anon #${member.anon_no}` : 'Write a message'} />
            <button className="btn btn-primary" aria-label="Send"><Send size={15} /></button>
          </form>
        </>
      )}
    </div>
  )
}
