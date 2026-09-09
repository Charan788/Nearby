import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AdminReview() {
  const [authed, setAuthed] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [adminTab, setAdminTab] = useState('verifications') // 'verifications' | 'tickets' | 'reports'
  const [tickets, setTickets] = useState([])
  const [reports, setReports] = useState([])

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCheckingAccess(false); return }
      const { data: isAdmin } = await supabase.rpc('is_admin')
      setAuthed(isAdmin === true)
      setCheckingAccess(false)
    }
    checkAccess()
  }, [])

  useEffect(() => {
    if (!authed) return
    loadQueue()
    loadCounts()
    loadTickets()
    loadReports()
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

  const loadTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
  }

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(name), reported:profiles!reports_reported_id_fkey(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setReports(data ?? [])
  }

  const resolveTicket = async (id, status) => {
    await supabase.from('support_tickets').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const resolveReport = async (id, action) => {
    await supabase.from('reports').update({ status: action }).eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
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

      // Mark referral as verified and reward referrer
      try {
        const { data: ref } = await supabase
          .from('referrals').select('*').eq('referred_id', userId).maybeSingle()
        
        if (ref && ref.referrer_id) {
          await supabase.from('referrals').update({ status: 'verified' }).eq('id', ref.id)

          const { data: allRefs } = await supabase
            .from('referrals').select('id')
            .eq('referrer_id', ref.referrer_id)
            .in('status', ['verified', 'rewarded'])

          const verifiedCount = (allRefs || []).length + 1

          await supabase.from('profiles')
            .update({ referral_count: verifiedCount })
            .eq('id', ref.referrer_id)

          if (verifiedCount % 3 === 0) {
            const { data: referrer } = await supabase
              .from('profiles').select('plan_expires_at').eq('id', ref.referrer_id).single()
            const baseDate = referrer?.plan_expires_at && new Date(referrer.plan_expires_at) > new Date()
              ? new Date(referrer.plan_expires_at) : new Date()
            baseDate.setDate(baseDate.getDate() + 7)
            await supabase.from('profiles').update({
              plan: 'plus', plan_expires_at: baseDate.toISOString()
            }).eq('id', ref.referrer_id)
          }
        }
      } catch (e) { console.log('referral update error', e) }
    }

    setPending((prev) => prev.filter((v) => v.id !== verificationId))
    loadCounts()
  }

  if (checkingAccess) {
    return <div className="flex min-h-screen items-center justify-center bg-ink text-paper/50">Checking access…</div>
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl text-paper">Admin access required</h1>
          <p className="mt-3 text-paper/60">Sign in with an account granted moderator access by the database administrator.</p>
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

      {/* Admin tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'verifications', label: '🛡️ Verifications', count: counts.pending },
          { id: 'tickets', label: '💬 Support', count: tickets.filter(t => t.status === 'open').length },
          { id: 'reports', label: '🚨 Reports', count: reports.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAdminTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              adminTab === tab.id ? 'bg-ember text-ink' : 'border border-paper/15 text-paper/60'
            }`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 rounded-full bg-paper/20 px-1.5 text-xs">{tab.count}</span>}
          </button>
        ))}
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

      {/* Support Tickets */}
      {adminTab === 'tickets' && (
        <div className="mt-6 space-y-3">
          {tickets.length === 0 && <p className="text-paper/50 text-sm">No support tickets</p>}
          {tickets.map(t => (
            <div key={t.id} className="rounded-2xl border border-paper/10 bg-ink-light p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{t.subject}</p>
                  <p className="text-xs text-paper/50">{t.email} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs rounded-full px-2 py-1 ${
                  t.status === 'open' ? 'bg-ember/20 text-ember' :
                  t.status === 'resolved' ? 'bg-sage/20 text-sage' : 'bg-paper/10 text-paper/50'
                }`}>{t.status}</span>
              </div>
              <p className="text-sm text-paper/70 bg-ink rounded-xl px-3 py-2 mb-3">{t.message}</p>
              <div className="flex gap-2">
                <a href={`mailto:${t.email}?subject=Re: ${t.subject}&body=Hi, thanks for reaching out to Nearby support.`}
                  className="flex-1 rounded-full bg-ember py-2 text-center text-xs font-medium text-ink">
                  Reply via Email
                </a>
                <a href={`https://wa.me/91${t.email?.includes('@') ? '' : t.email}?text=Hi, this is Nearby support regarding your query: ${t.subject}`}
                  className="rounded-full border border-sage/40 px-3 py-2 text-xs text-sage">
                  WhatsApp
                </a>
                {t.status === 'open' && (
                  <button onClick={() => resolveTicket(t.id, 'resolved')}
                    className="rounded-full border border-paper/20 px-3 py-2 text-xs text-paper/50">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reports */}
      {adminTab === 'reports' && (
        <div className="mt-6 space-y-3">
          {reports.length === 0 && <p className="text-paper/50 text-sm">No pending reports</p>}
          {reports.map(r => (
            <div key={r.id} className="rounded-2xl border border-ember/20 bg-ink-light p-4">
              <p className="font-medium text-sm mb-1">
                {r.reporter?.name || 'User'} reported {r.reported?.name || 'User'}
              </p>
              <p className="text-xs text-paper/50 mb-2">Reason: {r.reason} • {new Date(r.created_at).toLocaleDateString()}</p>
              <div className="flex gap-2">
                <button onClick={() => resolveReport(r.id, 'reviewed')}
                  className="flex-1 rounded-full bg-ember py-2 text-xs font-medium text-ink">
                  Ban reported user
                </button>
                <button onClick={() => resolveReport(r.id, 'dismissed')}
                  className="flex-1 rounded-full border border-paper/20 py-2 text-xs text-paper/50">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Queue */}
      {adminTab === 'verifications' && <div className="mt-8">
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
      </div>}
    </div>
  )
}
