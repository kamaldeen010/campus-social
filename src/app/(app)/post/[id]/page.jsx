'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { MessageCircle, CornerUpLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT, hydratePosts } from '@/lib/queries'
import Composer from '@/components/Composer'
import PostCard from '@/components/PostCard'
import { PageHeader, Empty, PostSkeleton } from '@/components/ui'

export default function PostPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [state, setState] = useState('loading')
  const seen = useRef(new Set())

  const load = useCallback(async () => {
    const { data: row } = await supabase.from('posts').select('id,repost_of').eq('id', id).maybeSingle()
    if (!row) return setState('missing')
    const target = row.repost_of || row.id
    const [{ data: p }, { data: rs }] = await Promise.all([
      supabase.from('posts').select(POST_SELECT).eq('id', target).maybeSingle(),
      supabase.from('posts').select(POST_SELECT).eq('reply_to', target).order('created_at').limit(100)
    ])
    if (!p) return setState('missing')
    const hp = await hydratePosts(p)
    const hr = await hydratePosts(rs || [])
    seen.current = new Set(hr.map((r) => r.id))
    setPost(hp); setReplies(hr); setState('ready')
  }, [id])

  useEffect(() => { load() }, [load])

  const target = post?.id
  const addReply = useCallback((r) => {
    if (seen.current.has(r.id)) return
    seen.current.add(r.id)
    setReplies((c) => [...c, r])
    setPost((p) => (p ? { ...p, stats: { ...p.stats, replies: (p.stats?.replies || 0) + 1 } } : p))
  }, [])

  useEffect(() => {
    if (!target) return
    const ch = supabase.channel(`replies-${target}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `reply_to=eq.${target}` }, async ({ new: row }) => {
        const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', row.id).maybeSingle()
        if (data) addReply(await hydratePosts(data))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [target, addReply])

  function removeReply(rid) {
    seen.current.delete(rid)
    setReplies((c) => c.filter((x) => x.id !== rid))
    setPost((p) => (p ? { ...p, stats: { ...p.stats, replies: Math.max(0, (p.stats?.replies || 1) - 1) } } : p))
  }

  return (
    <>
      <PageHeader title="Post" back="/feed" />
      {state === 'loading' ? <PostSkeleton n={2} /> : state === 'missing' ? (
        <Empty title="Post not found">It may have been deleted, or you can't see it.</Empty>
      ) : (
        <>
          {post.reply_to && (
            <Link href={`/post/${post.reply_to}`} className="muted flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5 text-sm hover:text-accent dark:border-zinc-800/70">
              <CornerUpLeft size={14} />This is a reply. View the original post
            </Link>
          )}
          <PostCard post={post} stats={post.stats} big onDeleted={() => router.push('/feed')} />
          <Composer replyTo={post.id} placeholder="Post your reply" onPosted={addReply} />
          {replies.length === 0 ? (
            <Empty icon={MessageCircle} title="No replies yet">Start the conversation.</Empty>
          ) : replies.map((r) => <PostCard key={r.id} post={r} stats={r.stats} onDeleted={removeReply} />)}
        </>
      )}
    </>
  )
}
