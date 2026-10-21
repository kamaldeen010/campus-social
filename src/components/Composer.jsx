'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT } from '@/lib/queries'
import { useAuth } from '@/providers/AuthProvider'
import { Avatar } from './ui'

const MAX = 280

export default function Composer({ onPosted }) {
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const left = MAX - text.length
  const empty = !text.trim()

  async function post() {
    if (empty || left < 0) return
    setBusy(true); setError('')
    const { data, error } = await supabase.from('posts')
      .insert({ author_id: profile.id, content: text.trim() }).select(POST_SELECT).single()
    setBusy(false)
    if (error) return setError(error.message)
    setText(''); onPosted?.(data)
  }

  return (
    <div className="flex gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
      <Avatar profile={profile} />
      <div className="min-w-0 flex-1">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="What's happening on campus?"
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400" />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          <span className={`text-xs tabular-nums ${left < 0 ? 'text-red-600' : left < 20 ? 'text-amber-600' : 'muted'}`}>{left}</span>
          <button className="btn btn-primary" disabled={busy || empty || left < 0} onClick={post}>Post</button>
        </div>
      </div>
    </div>
  )
}
