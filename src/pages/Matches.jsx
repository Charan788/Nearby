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

  const tabs = [
    {
      id: 'discover',
      label: 'Discover',
      path: '/discover',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7.5" />
          <path d="m20.5 20.5-3.5-3.5" />
        </svg>
      ),
    },
    {
      id: 'messages',
      label: 'Messages',
      path: '/matches',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
        </svg>
      ),
    },
    {
      id: 'premium',
      label: 'Premium',
      path: '/premium',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: 'invite',
      label: 'Invite',
      path: '/invite',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile/edit',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ]

  return (
    <div className="sticky bottom-0 border-t border-paper/10 bg-ink/95 backdrop-blur-md">
      <nav className="flex w-full items-center justify-around py-2 px-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-1 flex-col items-center gap-1 py-1.5 rounded-xl transition-all min-w-0"
            >
              <div className={`transition-colors ${isActive ? 'text-ember' : 'text-paper/35'}`}>
                {tab.icon}
              </div>
              <span className={`text-[10px] font-medium transition-colors truncate w-full text-center ${isActive ? 'text-ember' : 'text-paper/35'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="h-0.5 w-3 rounded-full bg-ember" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
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
