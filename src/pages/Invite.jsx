import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { BottomNav } from './Matches.jsx'

const REWARD_THRESHOLD = 3 // verified referrals needed for reward
const REWARD_DAYS = 7

export default function Invite() {
  const navigate = useNavigate()
  const [myId, setMyId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      // Get or create invite code
      let { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (!prof.invite_code) {
        const code = user.id.replace(/-/g, '').substring(0, 8).toUpperCase()
        await supabase.from('profiles').update({ invite_code: code }).eq('id', user.id)
        prof = { ...prof, invite_code: code }
      }
      setProfile(prof)

      // Get referrals with referred user profiles
      const { data: refs } = await supabase
        .from('referrals')
        .select('id, status, created_at, referred_id')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (refs?.length) {
        const enriched = await Promise.all(refs.map(async (r) => {
          const { data: p } = await supabase
            .from('profiles')
            .select('name, photo_url, verified')
            .eq('id', r.referred_id)
            .single()
          return { ...r, referred: p }
        }))
        setReferrals(enriched)
      } else {
        setReferrals([])
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  const inviteLink = `https://nearby-dating-app.vercel.app/join?ref=${profile?.invite_code}`
  const verifiedCount = referrals.filter(r => r.status === 'verified' || r.status === 'rewarded').length
  const progress = Math.min(verifiedCount, REWARD_THRESHOLD)
  const rewardEarned = verifiedCount >= REWARD_THRESHOLD
  const daysEarned = Math.floor(verifiedCount / REWARD_THRESHOLD) * REWARD_DAYS

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToWhatsApp = () => {
    const text = `Hey! I'm on Nearby — a dating app where every profile is face-verified (no fakes 🔒). Join me here: ${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareToInstagram = () => {
    // Copy link since Instagram doesn't support direct URL sharing
    copyLink()
    alert('Link copied! Paste it in your Instagram bio or story.')
  }

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on Nearby',
        text: 'A dating app where every profile is face-verified. No fakes, just real connections.',
        url: inviteLink,
      })
    } else {
      setShowShareSheet(true)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <p className="text-paper/50">Loading...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper pb-28">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-paper/50 text-sm mb-4 block">← Back</button>
        <h1 className="font-display text-3xl">Invite Friends</h1>
        <p className="mt-1 text-paper/50 text-sm">Help Nearby grow with real, verified people</p>
      </div>

      {/* Reward card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #E8734A 0%, #D4A144 100%)' }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-ink/70 text-sm font-medium">YOUR REWARD</p>
              <p className="font-display text-2xl text-ink mt-1">
                Invite {REWARD_THRESHOLD} verified friends
              </p>
              <p className="text-ink font-medium mt-0.5">
                → Get {REWARD_DAYS} days Nearby Plus FREE ⚡
              </p>
            </div>
            <div className="text-4xl">🎁</div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-ink/70 mb-2">
              <span>{verifiedCount} verified friend{verifiedCount !== 1 ? 's' : ''}</span>
              <span>{REWARD_THRESHOLD} needed</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-ink/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-ink/60"
                initial={{ width: 0 }}
                animate={{ width: `${(progress / REWARD_THRESHOLD) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {Array.from({ length: REWARD_THRESHOLD }).map((_, i) => (
                <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  i < progress ? 'border-ink/60 bg-ink/60 text-paper' : 'border-ink/30 bg-transparent text-ink/40'
                }`}>
                  {i < progress ? '✓' : i + 1}
                </div>
              ))}
            </div>
          </div>

          {rewardEarned && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-2xl bg-ink/20 px-4 py-3 text-center"
            >
              <p className="font-medium text-ink">🎉 Reward earned! {daysEarned} days Plus activated</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Invite code */}
      <div className="mx-5 mt-5 rounded-2xl border border-paper/10 bg-ink-light p-5">
        <p className="text-xs text-paper/40 mb-2 font-medium tracking-wide">YOUR INVITE CODE</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-3xl tracking-widest text-ember">
            {profile?.invite_code}
          </span>
          <button onClick={copyLink}
            className="rounded-full border border-paper/20 px-4 py-2 text-sm text-paper/70 transition-colors hover:border-ember hover:text-ember">
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink px-3 py-2">
          <p className="flex-1 truncate text-xs text-paper/40">{inviteLink}</p>
          <button onClick={copyLink} className="text-xs text-ember shrink-0">Copy link</button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mx-5 mt-4 space-y-3">
        <button onClick={shareNative}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-ember py-4 font-medium text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" />
            <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
          </svg>
          Share invite link
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={shareToWhatsApp}
            className="flex items-center justify-center gap-2 rounded-2xl border border-paper/15 bg-ink-light py-3.5 text-sm font-medium text-paper">
            <span className="text-xl">💬</span>
            WhatsApp
          </button>
          <button onClick={shareToInstagram}
            className="flex items-center justify-center gap-2 rounded-2xl border border-paper/15 bg-ink-light py-3.5 text-sm font-medium text-paper">
            <span className="text-xl">📸</span>
            Instagram
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-5 mt-5 rounded-2xl border border-paper/10 bg-ink-light p-5">
        <p className="font-medium mb-4">How it works</p>
        <div className="space-y-4">
          {[
            { icon: '🔗', step: 'Share your link', detail: 'Send your unique invite link to friends' },
            { icon: '📱', step: 'They sign up', detail: 'Friend joins Nearby using your link' },
            { icon: '✅', step: 'They get verified', detail: 'Face verification must be approved' },
            { icon: '🎁', step: 'You get rewarded', detail: `${REWARD_THRESHOLD} verified = ${REWARD_DAYS} days Plus free` },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper/8 text-lg">
                {item.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{item.step}</p>
                <p className="text-xs text-paper/50 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      {referrals.length > 0 && (
        <div className="mx-5 mt-5">
          <p className="font-medium mb-3">Friends you invited ({referrals.length})</p>
          <div className="space-y-2">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center gap-3 rounded-2xl border border-paper/10 bg-ink-light px-4 py-3">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-ink shrink-0">
                  {ref.referred?.photo_url && (
                    <img src={ref.referred.photo_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{ref.referred?.name || 'Friend'}</p>
                  <p className="text-xs text-paper/50">
                    {ref.status === 'verified' || ref.status === 'rewarded' ? '✅ Verified' : '⏳ Pending verification'}
                  </p>
                </div>
                <span className={`text-xs rounded-full px-2 py-1 ${
                  ref.status === 'verified' || ref.status === 'rewarded'
                    ? 'bg-sage/15 text-sage'
                    : 'bg-paper/10 text-paper/40'
                }`}>
                  {ref.status === 'verified' || ref.status === 'rewarded' ? '+1 ✓' : 'pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav active="invite" />
    </div>
  )
}
