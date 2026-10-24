'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, UserPlus, UserCheck, MessageSquare, Repeat2, FileText, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { timeAgo, name } from '@/lib/format'
import { Avatar, PageHeader, Empty, PostSkeleton } from '@/components/ui'

const META = {
  friend_request: ['sent you a friend request', UserPlus],
  friend_accepted: ['accepted your friend request', UserCheck],
  dm: ['sent you a message', MessageSquare],
  message_request: ['sent you a message request', MessageSquare],
  repost: ['reposted your post', Repeat2],
  reply: ['replied to your post', MessageCircle],
  new_post: ['published a new post', FileText]
}
const href = (n) => ({
  friend_request: '/friends',
  friend_accepted: `/u/${n.actor?.username}`,
  dm: `/messages/${n.actor?.username}`,
  message_request: '/messages',
  repost: n.post_id ? `/post/${n.post_id}` : '/feed',
  reply: n.post_id ? `/post/${n.post_id}` : '/feed',
  new_post: n.post_id ? `/post/${n.post_id}` : `/u/${n.actor?.username}`
}[n.type] || '/feed')

export default function NotificationsPage() {
  const { profile: me } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('notifications')
      .select('id,type,read,post_id,created_at,actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url)')
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
      {loading ? <PostSkeleton n={3} /> : items.length === 0 ? (
        <Empty icon={Bell} title="You're all caught up">Friend requests, messages, replies, reposts and posts from accounts you follow show up here.</Empty>
      ) : items.map((n) => {
        const [text, Icon] = META[n.type] || ['sent an update', Bell]
        return (
          <Link key={n.id} href={href(n)} className={`row transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30 ${n.read ? '' : 'bg-accent/5'}`}>
            <div className="relative shrink-0">
              <Avatar profile={n.actor} size={42} />
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-white ring-2 ring-white dark:text-zinc-950 dark:ring-zinc-950">
                <Icon size={11} />
              </span>
            </div>
            <div className="min-w-0 flex-1 text-[15px]">
              <span className="font-semibold">{name(n.actor)}</span> {text}
              <div className="muted text-xs">{timeAgo(n.created_at)}</div>
            </div>
            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
          </Link>
        )
      })}
    </>
  )
}
