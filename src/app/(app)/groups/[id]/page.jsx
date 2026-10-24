'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, EyeOff, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, name } from '@/lib/format'
import { Avatar, Empty } from '@/components/ui'

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
  const [copied, setCopied] = useState(false)
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
  function copyCode() {
    navigator.clipboard?.writeText(group.invite_code)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  if (state === 'loading') return <div className="chat-screen grid place-items-center"><div className="h-8 w-8 animate-pulse rounded-lg bg-accent" /></div>
  if (state === 'missing') return <Empty title="Group not found">It doesn't exist or it is private.</Empty>

  const anon = group.is_anonymous
  const anonColor = (n) => `hsl(${(n * 67) % 360} 40% 38%)`

  return (
    <div className="chat-screen flex flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800/70">
        <Link href="/groups" aria-label="Back" className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"><ArrowLeft size={18} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight">
            <span className="truncate">{group.name}</span>{anon && <EyeOff size={14} className="muted shrink-0" />}
          </div>
          <div className="muted truncate text-xs">
            {anon ? 'Anonymous room · identities hidden' : group.is_public ? 'Public group' : 'Private group'}{member ? ` · ${count} members` : ''}
          </div>
        </div>
        {member && <button className="btn" onClick={leave}>Leave</button>}
      </header>

      {!member ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="max-w-xs">
            <p className="muted mb-3 text-sm">{group.description || 'Join this group to read and send messages.'}</p>
            {anon && <p className="muted mb-3 text-xs">You will appear as an anonymous tag. Nobody can see your name.</p>}
            <button className="btn btn-primary" onClick={join}>Join group</button>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      ) : (
        <>
          {!group.is_public && (
            <button onClick={copyCode} className="muted flex shrink-0 items-center gap-2 border-b border-zinc-100 px-4 py-2 text-left text-xs dark:border-zinc-800/70">
              {copied ? <Check size={12} /> : <Copy size={12} />}Invite code: <span className="font-mono">{group.invite_code}</span> · tap to copy
            </button>
          )}
          {anon && <div className="muted shrink-0 border-b border-zinc-100 px-4 py-2 text-xs dark:border-zinc-800/70">You are Anon #{member.anon_no} in this room.</div>}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && <Empty title="No messages yet">Say something to get it started.</Empty>}
            {msgs.map((m) => {
              const isMe = anon ? m.anon_no === member.anon_no : m.sender?.id === me.id
              return (
                <div key={m.id} className="flex gap-3">
                  {anon
                    ? <div style={{ background: anonColor(m.anon_no || 0) }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white">#{m.anon_no}</div>
                    : <Avatar profile={m.sender} size={36} />}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{anon ? `Anon #${m.anon_no}` : name(m.sender)}</span>
                      {isMe && <span className="rounded bg-accent/15 px-1.5 text-[10px] font-semibold uppercase text-accent">You</span>}
                      <span className="muted text-xs">{timeAgo(m.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.content}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottom} />
          </div>

          {error && <p className="shrink-0 px-4 pb-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form onSubmit={send} className="flex shrink-0 items-center gap-2 border-t border-zinc-100 px-3 pt-3 dark:border-zinc-800/70" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
            <input className="input rounded-full px-4" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={anon ? `Message as Anon #${member.anon_no}` : 'Message'} />
            <button className="btn btn-primary h-10 w-10 shrink-0 rounded-full p-0" aria-label="Send" disabled={!text.trim()}><Send size={16} /></button>
          </form>
        </>
      )}
    </div>
  )
}
