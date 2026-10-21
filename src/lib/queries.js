import { supabase } from '@/lib/supabase'

const AUTHOR = 'id,username,display_name,avatar_url'
export const PROFILE_FIELDS = AUTHOR
export const POST_SELECT = `id,content,created_at,repost_of,author_id,
  author:profiles!posts_author_id_fkey(${AUTHOR})`

export async function withOriginals(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  const ids = [...new Set(list.map((p) => p.repost_of).filter(Boolean))]
  let map = {}
  if (ids.length) {
    const { data } = await supabase.from('posts').select(POST_SELECT).in('id', ids)
    map = Object.fromEntries((data || []).map((o) => [o.id, o]))
  }
  const out = list.map((p) => ({ ...p, original: p.repost_of ? map[p.repost_of] || null : null }))
  return Array.isArray(rows) ? out : out[0]
}