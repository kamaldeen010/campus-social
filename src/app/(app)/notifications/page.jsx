'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, name } from '@/lib/format'
import { Avatar, PageHeader, Empty } from '@/components/ui'

const TEXT = {
  friend_request: 'sent you a friend request',
  friend_accepted: 'accepted your friend request',
  dm: 'sent you a message',
  message_request: 'sent you a message request',
  repost: 'reposted your post',
  new_post: 'published a new post'
}
const href = (n, me) => ({
  friend_request: '/friends', friend_accepted: `/u/${n.actor?.username}`, dm: `/messages/${n.actor?.username}`,
  message_request: '/messages', repost: `/u/${me.username}`, new_post: `/u/${n.actor?.username}`
}[n.type])

export default function NotificationsPage() {
  const { profile: me } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('notifications')
      .select('id,type,read,created_at,actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url)')
      .eq('user_id', me.id).order('created_at', { ascending: false }).limit(100)
    setItems(data || []); setLoading(false)
  }, [me.id])

  useEffect(() => {
    load()
    const ch = supabase.channel('notifications-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, me.id])

  const markAll = async () => { await supabase.rpc('mark_notifications_read'); load() }
  const hasUnread = items.some((n) => !n.read)

  return (
    <>
      <PageHeader title="Notifications">
        {hasUnread && <button className="btn" onClick={markAll}>Mark all read</button>}
      </PageHeader>
      {loading ? <Empty>Loading…</Empty> : items.length === 0 ? <Empty>Nothing yet. Friend requests, messages, reposts and posts from accounts you follow show up here.</Empty> :
        items.map((n) => (
          <Link key={n.id} href={href(n, me) || '#'} className="row hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
            <Avatar profile={n.actor} />
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{name(n.actor)}</span> {TEXT[n.type]}
              <div className="muted text-xs">{timeAgo(n.created_at)}</div>
            </div>
            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" aria-label="Unread" />}
          </Link>
        ))}
    </>
  )
}
