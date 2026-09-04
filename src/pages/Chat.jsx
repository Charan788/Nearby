import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'

export default function Chat() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { id: 1, from: 'them', text: 'Hey! Nice to match with you 👋' },
  ])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // In production: subscribe to Supabase realtime changes on the
    // messages table filtered by match_id, and load message history.
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [matchId])

  const send = () => {
    if (!draft.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text: draft }])
    setDraft('')
    // In production: insert into Supabase `messages` table here.
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      <header className="flex items-center gap-3 border-b border-paper/10 px-4 py-4">
        <button onClick={() => navigate('/discover')} className="text-paper/60">
          ←
        </button>
        <div className="h-9 w-9 rounded-full bg-paper-dim" />
        <div>
          <p className="font-display leading-none">Match</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-gold">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
            </svg>
            Verified
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.from === 'me' ? 'bg-ember text-ink' : 'bg-ink-light text-paper'
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-paper/10 p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message"
          className="flex-1 rounded-full border border-paper/15 bg-ink-light px-4 py-2 outline-none placeholder:text-paper/30 focus:border-ember"
        />
        <button onClick={send} className="rounded-full bg-ember px-5 py-2 font-medium text-ink">
          Send
        </button>
      </div>
    </div>
  )
}
