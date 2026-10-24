# Campus Social

Next.js 14 (App Router) + Tailwind + Supabase.

## Update an existing project
1. Run `06_replies.sql` (from the SQL zip) in the Supabase SQL Editor first.
2. Unzip this over your `campus-social` folder and replace all files. Your `.env.local` is not in the zip, so it stays.
3. `npm run dev` to test, then `git add .`, `git commit -m "v2"`, `git push`.

## New project
`cp .env.example .env.local`, paste your Supabase URL and publishable key, `npm install && npm run dev`.

## Structure
- `src/app/login` sign in / sign up / one-click accounts
- `src/app/(app)/*` feed, post/[id] (replies), u/[username], friends, messages, groups, notifications, settings
- `src/components` PostCard, Composer, Nav, ReportDialog, shared UI
- `src/providers` Auth + Theme, `src/lib` Supabase client and queries
