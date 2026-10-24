'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, MessageSquare, Hash, Bell, User, Settings, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { name } from '@/lib/format'
import { Avatar, Logo } from './ui'

export default function Nav({ unread = 0 }) {
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const path = usePathname()
  const hideOnMobile = /^\/(messages|groups)\/[^/]+$/.test(path)
  const items = [
    ['/feed', 'Home', Home], ['/friends', 'Friends', Users], ['/messages', 'Messages', MessageSquare],
    ['/groups', 'Groups', Hash], ['/notifications', 'Notifications', Bell],
    [`/u/${profile.username}`, 'Profile', User], ['/settings', 'Settings', Settings]
  ]
  return (
    <nav className={`${hideOnMobile ? 'hidden' : 'flex'} fixed inset-x-0 bottom-0 z-30 justify-around border-t border-zinc-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/90 md:sticky md:inset-x-auto md:bottom-auto md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:justify-start md:gap-1 md:border-t-0 md:bg-transparent md:px-4 md:py-5 md:pb-5 md:backdrop-blur-none md:dark:bg-transparent`}>
      <div className="mb-5 hidden items-center gap-2.5 px-3 md:flex">
        <Logo />
        <span className="text-lg font-semibold tracking-tight">Campus</span>
      </div>

      {items.map(([href, label, Icon]) => {
        const active = path === href || (href === '/feed' ? path.startsWith('/post') : path.startsWith(href))
        const isBell = href === '/notifications'
        return (
          <Link key={href} href={href} aria-label={label}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors md:py-2.5 ${active
              ? 'font-semibold text-zinc-900 dark:text-zinc-50 md:bg-zinc-100 md:dark:bg-zinc-900'
              : 'muted hover:text-zinc-900 dark:hover:text-zinc-100 md:hover:bg-zinc-50 md:dark:hover:bg-zinc-900/60'}`}>
            <span className="relative">
              <Icon size={21} strokeWidth={active ? 2.4 : 2} className={active ? 'text-accent' : ''} />
              {isBell && unread > 0 && (
                <span className="absolute -right-2 -top-1.5 grid min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-white dark:text-zinc-950">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
            <span className="hidden md:inline">{label}</span>
          </Link>
        )
      })}

      <div className="mt-auto hidden items-center gap-1 border-t border-zinc-100 pt-4 dark:border-zinc-800/70 md:flex">
        <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <Avatar profile={profile} size={34} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name(profile)}</span>
            <span className="muted block truncate text-xs">@{profile.username}</span>
          </span>
        </Link>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme"
          className="muted rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  )
}
