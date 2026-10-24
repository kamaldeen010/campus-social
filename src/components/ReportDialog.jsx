'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

const REASONS = ['Spam', 'Harassment', 'Hate or abuse', 'Inappropriate content', 'Other']

export default function ReportDialog({ open, onClose, targetUserId = null, postId = null }) {
  const { profile } = useAuth()
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  if (!open) return null

  async function submit() {
    const { error } = await supabase.from('reports').insert({
      reporter_id: profile.id, target_user_id: targetUserId, post_id: postId, reason, details
    })
    if (error) setError(error.message); else setDone(true)
  }
  const close = () => { setDone(false); setError(''); onClose() }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={close}>
      <div className="card w-full max-w-sm animate-rise rounded-b-none p-5 shadow-xl sm:rounded-b-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-base font-semibold">{postId ? 'Report post' : 'Report account'}</h2>
        {done ? (
          <>
            <p className="muted mb-4 text-sm">Thanks. Moderators will review your report.</p>
            <button className="btn w-full" onClick={close}>Close</button>
          </>
        ) : (
          <>
            <select className="input mb-2" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <textarea className="input mb-2" rows={3} maxLength={500} placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
            {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Send report</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
