import { motion, useMotionValue, useTransform } from 'framer-motion'

export default function ProfileCard({ profile, onSwipe, isTop }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const likeOpacity = useTransform(x, [20, 120], [0, 1])
  const passOpacity = useTransform(x, [-120, -20], [1, 0])

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onSwipe('like')
        else if (info.offset.x < -120) onSwipe('pass')
      }}
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 12 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 12 }}
      transition={{ duration: 0.25 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-paper-dim shadow-2xl">
        <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />

        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-8 left-6 rotate-[-12deg] rounded-lg border-4 border-sage px-4 py-1 text-2xl font-bold text-sage"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute top-8 right-6 rotate-[12deg] rounded-lg border-4 border-ember px-4 py-1 text-2xl font-bold text-ember"
            >
              PASS
            </motion.div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-6 pt-16">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl text-paper">
              {profile.name}, {profile.age}
            </h2>
            {profile.verified && (
              <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
                </svg>
                Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-paper/70">{profile.bio}</p>
        </div>
      </div>
    </motion.div>
  )
}
