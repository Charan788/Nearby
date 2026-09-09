import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import SwipeCard from '../components/SwipeCard.jsx'
import MatchAnimation from '../components/MatchAnimation.jsx'
import DailyVibe from '../components/DailyVibe.jsx'
import { BottomNav } from './Matches.jsx'
import { supabase } from '../lib/supabase.js'
import { calculateVibeMatch } from '../lib/vibeMatch.js'

export default function Discover() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [matchedProfile, setMatchedProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myProfile, setMyProfile] = useState(null)
  const [myId, setMyId] = useState(null)
  const [myAnswers, setMyAnswers] = useState([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMyProfile(me)
      if (!me?.verified) { setLoading(false); return }

      // My vibe answers
      const { data: myVibeAnswers } = await supabase
        .from('vibe_answers').select('*').eq('user_id', user.id)
      setMyAnswers(myVibeAnswers || [])

      // Already swiped IDs
      const { data: swipes } = await supabase
        .from('swipes').select('swiped_id').eq('swiper_id', user.id)
      const alreadySwiped = new Set((swipes ?? []).map(s => s.swiped_id))

      // Blocked IDs
      const { data: blocks } = await supabase
        .from('blocks').select('blocked_id').eq('blocker_id', user.id)
      const blockedIds = new Set((blocks ?? []).map(b => b.blocked_id))

      const oppositeGender = me.gender === 'Man' ? 'Woman' : 'Man'
      const { data } = await supabase
        .from('profiles')
        .select('id, name, age, bio, photo_url, verified, gender')
        .eq('verified', true)
        .eq('gender', oppositeGender)
        .neq('id', user.id)
        .limit(30)

      const fresh = (data ?? []).filter(p => !alreadySwiped.has(p.id) && !blockedIds.has(p.id))

      // Calculate vibe scores
      const withVibe = await Promise.all(fresh.map(async (p) => {
        const { data: theirAnswers } = await supabase
          .from('vibe_answers').select('*').eq('user_id', p.id)
        const vibe = calculateVibeMatch(myVibeAnswers || [], theirAnswers || [])
        return { ...p, photoUrl: p.photo_url, vibeScore: vibe.score, vibeShared: vibe.shared }
      }))

      // Sort by vibe score — highest first
      withVibe.sort((a, b) => b.vibeScore - a.vibeScore)
      setProfiles(withVibe)
      setLoading(false)
    }
    init()
  }, [navigate])

  const handleSwipe = useCallback(async (direction) => {
    const swiped = profiles[0]
    if (!swiped) return
    setProfiles(prev => prev.slice(1))

    await supabase.from('swipes').insert({
      swiper_id: myId,
      swiped_id: swiped.id,
      direction,
    })

    if (direction === 'like') {
      const { data: theirSwipe } = await supabase
        .from('swipes').select('id')
        .eq('swiper_id', swiped.id).eq('swiped_id', myId).eq('direction', 'like')
        .maybeSingle()

      if (theirSwipe) {
        const { data: match } = await supabase
          .from('matches').select('id')
          .or(`and(user_a.eq.${myId},user_b.eq.${swiped.id}),and(user_a.eq.${swiped.id},user_b.eq.${myId})`)
          .maybeSingle()
        setMatchedProfile({
          ...swiped,
          matchId: match?.id,
          vibeScore: swiped.vibeScore,
          vibeShared: swiped.vibeShared,
        })
      }
    }
  }, [profiles, myId])

  const handleSuperLike = useCallback(async () => {
    const swiped = profiles[0]
    if (!swiped || !myId) return

    // Check daily limit (3 for free, unlimited for plus/gold)
    const today = new Date(); today.setHours(0,0,0,0)
    const { count } = await supabase
      .from('super_likes')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', myId)
      .gte('created_at', today.toISOString())

    const myPlan = await supabase.from('profiles').select('plan').eq('id', myId).single()
    const isPremium = myPlan?.data?.plan === 'plus' || myPlan?.data?.plan === 'gold'

    if (!isPremium && count >= 3) {
      alert('You\'ve used your 3 free super likes today. Upgrade to Plus for unlimited!')
      return
    }

    // Send super like
    await supabase.from('super_likes').upsert({
      sender_id: myId,
      receiver_id: swiped.id,
    })

    // Also register as a like in swipes
    await supabase.from('swipes').upsert({
      swiper_id: myId,
      swiped_id: swiped.id,
      direction: 'like',
    })

    // Remove from stack with animation
    setProfiles(prev => prev.slice(1))

    // Check for mutual match
    const { data: theirSwipe } = await supabase
      .from('swipes').select('id')
      .eq('swiper_id', swiped.id).eq('swiped_id', myId).eq('direction', 'like')
      .maybeSingle()

    if (theirSwipe) {
      const { data: match } = await supabase
        .from('matches').select('id')
        .or(`and(user_a.eq.${myId},user_b.eq.${swiped.id}),and(user_a.eq.${swiped.id},user_b.eq.${myId})`)
        .maybeSingle()
      setMatchedProfile({ ...swiped, matchId: match?.id })
    }
  }, [profiles, myId])

  const handleButtonSwipe = (dir) => {
    if (profiles.length > 0) handleSwipe(dir)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
        <p className="text-paper/40 text-sm">Finding your matches...</p>
      </div>
    </div>
  )

  if (!myProfile?.verified) return (
    <div className="flex min-h-screen flex-col bg-ink">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" fill="currentColor" />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-paper">Pending verification</h2>
        <p className="mt-3 max-w-sm text-paper/60 text-sm">
          Your profile is in review. You'll be able to browse once approved — usually a few hours.
        </p>
        <button onClick={() => navigate('/profile/edit')}
          className="mt-6 rounded-full border border-paper/20 px-6 py-2.5 text-sm text-paper/70">
          Edit profile
        </button>
      </div>
      <BottomNav active="discover" />
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-ink text-paper overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 shrink-0">
        <img src="/logo.png" alt="Nearby" className="h-9 w-9 rounded-xl" />
        <button onClick={() => navigate('/profile/edit')}
          className="h-9 w-9 overflow-hidden rounded-full border-2 border-paper/20">
          {myProfile?.photo_url
            ? <img src={myProfile.photo_url} alt="Me" className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-ink-light" />}
        </button>
      </div>

      {/* Daily Vibe */}
      <DailyVibe userId={myId} onAnswer={() => {}} />

      {/* Card stack — takes remaining space */}
      <div className="relative flex-1 mx-4 mb-4">
        {profiles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center rounded-3xl border border-paper/10 bg-ink-light">
            <p className="text-5xl mb-4">🌙</p>
            <p className="font-display text-xl text-paper">You've seen everyone</p>
            <p className="mt-2 text-sm text-paper/50 max-w-xs">
              New verified profiles show up daily. Check back tomorrow!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {profiles.slice(0, 3).reverse().map((profile, i, arr) => (
              <SwipeCard
                key={profile.id}
                profile={profile}
                isTop={i === arr.length - 1}
                onSwipe={handleSwipe}
                vibeScore={i === arr.length - 1 ? profile.vibeScore : null}
                vibeShared={i === arr.length - 1 ? profile.vibeShared : null}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Action buttons */}
      {profiles.length > 0 && (
        <div className="flex items-center justify-center gap-5 pb-4 shrink-0">
          <button onClick={() => handleButtonSwipe('pass')}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ember/30 bg-ink text-ember text-xl shadow-lg active:scale-95 transition-transform">
            ✕
          </button>
          <button onClick={() => handleButtonSwipe('pass')}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-paper/15 bg-ink text-paper/50 text-lg active:scale-95 transition-transform">
            ↶
          </button>
          <button onClick={() => handleButtonSwipe('like')}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-ember text-ink text-2xl shadow-lg shadow-ember/30 active:scale-95 transition-transform">
            ♥
          </button>
          <button
            onClick={() => handleSuperLike()}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-400/30 bg-ink text-blue-400 text-lg active:scale-95 transition-transform"
            title="Super Like"
          >
            ⭐
          </button>
        </div>
      )}

      <BottomNav active="discover" />

      {/* Match animation */}
      <AnimatePresence>
        {matchedProfile && (
          <MatchAnimation
            profile={matchedProfile}
            myPhoto={myProfile?.photo_url}
            onClose={() => setMatchedProfile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
