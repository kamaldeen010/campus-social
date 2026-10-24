import { supabase } from '@/lib/supabase'

const AUTHOR = 'id,username,display_name,avatar_url'
export const PROFILE_FIELDS = AUTHOR
export const POST_SELECT = `id,content,created_at,repost_of,reply_to,author_id,
  author:profiles!posts_author_id_fkey(${AUTHOR})`

const EMPTY = { replies: 0, reposts: 0, mine: false }

// Adds `original` (for reposts) and `stats` (reply/repost counts) to rows.
// Uses plain queries only, no self-join embeds. Accepts one row or an array.
export async function hydratePosts(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  const ids = [...new Set(list.map((p) => p.repost_of).filter(Boolean))]
  let originals = {}
  if (ids.length) {
    const { data } = await supabase.from('posts').select(POST_SELECT).in('id', ids)
    originals = Object.fromEntries((data || []).map((o) => [o.id, o]))
  }
  const withOrig = list.map((p) => ({ ...p, original: p.repost_of ? originals[p.repost_of] || null : null }))

  const shownIds = [...new Set(withOrig.map((p) => (p.repost_of ? p.original?.id : p.id)).filter(Boolean))]
  let stats = {}
  if (shownIds.length) {
    const { data } = await supabase.rpc('post_stats', { ids: shownIds })
    stats = Object.fromEntries((data || []).map((s) => [s.post_id, { replies: s.replies, reposts: s.reposts, mine: s.reposted_by_me }]))
  }
  const out = withOrig.map((p) => {
    const shown = p.repost_of ? p.original : p
    return { ...p, stats: (shown && stats[shown.id]) || EMPTY }
  })
  return Array.isArray(rows) ? out : out[0]
}

// Feed cards: one card per original post. Reposts of a post already in the
// list are merged into it as "X reposted" instead of showing the post twice.
export function buildCards(rows) {
  const map = new Map()
  const order = []
  for (const r of rows) {
    const shown = r.repost_of ? r.original : r
    if (!shown || !shown.author) continue
    let e = map.get(shown.id)
    if (!e) {
      e = { key: shown.id, post: shown, stats: r.stats, repostedBy: [] }
      map.set(shown.id, e)
      order.push(e)
    }
    if (r.repost_of && r.author && !e.repostedBy.some((a) => a.id === r.author.id)) e.repostedBy.push(r.author)
  }
  return order
}
