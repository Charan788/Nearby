import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function DailyVibe({ userId, onAnswer }) {
  const [question, setQuestion] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    async function load() {
      if (!userId) return
      // Get today's question
      const { data: q } = await supabase
        .from('vibe_questions')
        .select('*')
        .eq('category', 'daily')
        .order('active_date', { ascending: false })
        .limit(1)
        .single()

      if (!q) return

      // Check if already answered
      const { data: existing } = await supabase
        .from('vibe_answers')
        .select('answer')
        .eq('user_id', userId)
        .eq('question_id', q.id)
        .single()

      if (existing) {
        setAnswered(true)
        setSelectedAnswer(existing.answer)
      }

      setQuestion(q)
    }
    load()
  }, [userId])

  const submitAnswer = async (answer) => {
    setSelectedAnswer(answer)
    setAnswered(true)
    await supabase.from('vibe_answers').upsert({
      user_id: userId,
      question_id: question.id,
      answer,
    })
    onAnswer?.()
    // Hide after 2 seconds
    setTimeout(() => setVisible(false), 2000)
  }

  if (!question || !visible) return null

  const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        className="mx-4 mb-3 rounded-2xl border border-paper/10 bg-ink-light overflow-hidden"
      >
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{question.emoji}</span>
              <div>
                <p className="text-xs text-paper/40 font-medium tracking-wide">TODAY'S VIBE</p>
                <p className="text-sm text-paper font-medium">{question.question}</p>
              </div>
            </div>
            <button onClick={() => setVisible(false)} className="text-paper/20 hover:text-paper/50 text-lg leading-none">×</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-4 pb-4">
          {options.map((opt) => (
            <motion.button
              key={opt}
              onClick={() => !answered && submitAnswer(opt)}
              whileTap={{ scale: 0.96 }}
              className={`rounded-xl px-3 py-2.5 text-xs font-medium text-left transition-all ${
                answered && selectedAnswer === opt
                  ? 'bg-ember text-ink'
                  : answered
                    ? 'bg-paper/5 text-paper/30'
                    : 'bg-paper/8 text-paper/80 hover:bg-paper/15'
              }`}
            >
              {opt}
            </motion.button>
          ))}
        </div>

        {answered && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-3 text-xs text-sage"
          >
            ✓ Added to your vibe profile
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
