'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Repeat2, Trash2, Flag, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, fullDate, name } from '@/lib/format'
import { Avatar } from './ui'
import ReportDialog from './ReportDialog'

const EMPTY = { replies: 0, reposts: 0, mine: false }
const act = 'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] transition-colors'

export default function PostCard({ post, stats: initial, repostedBy = [], onDeleted, onUndoRepost, big = false }) {
  const { profile: me } = useAuth()
  const [stats, setStats] = useState(initial || EMPTY)
  const [report, setReport] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (initial) setStats(initial) }, [initial])

  if (!post?.author) return null
  const mine = post.author_id === me.id

  async function toggleRepost() {
    if (busy) return
    setBusy(true); setErr('')
    if (stats.mine) {
      const { error } = await supabase.from('posts').delete().eq('author_id', me.id).eq('repost_of', post.id)
      if (error) setErr(error.message)
      else { setStats((s) => ({ ...s, mine: false, reposts: Math.max(0, s.reposts - 1) })); onUndoRepost?.(post.id) }
    } else {
      const { error } = await supabase.from('posts').insert({ author_id: me.id, repost_of: post.id })
      if (error) setErr(error.code === '23505' ? 'Already reposted' : error.message)
      else setStats((s) => ({ ...s, mine: true, reposts: s.reposts + 1 }))
    }
    setBusy(false)
  }

  async function remove() {
    if (!window.confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) setErr(error.message); else onDeleted?.(post.id)
  }

  const names = repostedBy.map((a) => (a.id === me.id ? 'You' : name(a)))
  const label = names.length === 1 ? `${names[0]} reposted`
    : names.length === 2 ? `${names[0]} and ${names[1]} reposted`
    : `${names[0]} and ${names.length - 1} others reposted`

  return (
    <article className="animate-rise border-b border-zinc-100 px-4 pb-1.5 pt-3 transition-colors hover:bg-zinc-50/70 dark:border-zinc-800/70 dark:hover:bg-zinc-900/30">
      {names.length > 0 && (
        <div className="muted mb-1 flex items-center gap-1.5 pl-[52px] text-xs font-medium">
          <Repeat2 size={13} />{label}
        </div>
      )}
      <div className="flex gap-3">
        <Link href={`/u/${post.author.username}`}><Avatar profile={post.author} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <Link href={`/u/${post.author.username}`} className="truncate text-[15px] font-semibold hover:underline">{name(post.author)}</Link>
            <span className="muted truncate text-sm">@{post.author.username}</span>
            {!big && <span className="muted shrink-0 text-sm">· {timeAgo(post.created_at)}</span>}
          </div>
          <Link href={`/post/${post.id}`} className="block">
            <p className={`mt-0.5 whitespace-pre-wrap break-words leading-relaxed ${big ? 'text-[19px]' : 'text-[15px]'}`}>{post.content}</p>
          </Link>
          {big && <p className="muted mt-3 text-sm">{fullDate(post.created_at)}</p>}

          <div className="-ml-2.5 mt-1 flex items-center gap-1">
            <Link href={`/post/${post.id}`} aria-label="Reply" className={`${act} muted hover:bg-accent/10 hover:text-accent`}>
              <MessageCircle size={17} />{stats.replies > 0 && stats.replies}
            </Link>
            <button onClick={toggleRepost} disabled={busy} aria-label={stats.mine ? 'Undo repost' : 'Repost'} aria-pressed={stats.mine}
              className={`${act} ${stats.mine ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'muted hover:bg-emerald-500/10 hover:text-emerald-600'}`}>
              <Repeat2 size={18} />{stats.reposts > 0 && stats.reposts}
            </button>
            {!mine && (
              <button onClick={() => setReport(true)} aria-label="Report" className={`${act} muted hover:bg-zinc-200/60 dark:hover:bg-zinc-800`}>
                <Flag size={15} />
              </button>
            )}
            {mine && (
              <button onClick={remove} aria-label="Delete" className={`${act} muted hover:bg-red-500/10 hover:text-red-600`}>
                <Trash2 size={15} />
              </button>
            )}
            {err && <span className="ml-2 text-xs text-red-600 dark:text-red-400">{err}</span>}
          </div>
        </div>
      </div>
      <ReportDialog open={report} onClose={() => setReport(false)} postId={post.id} targetUserId={post.author_id} />
    </article>
  )
}
