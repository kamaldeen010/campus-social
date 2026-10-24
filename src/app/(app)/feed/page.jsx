'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Newspaper } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT, hydratePosts, buildCards } from '@/lib/queries'
import { useAuth } from '@/providers/AuthProvider'
import Composer from '@/components/Composer'
import PostCard from '@/components/PostCard'
import { PageHeader, Empty, PostSkeleton } from '@/components/ui'

const PAGE = 30

async function fetchRows(before) {
  let q = supabase.from('posts').select(POST_SELECT).is('reply_to', null)
    .order('created_at', { ascending: false }).limit(PAGE)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  if (error) return { rows: [], error: error.message }
  return { rows: await hydratePosts(data || []) }
}

export default function FeedPage() {
  const { profile: me } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const cards = useMemo(() => buildCards(rows), [rows])

  const add = useCallback((r) => setRows((cur) => (cur.some((x) => x.id === r.id) ? cur : [r, ...cur])), [])

  useEffect(() => {
    fetchRows().then(({ rows, error }) => {
      setRows(rows); setMore(rows.length === PAGE); setError(error || ''); setLoading(false)
    })
  }, [])

  // Real-time: new posts and deletions. RLS already hides blocked accounts.
  useEffect(() => {
    const ch = supabase.channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async ({ new: row }) => {
        if (row.reply_to) return
        const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', row.id).maybeSingle()
        if (data) add(await hydratePosts(data))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, ({ old }) => {
        setRows((cur) => cur.filter((x) => x.id !== old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [add])

  async function loadMore() {
    const { rows: next } = await fetchRows(rows[rows.length - 1]?.created_at)
    setRows((cur) => [...cur, ...next.filter((x) => !cur.some((c) => c.id === x.id))])
    setMore(next.length === PAGE)
  }

  const removePost = (id) => setRows((cur) => cur.filter((x) => x.id !== id && x.repost_of !== id))
  const undoRepost = (id) => setRows((cur) => cur.filter((x) => !(x.repost_of === id && x.author_id === me.id)))

  return (
    <>
      <PageHeader title="Home" />
      <Composer onPosted={add} />
      {loading ? <PostSkeleton /> : error ? (
        <Empty title="Couldn't load the feed">{error}</Empty>
      ) : cards.length === 0 ? (
        <Empty icon={Newspaper} title="Nothing here yet">Be the first to post something.</Empty>
      ) : cards.map((c) => (
        <PostCard key={c.key} post={c.post} stats={c.stats} repostedBy={c.repostedBy} onDeleted={removePost} onUndoRepost={undoRepost} />
      ))}
      {more && <div className="p-4 text-center"><button className="btn" onClick={loadMore}>Load more</button></div>}
    </>
  )
}
