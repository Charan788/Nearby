import { motion, AnimatePresence } from 'framer-motion'

export default function MatchModal({ profile, onClose, onSendMessage }) {
  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-sm tracking-wide text-gold">It's a match</p>
            <h2 className="mt-2 font-display text-4xl text-paper">You and {profile.name}</h2>
            <div className="mt-8 flex justify-center">
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="h-32 w-32 rounded-full border-4 border-paper/20 object-cover"
              />
            </div>
            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={onSendMessage}
                className="rounded-full bg-ember px-8 py-3 font-medium text-ink"
              >
                Say hi
              </button>
              <button onClick={onClose} className="text-sm text-paper/50">
                Keep browsing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
