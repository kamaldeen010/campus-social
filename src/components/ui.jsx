'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { name } from '@/lib/format'

const hue = (s = '?') => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

export function Avatar({ profile, size = 40 }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" style={style} className="shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10" />
  }
  const label = name(profile)
  return (
    <div style={{ ...style, background: `hsl(${hue(profile?.username || label)} 42% 40%)` }}
      className="grid shrink-0 select-none place-items-center rounded-full font-semibold text-white">
      {label[0]?.toUpperCase()}
    </div>
  )
}

export function PageHeader({ title, back, children }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-zinc-100 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
      {back && (
        <Link href={back} aria-label="Back" className="-ml-2 rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <ArrowLeft size={18} />
        </Link>
      )}
      <h1 className="flex-1 truncate text-[17px] font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  )
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex animate-rise flex-col items-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Icon size={20} />
        </div>
      )}
      {title && <p className="text-sm font-semibold">{title}</p>}
      {children && <p className="muted mt-1 max-w-xs text-sm">{children}</p>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex border-b border-zinc-100 dark:border-zinc-800/70">
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`relative flex-1 py-3 text-sm font-medium transition-colors ${value === k ? '' : 'muted hover:text-zinc-900 dark:hover:text-zinc-100'}`}>
          {label}
          {value === k && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-accent" />}
        </button>
      ))}
    </div>
  )
}

export function PostSkeleton({ n = 4 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className="flex animate-pulse gap-3 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800/70">
      <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  ))
}

export function PersonRow({ profile, children }) {
  return (
    <div className="row transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30">
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar profile={profile} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium">{name(profile)}</div>
          <div className="muted truncate text-sm">@{profile.username}</div>
        </div>
      </Link>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="muted mt-0.5 text-xs">{hint}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export function Logo({ size = 32 }) {
  return (
    <span style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-white dark:text-zinc-950">C</span>
  )
}
