const AUTHOR = 'id,username,display_name,avatar_url'
export const PROFILE_FIELDS = AUTHOR
export const POST_SELECT = `id,content,created_at,repost_of,author_id,
  author:profiles!posts_author_id_fkey(${AUTHOR}),
  original:posts!posts_repost_of_fkey(id,content,created_at,author_id,
    author:profiles!posts_author_id_fkey(${AUTHOR}))`
