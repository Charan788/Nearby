import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileCard from '../components/ProfileCard.jsx'
import MatchModal from '../components/MatchModal.jsx'
import { supabase } from '../lib/supabase.js'

// Shown if Supabase isn't configured yet, so the UI is demoable standalone.
const SAMPLE_PROFILES = [
  { id: '1', name: 'Ananya', age: 21, bio: 'Design student, plays badminton badly', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600', verified: true },
  { id: '2', name: 'Rhea', age: 22, bio: 'Coffee snob, weekend trekker', photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=600', verified: true },
  { id: '3', name: 'Meera', age: 20, bio: 'CS major, plays chess', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600', verified: true },
]

export default function Discover() {
  const [profiles, setProfiles] = useState([])
  const [matchedProfile, setMatchedProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, bio, photo_url, verified')
        .eq('verified', true)
        .limit(20)

      if (error || !data?.length) {
        setProfiles(SAMPLE_PROFILES) // fallback so the screen isn't empty pre-backend
        return
      }
      setProfiles(data.map((p) => ({ ...p, photoUrl: p.photo_url })))
    }
    fetchProfiles()
  }, [])

  const handleSwipe = useCallback(
    async (direction) => {
      const swiped = profiles[0]
      setProfiles((prev) => prev.slice(1))

      if (direction === 'like') {
        // In production: write the like to Supabase, then check if the
        // other person already liked you back -> that's a match.
        const isMutualDemo = Math.random() > 0.6
        if (isMutualDemo) setMatchedProfile(swiped)
      }
    },
    [profiles]
  )

  return (
    <div className="flex min-h-screen flex-col items-center bg-ink px-6 py-10 text-paper">
      <h1 className="font-display text-2xl">Discover</h1>

      <div className="relative mt-8 h-[480px] w-full max-w-sm">
        {profiles.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-paper/50">
            <p className="font-display text-xl text-paper">That's everyone for now</p>
            <p className="mt-2 text-sm">Check back later for more verified profiles.</p>
          </div>
        )}
        {profiles
          .slice(0, 2)
          .reverse()
          .map((profile, i, arr) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isTop={i === arr.length - 1}
              onSwipe={handleSwipe}
            />
          ))}
      </div>

      {profiles.length > 0 && (
        <div className="mt-8 flex gap-6">
          <button
            onClick={() => handleSwipe('pass')}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-paper/20 text-ember"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            onClick={() => handleSwipe('like')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ember text-ink"
            aria-label="Like"
          >
            ♥
          </button>
        </div>
      )}

      <MatchModal
        profile={matchedProfile}
        onClose={() => setMatchedProfile(null)}
        onSendMessage={() => navigate(`/chat/demo-${matchedProfile.id}`)}
      />
    </div>
  )
}
