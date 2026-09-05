import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { BottomNav } from './Matches.jsx'

export default function Premium() {
  const navigate = useNavigate()
  const [myId, setMyId] = useState(null)
  const [whoLikedMe, setWhoLikedMe] = useState([])
  const [superLikesLeft, setSuperLikesLeft] = useState(3)
  const [boosted, setBoosted] = useState(false)
  const [boostTimeLeft, setBoostTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('likes') // 'likes' | 'features'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      // Who liked me (from swipes table, direction = like, not yet matched)
      const { data: likes } = await supabase
        .from('swipes')
        .select('swiper_id, created_at')
        .eq('swiped_id', user.id)
        .eq('direction', 'like')
      
      if (likes?.length) {
        const profiles = await Promise.all(likes.map(async (l) => {
          const { data: p } = await supabase.from('profiles')
            .select('id, name, age, photo_url, verified')
            .eq('id', l.swiper_id).single()
          return p
        }))
        setWhoLikedMe(profiles.filter(Boolean))
      }

      // Super likes used today
      const today = new Date(); today.setHours(0,0,0,0)
      const { count } = await supabase.from('super_likes')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', today.toISOString())
      setSuperLikesLeft(Math.max(0, 3 - (count || 0)))

      // Active boost
      const { data: boost } = await supabase.from('boosts')
        .select('expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1).single()
      if (boost) {
        setBoosted(true)
        const mins = Math.ceil((new Date(boost.expires_at) - Date.now()) / 60000)
        setBoostTimeLeft(mins)
      }

      setLoading(false)
    }
    load()
  }, [navigate])

  const activateBoost = async () => {
    const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 min boost
    await supabase.from('boosts').insert({ user_id: myId, expires_at: expires.toISOString() })
    setBoosted(true)
    setBoostTimeLeft(30)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <p className="text-paper/50">Loading...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper pb-24">
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-3xl">Premium</h1>
        <p className="mt-1 text-paper/50 text-sm">Stand out and see who wants to meet you</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-6">
        {[['likes', 'Who liked you'], ['features', 'Features']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${tab === id ? 'bg-ember text-ink' : 'border border-paper/15 text-paper/60'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5">
        {tab === 'likes' && (
          <div>
            <p className="mb-4 text-sm text-paper/50">{whoLikedMe.length} people liked your profile</p>
            {whoLikedMe.length === 0 && (
              <div className="rounded-2xl border border-paper/10 bg-ink-light p-10 text-center">
                <p className="text-2xl mb-3">💝</p>
                <p className="font-display text-lg">No likes yet</p>
                <p className="mt-2 text-sm text-paper/50">Keep swiping — your likes will show up here</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {whoLikedMe.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-ink-light">
                  {p.photo_url && <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-3">
                    <p className="font-display text-lg">{p.name}, {p.age}</p>
                    {p.verified && (
                      <span className="flex items-center gap-1 text-xs text-gold mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {tab === 'features' && (
          <div className="space-y-4">
            {/* Super Like */}
            <div className="rounded-2xl border border-paper/10 bg-ink-light p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/15 text-blue-400 text-xl">⭐</div>
                  <div>
                    <p className="font-medium">Super Like</p>
                    <p className="text-xs text-paper/50">Stand out — they'll know you really like them</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl text-blue-400">{superLikesLeft}</p>
                  <p className="text-xs text-paper/40">left today</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-paper/40">3 free super likes per day. Use them on Discover by holding the ♥ button.</p>
            </div>

            {/* Boost */}
            <div className="rounded-2xl border border-paper/10 bg-ink-light p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ember/15 text-ember text-xl">🚀</div>
                  <div>
                    <p className="font-medium">Boost</p>
                    <p className="text-xs text-paper/50">Be the top profile for 30 minutes</p>
                  </div>
                </div>
                {boosted && (
                  <div className="text-right">
                    <p className="font-display text-xl text-sage">{boostTimeLeft}m</p>
                    <p className="text-xs text-paper/40">remaining</p>
                  </div>
                )}
              </div>
              {boosted ? (
                <div className="rounded-xl bg-sage/10 border border-sage/20 px-4 py-2.5 text-center text-sm text-sage">
                  🚀 Boost active — you're being shown first
                </div>
              ) : (
                <button onClick={activateBoost}
                  className="w-full rounded-full bg-ember py-3 text-sm font-medium text-ink">
                  Activate boost (free)
                </button>
              )}
            </div>

            {/* See who liked you card */}
            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold text-xl">💛</div>
                <div>
                  <p className="font-medium">Who liked you</p>
                  <p className="text-xs text-paper/50">{whoLikedMe.length} people are waiting</p>
                </div>
              </div>
              <button onClick={() => setTab('likes')}
                className="w-full rounded-full border border-gold/40 py-2.5 text-sm font-medium text-gold">
                See who liked you →
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav active="premium" />
    </div>
  )
}
