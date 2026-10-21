'use client'
import Link from 'next/link'
import { name } from '@/lib/format'

export function Avatar({ profile, size = 36 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" style={style}
      className="shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-800" />
  ) : (
    <div style={style}
      className="grid shrink-0 place-items-center rounded-full border border-zinc-300 bg-zinc-100 font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {name(profile)[0]?.toUpperCase()}
    </div>
  )
}

export function PageHeader({ title, children }) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

export function Empty({ children }) {
  return <p className="muted px-4 py-10 text-center text-sm">{children}</p>
}

export function PersonRow({ profile, children }) {
  return (
    <div className="row">
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar profile={profile} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{name(profile)}</div>
          <div className="muted truncate text-xs">@{profile.username}</div>
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
        {hint && <div className="muted text-xs">{hint}</div>}
      </div>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100' : 'border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800'}`}>
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all dark:bg-zinc-950 ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
