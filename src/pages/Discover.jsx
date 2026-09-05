import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ProfileCard from '../components/ProfileCard.jsx'
import MatchModal from '../components/MatchModal.jsx'
import { supabase } from '../lib/supabase.js'
import { BottomNav } from './Matches.jsx'

export default function Discover() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [matchedProfile, setMatchedProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myProfile, setMyProfile] = useState(null)
  const [swipedIds, setSwipedIds] = useState(new Set())

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }

      // Load my profile
      const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMyProfile(me)

      if (!me?.verified) {
        setLoading(false)
        return
      }

      // Load already-swiped IDs so we don't show them again
      const { data: swipes } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
      const alreadySwiped = new Set((swipes ?? []).map(s => s.swiped_id))
      setSwipedIds(alreadySwiped)

      // Load opposite gender verified profiles, excluding already swiped
      const oppositeGender = me.gender === 'Man' ? 'Woman' : 'Man'
      const { data } = await supabase
        .from('profiles')
        .select('id, name, age, bio, photo_url, verified, gender')
        .eq('verified', true)
        .eq('gender', oppositeGender)
        .neq('id', user.id)
        .limit(30)

      const fresh = (data ?? []).filter(p => !alreadySwiped.has(p.id))
      setProfiles(fresh.map(p => ({ ...p, photoUrl: p.photo_url })))
      setLoading(false)
    }
    init()
  }, [navigate])

  const handleSwipe = useCallback(async (direction) => {
    const swiped = profiles[0]
    if (!swiped) return
    setProfiles(prev => prev.slice(1))

    const { data: { user } } = await supabase.auth.getUser()

    // Save swipe to DB
    await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: swiped.id,
      direction,
    })

    if (direction === 'like') {
      // Check if they already liked us back -> mutual match
      const { data: theirSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', swiped.id)
        .eq('swiped_id', user.id)
        .eq('direction', 'like')
        .maybeSingle()

      if (theirSwipe) {
        // It's a match — create match row
        const { data: match } = await supabase
          .from('matches')
          .insert({ user_a: user.id, user_b: swiped.id })
          .select()
          .single()
        setMatchedProfile({ ...swiped, matchId: match?.id })
      }
    }
  }, [profiles])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-paper/50">Loading...</p>
      </div>
    )
  }

  // Not verified yet
  if (!myProfile?.verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" fill="currentColor" />
          </svg>
        </div>
        <h2 className="mt-6 font-display text-2xl text-paper">Pending verification</h2>
        <p className="mt-3 max-w-sm text-paper/60">
          Your profile is in the review queue. You'll be able to browse once a moderator approves your selfie — usually within a few hours.
        </p>
        <button
          onClick={() => navigate('/profile/edit')}
          className="mt-8 rounded-full border border-paper/20 px-6 py-2.5 text-sm text-paper/70"
        >
          Edit profile while you wait
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-ink px-6 py-8 text-paper">
      {/* Top bar */}
      <div className="flex w-full max-w-sm items-center justify-between">
        <h1 className="font-display text-2xl">Discover</h1>
        <button
          onClick={() => navigate('/profile/edit')}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-paper/20 bg-ink-light"
        >
          {myProfile?.photo_url
            ? <img src={myProfile.photo_url} alt="Me" className="h-full w-full object-cover" />
            : <span className="text-paper/40 text-xs">Me</span>}
        </button>
      </div>

      {/* Card stack */}
      <div className="relative mt-6 h-[480px] w-full max-w-sm">
        <AnimatePresence>
          {profiles.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-paper/50">
              <p className="font-display text-xl text-paper">You've seen everyone</p>
              <p className="mt-2 text-sm">Check back later for new verified profiles.</p>
            </div>
          )}
          {profiles.slice(0, 2).reverse().map((profile, i, arr) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isTop={i === arr.length - 1}
              onSwipe={handleSwipe}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      {profiles.length > 0 && (
        <div className="mt-8 flex gap-6">
          <button
            onClick={() => handleSwipe('pass')}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-paper/20 text-2xl text-ember hover:border-ember transition-colors"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            onClick={() => handleSwipe('like')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ember text-2xl text-ink hover:bg-ember-dark transition-colors"
            aria-label="Like"
          >
            ♥
          </button>
        </div>
      )}

      <MatchModal
        profile={matchedProfile}
        onClose={() => setMatchedProfile(null)}
        onSendMessage={() => {
          navigate(`/chat/${matchedProfile.matchId}`)
          setMatchedProfile(null)
        }}
      />
      <BottomNav active="discover" />
    </div>
  )
}
