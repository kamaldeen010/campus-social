'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT, hydratePosts } from '@/lib/queries'
import { useAuth } from '@/providers/AuthProvider'
import { Avatar } from './ui'

const MAX = 280

function Ring({ used }) {
  const r = 9
  const c = 2 * Math.PI * r
  const left = MAX - used
  const pct = Math.min(used / MAX, 1)
  const tone = left < 0 ? 'stroke-red-500' : left < 20 ? 'stroke-amber-500' : 'stroke-accent'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-zinc-200 dark:stroke-zinc-800" />
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className={tone} />
    </svg>
  )
}

export default function Composer({ onPosted, replyTo = null, placeholder = "What's happening on campus?" }) {
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ta = useRef(null)
  const left = MAX - text.length
  const empty = !text.trim()

  function grow(e) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  async function post() {
    if (empty || left < 0 || busy) return
    setBusy(true); setError('')
    const row = { author_id: profile.id, content: text.trim() }
    if (replyTo) row.reply_to = replyTo
    const { data, error } = await supabase.from('posts').insert(row).select(POST_SELECT).single()
    if (error) { setBusy(false); return setError(error.message) }
    const full = await hydratePosts(data)
    setText('')
    if (ta.current) ta.current.style.height = 'auto'
    setBusy(false)
    onPosted?.(full)
  }

  return (
    <div className="flex gap-3 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800/70">
      <Avatar profile={profile} />
      <div className="min-w-0 flex-1">
        <textarea ref={ta} value={text} onChange={grow} rows={1} placeholder={placeholder}
          className="max-h-48 w-full resize-none bg-transparent pt-2 text-[17px] leading-snug outline-none placeholder:text-zinc-400" />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/70">
          {text.length > 0 && (
            <div className="flex items-center gap-2">
              {left <= 20 && <span className={`text-xs tabular-nums ${left < 0 ? 'text-red-500' : 'muted'}`}>{left}</span>}
              <Ring used={text.length} />
            </div>
          )}
          <button className="btn btn-primary rounded-full px-5" disabled={busy || empty || left < 0} onClick={post}>
            {replyTo ? 'Reply' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
