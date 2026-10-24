'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Bell, BellRing, MessageSquare, Ban, Flag, UserPlus, UserCheck, Settings, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT, hydratePosts } from '@/lib/queries'
import { useAuth } from '@/providers/AuthProvider'
import { name } from '@/lib/format'
import { Avatar, Empty, PageHeader, Tabs, PostSkeleton } from '@/components/ui'
import PostCard from '@/components/PostCard'
import ReportDialog from '@/components/ReportDialog'

export default function ProfilePage() {
  const { username } = useParams()
  const { profile: me } = useAuth()
  const [p, setP] = useState(null)
  const [state, setState] = useState('loading')
  const [rows, setRows] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [tab, setTab] = useState('posts')
  const [count, setCount] = useState(0)
  const [fs, setFs] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [report, setReport] = useState(false)
  const [error, setError] = useState('')
  const isMe = p?.id === me.id

  const load = useCallback(async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', String(username).toLowerCase()).maybeSingle()
    if (!prof) return setState('missing')
    const [{ data: cnt }, { data: f }, { data: sub }, { data: b }] = await Promise.all([
      supabase.rpc('friend_count', { uid: prof.id }),
      supabase.from('friendships').select('*')
        .or(`and(requester_id.eq.${me.id},addressee_id.eq.${prof.id}),and(requester_id.eq.${prof.id},addressee_id.eq.${me.id})`).maybeSingle(),
      supabase.from('post_subscriptions').select('target_id').eq('subscriber_id', me.id).eq('target_id', prof.id).maybeSingle(),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', me.id).eq('blocked_id', prof.id).maybeSingle()
    ])
    setP(prof); setCount(cnt || 0); setFs(f); setSubscribed(!!sub); setBlocked(!!b); setState('ready')
  }, [username, me.id])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!p) return
    let alive = true
    setPostsLoading(true)
    let q = supabase.from('posts').select(POST_SELECT).eq('author_id', p.id)
    q = tab === 'posts' ? q.is('reply_to', null) : q.not('reply_to', 'is', null)
    q.order('created_at', { ascending: false }).limit(50).then(async ({ data }) => {
      const hydrated = await hydratePosts(data || [])
      if (alive) { setRows(hydrated); setPostsLoading(false) }
    })
    return () => { alive = false }
  }, [p, tab])

  const run = async (q) => { const { error } = await q; setError(error?.message || ''); load() }
  const addFriend = () => run(supabase.from('friendships').insert({ requester_id: me.id, addressee_id: p.id }))
  const accept = () => run(supabase.from('friendships').update({ status: 'accepted' }).eq('id', fs.id))
  const removeFs = () => run(supabase.from('friendships').delete().eq('id', fs.id))
  const toggleBell = () => run(subscribed
    ? supabase.from('post_subscriptions').delete().eq('subscriber_id', me.id).eq('target_id', p.id)
    : supabase.from('post_subscriptions').insert({ subscriber_id: me.id, target_id: p.id }))
  const toggleBlock = () => run(blocked
    ? supabase.from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', p.id)
    : supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: p.id }))

  if (state === 'loading') return <><PageHeader title="Profile" /><PostSkeleton n={2} /></>
  if (state === 'missing') return <><PageHeader title="Profile" /><Empty title="Account not found">There is no @{username}.</Empty></>

  return (
    <>
      <PageHeader title={name(p)} />
      <div className="h-24 bg-gradient-to-br from-accent/30 via-accent/10 to-transparent" />
      <div className="flex flex-col items-center px-4 pb-6 text-center">
        <div className="-mt-12 rounded-full ring-4 ring-white dark:ring-zinc-950"><Avatar profile={p} size={96} /></div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{name(p)}</h2>
        <div className="muted text-sm">@{p.username}</div>
        {p.bio && <p className="mt-2 max-w-sm text-[15px]">{p.bio}</p>}
        <div className="muted mt-2 text-sm"><span className="font-semibold text-zinc-900 dark:text-zinc-100">{count}</span> {count === 1 ? 'friend' : 'friends'}</div>

        {isMe ? (
          <Link href="/settings" className="btn mt-4"><Settings size={14} />Edit profile</Link>
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!blocked && (
              <>
                {!fs && <button className="btn btn-primary" onClick={addFriend}><UserPlus size={14} />Add friend</button>}
                {fs?.status === 'pending' && fs.requester_id === me.id && <button className="btn" onClick={removeFs}>Cancel request</button>}
                {fs?.status === 'pending' && fs.addressee_id === me.id && (
                  <>
                    <button className="btn btn-primary" onClick={accept}>Accept</button>
                    <button className="btn" onClick={removeFs}>Decline</button>
                  </>
                )}
                {fs?.status === 'accepted' && <button className="btn" onClick={removeFs}><UserCheck size={14} />Friends</button>}
                <Link href={`/messages/${p.username}`} className="btn"><MessageSquare size={14} />Message</Link>
                <button className={`btn ${subscribed ? 'border-accent text-accent' : ''}`} onClick={toggleBell} aria-pressed={subscribed}
                  aria-label={subscribed ? 'Stop post notifications' : 'Notify me of new posts'}>
                  {subscribed ? <BellRing size={14} /> : <Bell size={14} />}{subscribed ? 'Notifying' : 'Notify'}
                </button>
              </>
            )}
            <button className={`btn ${blocked ? '' : 'btn-danger'}`} onClick={toggleBlock}><Ban size={14} />{blocked ? 'Unblock' : 'Block'}</button>
            <button className="btn" onClick={() => setReport(true)}><Flag size={14} />Report</button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <Tabs tabs={[['posts', 'Posts'], ['replies', 'Replies']]} value={tab} onChange={setTab} />
      {blocked ? <Empty icon={Ban} title="You blocked this account">Their posts are hidden from you.</Empty>
        : postsLoading ? <PostSkeleton n={2} />
        : rows.length === 0 ? <Empty icon={FileText} title={tab === 'posts' ? 'No posts yet' : 'No replies yet'} />
        : rows.map((r) => {
          const shown = r.repost_of ? r.original : r
          if (!shown) return null
          return <PostCard key={r.id} post={shown} stats={r.stats} repostedBy={r.repost_of ? [r.author] : []}
            onDeleted={(id) => setRows((c) => c.filter((x) => x.id !== id && x.repost_of !== id))}
            onUndoRepost={(id) => setRows((c) => c.filter((x) => !(x.repost_of === id && x.author_id === me.id)))} />
        })}
      <ReportDialog open={report} onClose={() => setReport(false)} targetUserId={p.id} />
    </>
  )
}
