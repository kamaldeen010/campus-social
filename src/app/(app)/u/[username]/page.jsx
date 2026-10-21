'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Bell, BellRing, MessageSquare, Ban, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { POST_SELECT, withOriginals } from '@/lib/queries'
import { useAuth } from '@/providers/AuthProvider'
import { name } from '@/lib/format'
import { Avatar, Empty } from '@/components/ui'
import PostCard from '@/components/PostCard'
import ReportDialog from '@/components/ReportDialog'

export default function ProfilePage() {
  const { username } = useParams()
  const { profile: me } = useAuth()
  const [p, setP] = useState(null)
  const [state, setState] = useState('loading')
  const [posts, setPosts] = useState([])
  const [count, setCount] = useState(0)
  const [fs, setFs] = useState(null)       // friendship row
  const [subscribed, setSubscribed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [report, setReport] = useState(false)
  const [error, setError] = useState('')
  const isMe = p?.id === me.id

  const load = useCallback(async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', String(username).toLowerCase()).maybeSingle()
    if (!prof) return setState('missing')
    const [{ data: ps }, { data: cnt }, { data: f }, { data: sub }, { data: b }] = await Promise.all([
      supabase.from('posts').select(POST_SELECT).eq('author_id', prof.id).order('created_at', { ascending: false }).limit(50),
      supabase.rpc('friend_count', { uid: prof.id }),
      supabase.from('friendships').select('*')
        .or(`and(requester_id.eq.${me.id},addressee_id.eq.${prof.id}),and(requester_id.eq.${prof.id},addressee_id.eq.${me.id})`).maybeSingle(),
      supabase.from('post_subscriptions').select('target_id').eq('subscriber_id', me.id).eq('target_id', prof.id).maybeSingle(),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', me.id).eq('blocked_id', prof.id).maybeSingle()
    ])
    setP(prof); setPosts(await withOriginals(ps || [])); setCount(cnt || 0); setFs(f); setSubscribed(!!sub); setBlocked(!!b); setState('ready')
  }, [username, me.id])

  useEffect(() => { load() }, [load])

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

  if (state === 'loading') return <Empty>Loading…</Empty>
  if (state === 'missing') return <Empty>No account with the username @{username}.</Empty>

  return (
    <>
      <div className="flex flex-col items-center border-b border-zinc-200 px-4 py-8 text-center dark:border-zinc-800">
        <Avatar profile={p} size={96} />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">{name(p)}</h1>
        <div className="muted text-sm">@{p.username}</div>
        {p.bio && <p className="mt-2 max-w-sm text-sm">{p.bio}</p>}
        <div className="muted mt-2 text-sm"><span className="font-medium text-zinc-900 dark:text-zinc-100">{count}</span> {count === 1 ? 'friend' : 'friends'}</div>

        {isMe ? (
          <Link href="/settings" className="btn mt-4">Edit profile</Link>
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!blocked && (
              <>
                {!fs && <button className="btn btn-primary" onClick={addFriend}>Add friend</button>}
                {fs?.status === 'pending' && fs.requester_id === me.id && <button className="btn" onClick={removeFs}>Cancel request</button>}
                {fs?.status === 'pending' && fs.addressee_id === me.id && (
                  <>
                    <button className="btn btn-primary" onClick={accept}>Accept</button>
                    <button className="btn" onClick={removeFs}>Decline</button>
                  </>
                )}
                {fs?.status === 'accepted' && <button className="btn" onClick={removeFs}>Friends · Remove</button>}
                <Link href={`/messages/${p.username}`} className="btn"><MessageSquare size={14} />Message</Link>
                <button className="btn" onClick={toggleBell} aria-pressed={subscribed}
                  aria-label={subscribed ? 'Stop post notifications' : 'Notify me of new posts'}
                  title={subscribed ? 'Notifications on' : 'Notify me of new posts'}>
                  {subscribed ? <BellRing size={14} /> : <Bell size={14} />}{subscribed ? 'On' : 'Notify'}
                </button>
              </>
            )}
            <button className={`btn ${blocked ? '' : 'btn-danger'}`} onClick={toggleBlock}><Ban size={14} />{blocked ? 'Unblock' : 'Block'}</button>
            <button className="btn" onClick={() => setReport(true)}><Flag size={14} />Report</button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {blocked ? <Empty>You blocked this account. Their posts are hidden.</Empty>
        : posts.length === 0 ? <Empty>No posts yet.</Empty>
        : posts.map((post) => <PostCard key={post.id} post={post} onDeleted={(id) => setPosts((c) => c.filter((x) => x.id !== id))} />)}
      <ReportDialog open={report} onClose={() => setReport(false)} targetUserId={p.id} />
    </>
  )
}
