import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'

export default function Chat() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [myId, setMyId] = useState(null)
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      // Load match to find partner
      const { data: match } = await supabase
        .from('matches')
        .select('user_a, user_b')
        .eq('id', matchId)
        .single()

      if (!match) { navigate('/discover'); return }

      const partnerId = match.user_a === user.id ? match.user_b : match.user_a
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('name, photo_url, verified')
        .eq('id', partnerId)
        .single()
      setPartner(partnerProfile)

      // Load message history
      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
      setMessages(history ?? [])
      setLoading(false)
    }
    init()
  }, [matchId, navigate])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [matchId])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!draft.trim() || !myId) return
    const text = draft.trim()
    setDraft('')
    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: myId,
      text,
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-paper/50">Loading chat...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-paper/10 px-4 py-4">
        <button onClick={() => navigate('/discover')} className="text-paper/60 hover:text-paper">
          ←
        </button>
        <div className="h-9 w-9 overflow-hidden rounded-full bg-paper-dim">
          {partner?.photo_url && (
            <img src={partner.photo_url} alt={partner.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-display leading-none">{partner?.name ?? 'Match'}</p>
          {partner?.verified && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gold">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
              </svg>
              Verified
            </p>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-paper/40 mt-8">
            You matched! Say hi 👋
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.sender_id === myId ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender_id === myId
                  ? 'bg-ember text-ink rounded-br-sm'
                  : 'bg-ink-light text-paper rounded-bl-sm'
              }`}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-paper/10 p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-paper/15 bg-ink-light px-4 py-2.5 outline-none placeholder:text-paper/30 focus:border-ember transition-colors"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-full bg-ember px-5 py-2.5 font-medium text-ink disabled:opacity-40 transition-opacity"
        >
          Send
        </button>
      </div>
    </div>
  )
}