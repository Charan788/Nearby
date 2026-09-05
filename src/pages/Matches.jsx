import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function Matches() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      // Get all matches where I'm involved
      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchRows?.length) { setLoading(false); return }

      // Get partner profiles + last message for each match
      const enriched = await Promise.all(matchRows.map(async (match) => {
        const partnerId = match.user_a === user.id ? match.user_b : match.user_a

        const { data: partner } = await supabase
          .from('profiles')
          .select('name, photo_url, verified')
          .eq('id', partnerId)
          .single()

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('text, sender_id, created_at')
          .eq('match_id', match.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Count unread (messages from partner after last seen — simplified)
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', match.id)
          .neq('sender_id', user.id)

        return {
          matchId: match.id,
          partner,
          lastMessage: lastMsg,
          unread: count || 0,
          matchedAt: match.created_at,
        }
      }))

      setMatches(enriched)
      setLoading(false)
    }
    load()
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-paper/10 px-4 py-5">
        <button onClick={() => navigate('/discover')} className="text-paper/50 hover:text-paper">
          ←
        </button>
        <h1 className="font-display text-2xl">Messages</h1>
        <div className="w-8" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <p className="text-paper/40">Loading...</p>
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ember/10 text-ember text-2xl">
              💬
            </div>
            <h2 className="mt-4 font-display text-xl text-paper">No matches yet</h2>
            <p className="mt-2 text-sm text-paper/50">
              When you and someone like each other, they'll appear here.
            </p>
            <button
              onClick={() => navigate('/discover')}
              className="mt-6 rounded-full bg-ember px-6 py-2.5 text-sm font-medium text-ink"
            >
              Go discover
            </button>
          </div>
        )}

        <AnimatePresence>
          {matches.map((m, i) => (
            <motion.button
              key={m.matchId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/chat/${m.matchId}`)}
              className="flex w-full items-center gap-4 border-b border-paper/5 px-4 py-4 text-left hover:bg-ink-light transition-colors"
            >
              {/* Avatar */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-ink-light">
                {m.partner?.photo_url
                  ? <img src={m.partner.photo_url} alt={m.partner.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-paper/30 text-lg">?</div>}
                {m.partner?.verified && (
                  <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-ink">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg leading-tight">{m.partner?.name ?? 'Match'}</p>
                  <p className="text-xs text-paper/30 shrink-0 ml-2">
                    {m.lastMessage
                      ? timeAgo(m.lastMessage.created_at)
                      : timeAgo(m.matchedAt)}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-sm text-paper/50">
                  {m.lastMessage
                    ? (m.lastMessage.sender_id === myId ? 'You: ' : '') + m.lastMessage.text
                    : 'You matched! Say hi 👋'}
                </p>
              </div>

              {/* Unread badge */}
              {m.unread > 0 && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ember text-xs font-medium text-ink">
                  {m.unread > 9 ? '9+' : m.unread}
                </div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <BottomNav active="messages" />
    </div>
  )
}

export function BottomNav({ active }) {
  const navigate = useNavigate()
  return (
    <nav className="flex border-t border-paper/10 bg-ink">
      <button
        onClick={() => navigate('/discover')}
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${active === 'discover' ? 'text-ember' : 'text-paper/40 hover:text-paper/70'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        Discover
      </button>
      <button
        onClick={() => navigate('/matches')}
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${active === 'messages' ? 'text-ember' : 'text-paper/40 hover:text-paper/70'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Messages
      </button>
      <button
        onClick={() => navigate('/profile/edit')}
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${active === 'profile' ? 'text-ember' : 'text-paper/40 hover:text-paper/70'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
        </svg>
        Profile
      </button>
    </nav>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}
