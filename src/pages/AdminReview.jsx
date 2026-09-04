import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// A minimal, protected-by-Supabase-RLS review queue. In production, gate
// this route behind an admin check (e.g. a `role` column checked in RLS
// policies) — don't rely on hiding the URL.
export default function AdminReview() {
  const [pending, setPending] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('verifications')
        .select('id, user_id, selfie_url, profile_photo_url, claimed_gender, ai_match_distance, created_at')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
      setPending(data ?? [])
    }
    load()
  }, [])

  const decide = async (id, approve) => {
    await supabase
      .from('verifications')
      .update({ status: approve ? 'approved' : 'rejected' })
      .eq('id', id)
    setPending((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div className="min-h-screen bg-ink px-6 py-10 text-paper">
      <h1 className="font-display text-3xl">Verification queue</h1>
      <p className="mt-2 text-paper/60">{pending.length} waiting for review</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pending.map((v) => (
          <div key={v.id} className="rounded-2xl border border-paper/10 bg-ink-light p-4">
            <div className="grid grid-cols-2 gap-2">
              <img src={v.profile_photo_url} alt="Profile" className="aspect-square rounded-xl object-cover" />
              <img src={v.selfie_url} alt="Live selfie" className="aspect-square rounded-xl object-cover" />
            </div>
            <div className="mt-3 text-sm text-paper/70">
              <p>Claimed gender: {v.claimed_gender}</p>
              <p>AI match distance: {v.ai_match_distance ?? 'n/a'} (lower = closer match)</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => decide(v.id, true)}
                className="flex-1 rounded-full bg-sage py-2 text-sm font-medium text-ink"
              >
                Approve
              </button>
              <button
                onClick={() => decide(v.id, false)}
                className="flex-1 rounded-full bg-ember py-2 text-sm font-medium text-ink"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
