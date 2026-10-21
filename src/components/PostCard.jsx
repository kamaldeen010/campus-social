'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Repeat2, Trash2, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, name } from '@/lib/format'
import { Avatar } from './ui'
import ReportDialog from './ReportDialog'

export default function PostCard({ post, onDeleted }) {
  const { profile } = useAuth()
  const [note, setNote] = useState('')
  const [report, setReport] = useState(false)
  const isRepost = !!post.repost_of
  const shown = isRepost ? post.original : post
  const mine = post.author_id === profile.id

  async function repost() {
    const { error } = await supabase.from('posts').insert({ author_id: profile.id, repost_of: shown.id })
    setNote(error ? (error.code === '23505' ? 'Already reposted' : error.message) : 'Reposted to your profile')
  }
  async function remove() {
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (!error) onDeleted?.(post.id)
  }

  return (
    <article className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      {isRepost && (
        <div className="muted mb-1 flex items-center gap-1 pl-12 text-xs">
          <Repeat2 size={12} /><Link href={`/u/${post.author.username}`} className="hover:underline">{mine ? 'You' : name(post.author)}</Link> reposted
        </div>
      )}
      {!shown ? (
        <p className="muted pl-12 text-sm">The original post is unavailable.</p>
      ) : (
        <div className="flex gap-3">
          <Link href={`/u/${shown.author.username}`}><Avatar profile={shown.author} /></Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-sm">
              <Link href={`/u/${shown.author.username}`} className="truncate font-medium hover:underline">{name(shown.author)}</Link>
              <span className="muted truncate text-xs">@{shown.author.username} · {timeAgo(shown.created_at)}</span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{shown.content}</p>
            <div className="muted mt-2 flex items-center gap-4 text-xs">
              {shown.author_id !== profile.id && (
                <button onClick={repost} className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"><Repeat2 size={14} />Repost</button>
              )}
              {shown.author_id !== profile.id && (
                <button onClick={() => setReport(true)} className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"><Flag size={13} />Report</button>
              )}
              {mine && (
                <button onClick={remove} className="flex items-center gap-1 hover:text-red-600"><Trash2 size={13} />{isRepost ? 'Undo repost' : 'Delete'}</button>
              )}
              {note && <span>{note}</span>}
            </div>
          </div>
        </div>
      )}
      <ReportDialog open={report} onClose={() => setReport(false)} postId={shown?.id} targetUserId={shown?.author_id} />
    </article>
  )
}
