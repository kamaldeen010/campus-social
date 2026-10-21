'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useUnread(uid) {
  const [n, setN] = useState(0)
  const load = useCallback(async () => {
    const { count } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false)
    setN(count || 0)
  }, [uid])
  useEffect(() => {
    load()
    const ch = supabase.channel(`unread-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid, load])
  return n
}
