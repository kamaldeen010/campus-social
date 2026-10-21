'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT } from '@/lib/queries'
import Composer from '@/components/Composer'
import PostCard from '@/components/PostCard'
import { PageHeader, Empty } from '@/components/ui'

const PAGE = 30

async function fetchPosts(before) {
  let q = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(PAGE)
  if (before) q = q.lt('created_at', before)
  const { data } = await q
  return data || []
}

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)

  const add = useCallback((p) => setPosts((cur) => (cur.some((x) => x.id === p.id) ? cur : [p, ...cur])), [])

  useEffect(() => {
    fetchPosts().then((d) => { setPosts(d); setMore(d.length === PAGE); setLoading(false) })
  }, [])

  // Real-time: new posts appear instantly. RLS already hides blocked accounts.
  useEffect(() => {
    const ch = supabase.channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async ({ new: row }) => {
        const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', row.id).maybeSingle()
        if (data) add(data)
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [add])

  async function loadMore() {
    const d = await fetchPosts(posts[posts.length - 1]?.created_at)
    setPosts((cur) => [...cur, ...d.filter((x) => !cur.some((c) => c.id === x.id))])
    setMore(d.length === PAGE)
  }

  return (
    <>
      <PageHeader title="Feed" />
      <Composer onPosted={add} />
      {loading ? <Empty>Loading…</Empty> : posts.length === 0 ? <Empty>No posts yet. Write the first one.</Empty> : (
        posts.map((p) => <PostCard key={p.id} post={p} onDeleted={(id) => setPosts((c) => c.filter((x) => x.id !== id))} />)
      )}
      {more && <div className="p-4 text-center"><button className="btn" onClick={loadMore}>Load more</button></div>}
    </>
  )
}
