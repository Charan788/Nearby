import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function MatchAnimation({ profile, myPhoto, onClose }) {
  const navigate = useNavigate()

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * -400 - 50,
    rotate: Math.random() * 360,
    scale: Math.random() * 0.8 + 0.4,
    color: i % 3 === 0 ? '#E8734A' : i % 3 === 1 ? '#D4A144' : '#4F9D69',
  }))

  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, #2A1535 0%, #1B1523 70%)' }}
        >
          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute bottom-1/2 left-1/2 h-3 w-3 rounded-full"
              style={{ backgroundColor: p.color }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: p.scale, opacity: 0, rotate: p.rotate }}
              transition={{ duration: 1.2, delay: 0.3 + Math.random() * 0.3, ease: 'easeOut' }}
            />
          ))}

          {/* Pulse ring */}
          <motion.div
            className="absolute rounded-full border-2 border-ember/30"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 600, height: 600, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />

          {/* Photos colliding */}
          <div className="flex items-center gap-0 mb-8">
            <motion.div
              initial={{ x: -120, opacity: 0, rotate: -8 }}
              animate={{ x: 0, opacity: 1, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="h-28 w-28 overflow-hidden rounded-full border-4 border-paper/20 shadow-2xl"
            >
              {myPhoto
                ? <img src={myPhoto} alt="You" className="h-full w-full object-cover" />
                : <div className="h-full w-full bg-ink-light" />}
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="z-10 -mx-4 text-3xl"
            >
              💫
            </motion.div>

            <motion.div
              initial={{ x: 120, opacity: 0, rotate: 8 }}
              animate={{ x: 0, opacity: 1, rotate: 8 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="h-28 w-28 overflow-hidden rounded-full border-4 border-ember/40 shadow-2xl"
            >
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
                : <div className="h-full w-full bg-ink-light" />}
            </motion.div>
          </div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center px-8"
          >
            <p className="font-display text-sm tracking-[0.3em] text-ember/70 uppercase mb-2">You Two</p>
            <h1 className="font-display text-5xl text-paper mb-2">Vibe</h1>
            {profile.vibeScore && (
              <p className="font-display text-2xl text-ember mb-2">{profile.vibeScore}% Match ✨</p>
            )}
            {profile.vibeShared?.length > 0 && (
              <p className="text-sm text-paper/50 mt-2">
                You both love {profile.vibeShared[0]}
              </p>
            )}
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-10 flex flex-col gap-3 w-full max-w-xs px-6"
          >
            <button
              onClick={() => navigate(`/chat/${profile.matchId}`)}
              className="w-full rounded-full bg-ember py-4 font-medium text-ink text-lg"
            >
              Say Hello 👋
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-full border border-paper/20 py-3 text-sm text-paper/60"
            >
              Keep browsing
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
