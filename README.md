# Campus Social

Next.js 14 (App Router) + Tailwind + Supabase.

1. Create a Supabase project and run the SQL from the separate SQL zip (`00_all_in_one.sql`).
2. `cp .env.example .env.local` and paste your project URL and anon key.
3. `npm install && npm run dev` -> http://localhost:3000

## Structure
- `src/app/login` sign in / sign up / one-click accounts
- `src/app/(app)/*` authenticated pages: feed, u/[username], friends, messages, groups, notifications, settings
- `src/components` shared UI (PostCard, Composer, ReportDialog, Nav...)
- `src/providers` Auth + Theme state
- `src/lib` Supabase client, queries, helpers

## One-click login
Passwords are never stored. After a successful login the app keeps the account's refresh token in
localStorage; the one-click button exchanges it for a fresh session. "Forget" in Settings removes it.
