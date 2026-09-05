import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function VerificationStatus() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null) // null | 'pending' | 'approved' | 'rejected'
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!prof) { navigate('/onboarding'); return }
      setProfile(prof)

      if (prof.verified) {
        // Already approved — go straight to discover
        navigate('/discover')
        return
      }

      // Check verification row status
      const { data: ver } = await supabase
        .from('verifications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setStatus(ver?.status || 'pending')
      setLoading(false)
    }
    check()
  }, [navigate])

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/onboarding')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-paper/50">Checking your status...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-sm w-full"
      >
        {status === 'pending_review' && <PendingScreen profile={profile} onSignOut={signOut} />}
        {status === 'rejected' && <RejectedScreen profile={profile} onSignOut={signOut} onRetry={() => navigate('/onboarding')} />}
      </motion.div>
    </div>
  )
}

function PendingScreen({ profile, onSignOut }) {
  return (
    <>
      {/* Animated pulsing shield */}
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-gold/20"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      <h1 className="mt-6 font-display text-3xl text-paper">
        Verification pending
      </h1>
      <p className="mt-3 text-paper/60">
        Hi {profile?.name} — your selfie is with our moderation team. We review every profile manually to keep the community genuine.
      </p>

      <div className="mt-8 rounded-2xl border border-paper/10 bg-ink-light p-5 text-left space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage text-sm">✓</div>
          <p className="text-sm text-paper/80">Selfie submitted</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage text-sm">✓</div>
          <p className="text-sm text-paper/80">AI liveness check passed</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold text-sm"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ⏳
          </motion.div>
          <p className="text-sm text-paper/80">Human review — usually a few hours</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper/10 text-paper/30 text-sm">○</div>
          <p className="text-sm text-paper/40">Access to Discover & Chat</p>
        </div>
      </div>

      <p className="mt-6 text-sm text-paper/40">
        Come back and refresh this page to check — we'll update your status here once the review is done.
      </p>

      <div className="mt-8 flex flex-col gap-3 w-full">
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-full border border-paper/20 py-3 text-sm text-paper/70 hover:border-paper/40 transition-colors"
        >
          Refresh status
        </button>
        <button onClick={onSignOut} className="text-sm text-paper/30 hover:text-paper/50">
          Sign out
        </button>
      </div>
    </>
  )
}

function RejectedScreen({ profile, onSignOut, onRetry }) {
  return (
    <>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ember/15 text-ember">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <h1 className="mt-6 font-display text-3xl text-paper">Verification failed</h1>
      <p className="mt-3 text-paper/60">
        Hi {profile?.name} — unfortunately your selfie didn't pass our verification. This usually happens when the selfie is unclear, blurry, or doesn't clearly show your face.
      </p>

      <div className="mt-8 rounded-2xl border border-ember/20 bg-ember/5 p-5 text-left space-y-2">
        <p className="text-sm font-medium text-paper">Tips for a successful selfie:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-paper/60">
          <li>• Good lighting — face a window or bright light</li>
          <li>• Look directly at the camera</li>
          <li>• No sunglasses, hats, or heavy filters</li>
          <li>• Just you in the frame, no group photos</li>
          <li>• Make sure your profile photo is also a clear solo shot</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3 w-full">
        <button
          onClick={onRetry}
          className="w-full rounded-full bg-ember py-3 font-medium text-ink"
        >
          Try again
        </button>
        <button onClick={onSignOut} className="text-sm text-paper/30 hover:text-paper/50">
          Sign out
        </button>
      </div>
    </>
  )
}
