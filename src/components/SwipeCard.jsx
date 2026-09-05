import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import VibeMatchCard from './VibeMatchCard.jsx'

export default function SwipeCard({ profile, isTop, onSwipe, vibeScore, vibeShared }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-250, 250], [-18, 18])
  const likeOpacity = useTransform(x, [30, 140], [0, 1])
  const passOpacity = useTransform(x, [-140, -30], [1, 0])
  const cardScale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95])
  const [showVibe, setShowVibe] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const handleDragEnd = (_, info) => {
    const threshold = 120
    if (info.offset.x > threshold) {
      flyOut('right')
    } else if (info.offset.x < -threshold) {
      flyOut('left')
    } else {
      // Spring back
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 })
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 20 })
    }
  }

  const flyOut = (dir) => {
    setLeaving(true)
    animate(x, dir === 'right' ? 500 : -500, {
      duration: 0.35,
      ease: 'easeOut',
      onComplete: () => onSwipe(dir === 'right' ? 'like' : 'pass'),
    })
    animate(y, 60, { duration: 0.35 })
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, scale: isTop ? cardScale : 0.95 }}
      drag={isTop && !showVibe ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 14 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 14 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl">
        {/* Photo */}
        {profile.photoUrl
          ? <img src={profile.photoUrl} alt={profile.name} className="absolute inset-0 h-full w-full object-cover" />
          : <div className="absolute inset-0 bg-ink-light flex items-center justify-center text-paper/20 text-6xl">?</div>}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

        {/* Like/Pass indicators */}
        {isTop && (
          <>
            <motion.div style={{ opacity: likeOpacity }}
              className="absolute top-10 left-6 rotate-[-15deg] rounded-2xl border-4 border-sage px-5 py-2">
              <span className="font-display text-2xl text-sage">LIKE</span>
            </motion.div>
            <motion.div style={{ opacity: passOpacity }}
              className="absolute top-10 right-6 rotate-[15deg] rounded-2xl border-4 border-ember px-5 py-2">
              <span className="font-display text-2xl text-ember">PASS</span>
            </motion.div>
          </>
        )}

        {/* Profile info */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-3xl text-paper">{profile.name}, {profile.age}</h2>
                {profile.verified && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#D4A144">
                    <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
                  </svg>
                )}
              </div>
              {profile.bio && (
                <p className="mt-1 text-sm text-paper/70 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Vibe Match pill */}
          {isTop && vibeScore && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowVibe(true) }}
              className="mt-3 flex items-center gap-2 rounded-full bg-ember/20 backdrop-blur-sm border border-ember/30 px-4 py-2"
            >
              <span className="text-sm">✨</span>
              <span className="font-medium text-ember text-sm">{vibeScore}% Vibe Match</span>
              <span className="text-paper/40 text-xs">→</span>
            </button>
          )}
        </div>

        {/* Vibe Match overlay */}
        <AnimatePresence>
          {showVibe && (
            <VibeMatchCard
              score={vibeScore}
              shared={vibeShared}
              onClose={() => setShowVibe(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
