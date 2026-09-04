import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const ADMIN_PASSWORD = 'arclight2024' // change this to something only you know

export default function AdminReview() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  const login = () => {
    if (pw === ADMIN_PASSWORD) setAuthed(true)
    else alert('Wrong password')
  }

  useEffect(() => {
    if (!authed) return
    loadQueue()
    loadCounts()
  }, [authed])

  const loadQueue = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('verifications')
      .select('id, user_id, selfie_url, profile_photo_url, claimed_gender, ai_match_distance, ai_liveness_passed, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
    setPending(data ?? [])
    setLoading(false)
  }

  const loadCounts = async () => {
    const { data } = await supabase
      .from('verifications')
      .select('status')
    if (!data) return
    setCounts({
      pending: data.filter(v => v.status === 'pending_review').length,
      approved: data.filter(v => v.status === 'approved').length,
      rejected: data.filter(v => v.status === 'rejected').length,
    })
  }

  const decide = async (verificationId, userId, approve) => {
    // Update verification status
    await supabase.from('verifications')
      .update({ status: approve ? 'approved' : 'rejected' })
      .eq('id', verificationId)

    // If approved, mark profile as verified
    if (approve) {
      await supabase.from('profiles')
        .update({ verified: true })
        .eq('id', userId)
    }

    setPending((prev) => prev.filter((v) => v.id !== verificationId))
    loadCounts()
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl text-paper">Admin access</h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Password"
            className="mt-6 w-full rounded-xl border border-paper/15 bg-ink-light px-4 py-3 text-paper outline-none focus:border-ember"
          />
          <button onClick={login}
            className="mt-4 w-full rounded-full bg-ember py-3 font-medium text-ink">
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-8 text-paper md:px-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Verification queue</h1>
        <button onClick={loadQueue} className="text-sm text-paper/50 hover:text-paper">Refresh</button>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4">
        {[
          { label: 'Pending', value: counts.pending, color: 'text-gold' },
          { label: 'Approved', value: counts.approved, color: 'text-sage' },
          { label: 'Rejected', value: counts.rejected, color: 'text-ember' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-paper/10 bg-ink-light px-5 py-3 text-center">
            <p className={`font-display text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-paper/50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Queue */}
      <div className="mt-8">
        {loading && <p className="text-paper/50">Loading...</p>}
        {!loading && pending.length === 0 && (
          <div className="rounded-2xl border border-paper/10 bg-ink-light p-10 text-center text-paper/50">
            No pending verifications
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pending.map((v) => (
            <div key={v.id} className="rounded-2xl border border-paper/10 bg-ink-light p-4">
              {/* Photos side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-xs text-paper/40">Profile photo</p>
                  <img src={v.profile_photo_url} alt="Profile"
                    className="aspect-square w-full rounded-xl object-cover" />
                </div>
                <div>
                  <p className="mb-1 text-xs text-paper/40">Live selfie</p>
                  <img src={v.selfie_url} alt="Selfie"
                    className="aspect-square w-full rounded-xl object-cover" />
                </div>
              </div>

              {/* Info */}
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-paper/50">Claimed gender</span>
                  <span className="font-medium">{v.claimed_gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-paper/50">AI face match</span>
                  <span className={`font-medium ${v.ai_match_distance < 0.5 ? 'text-sage' : v.ai_match_distance < 0.65 ? 'text-gold' : 'text-ember'}`}>
                    {v.ai_match_distance ? `${v.ai_match_distance} ${v.ai_match_distance < 0.5 ? '(strong)' : v.ai_match_distance < 0.65 ? '(ok)' : '(weak)'}` : 'n/a'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-paper/50">Liveness</span>
                  <span className={v.ai_liveness_passed ? 'text-sage' : 'text-ember'}>
                    {v.ai_liveness_passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-paper/50">Submitted</span>
                  <span>{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Decision buttons */}
              <div className="mt-4 flex gap-2">
                <button onClick={() => decide(v.id, v.user_id, true)}
                  className="flex-1 rounded-full bg-sage py-2.5 text-sm font-medium text-ink hover:opacity-90">
                  Approve
                </button>
                <button onClick={() => decide(v.id, v.user_id, false)}
                  className="flex-1 rounded-full bg-ember/20 border border-ember py-2.5 text-sm font-medium text-ember hover:bg-ember/30">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
