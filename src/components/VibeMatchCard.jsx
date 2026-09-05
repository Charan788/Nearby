import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export default function VibeMatchCard({ score, shared, onClose }) {
  const bars = [
    { label: 'Music', emoji: '🎵', value: Math.min(100, score + 5) },
    { label: 'Lifestyle', emoji: '🌙', value: Math.min(100, score - 3) },
    { label: 'Interests', emoji: '🎮', value: Math.min(100, score - 8) },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute inset-4 z-20 flex flex-col items-center justify-center rounded-3xl bg-ink/95 backdrop-blur-md p-6"
      onClick={onClose}
    >
      <p className="text-sm tracking-widest text-paper/50 uppercase">Your Vibe</p>
      <div className="mt-3 flex items-end gap-1">
        <span className="font-display text-7xl text-ember">{score}</span>
        <span className="mb-3 font-display text-3xl text-ember/60">%</span>
      </div>
      <p className="font-display text-xl text-paper">Match</p>

      <div className="mt-6 w-full space-y-3">
        {bars.map((bar, i) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-paper/70">{bar.emoji} {bar.label}</span>
              <span className="text-xs text-paper/40">{bar.value}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-paper/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-ember"
                initial={{ width: 0 }}
                animate={{ width: `${bar.value}%` }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {shared?.length > 0 && (
        <div className="mt-6 w-full">
          <p className="text-xs text-paper/40 mb-2">You both picked</p>
          <div className="flex flex-wrap gap-2">
            {shared.map((s, i) => (
              <span key={i} className="rounded-full bg-ember/15 px-3 py-1 text-xs text-ember">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-paper/30">Tap anywhere to close</p>
    </motion.div>
  )
}
