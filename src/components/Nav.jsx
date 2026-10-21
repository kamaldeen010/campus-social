'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, MessageSquare, Hash, Bell, User, Settings } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'

export default function Nav() {
  const { profile } = useAuth()
  const path = usePathname()
  const items = [
    ['/feed', 'Feed', Home], ['/friends', 'Friends', Users], ['/messages', 'Messages', MessageSquare],
    ['/groups', 'Groups', Hash], ['/notifications', 'Notifications', Bell],
    [`/u/${profile.username}`, 'Profile', User], ['/settings', 'Settings', Settings]
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:sticky md:top-0 md:h-screen md:w-52 md:flex-col md:justify-start md:gap-1 md:border-t-0 md:p-3">
      <div className="hidden px-3 pb-4 pt-2 text-lg font-semibold tracking-tight md:block">Campus</div>
      {items.map(([href, label, Icon]) => {
        const active = path === href || (href !== '/feed' && path.startsWith(href))
        return (
          <Link key={href} href={href} aria-label={label}
            className={`flex items-center gap-3 rounded px-3 py-3 text-sm md:py-2 ${active ? 'bg-zinc-100 font-medium dark:bg-zinc-900' : 'muted hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}>
            <Icon size={18} /><span className="hidden md:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
