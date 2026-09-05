import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { BottomNav } from './Matches.jsx'

export default function Chat() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [myId, setMyId] = useState(null)
  const [partner, setPartner] = useState(null)
  const [partnerId, setPartnerId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      const { data: match } = await supabase
        .from('matches').select('user_a, user_b').eq('id', matchId).single()
      if (!match) { navigate('/matches'); return }

      const pId = match.user_a === user.id ? match.user_b : match.user_a
      setPartnerId(pId)

      const { data: partnerProfile } = await supabase
        .from('profiles').select('name, photo_url, verified, online_at').eq('id', pId).single()
      setPartner(partnerProfile)

      // Check online status (online if last seen within 3 minutes)
      if (partnerProfile?.online_at) {
        const diff = Date.now() - new Date(partnerProfile.online_at).getTime()
        setPartnerOnline(diff < 3 * 60 * 1000)
      }

      const { data: history } = await supabase
        .from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
      setMessages(history ?? [])
      setLoading(false)

      // Update my online_at
      await supabase.from('profiles').update({ online_at: new Date().toISOString() }).eq('id', user.id)
    }
    init()
  }, [matchId, navigate])

  // Realtime messages
  useEffect(() => {
    const channel = supabase.channel(`match-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [matchId])

  // Realtime partner online status
  useEffect(() => {
    if (!partnerId) return
    const channel = supabase.channel(`presence-${partnerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${partnerId}` },
        (payload) => {
          if (payload.new?.online_at) {
            const diff = Date.now() - new Date(payload.new.online_at).getTime()
            setPartnerOnline(diff < 3 * 60 * 1000)
          }
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [partnerId])

  // Heartbeat — update online_at every 60s while in chat
  useEffect(() => {
    if (!myId) return
    const interval = setInterval(async () => {
      await supabase.from('profiles').update({ online_at: new Date().toISOString() }).eq('id', myId)
    }, 60000)
    return () => clearInterval(interval)
  }, [myId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!draft.trim() || !myId) return
    const text = draft.trim()
    setDraft('')
    await supabase.from('messages').insert({ match_id: matchId, sender_id: myId, text })
  }

  const handleBlock = async () => {
    if (!window.confirm(`Block this user? You won't see each other anymore.`)) return
    await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: partnerId })
    navigate('/matches')
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ink"><p className="text-paper/50">Loading...</p></div>
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      <header className="flex items-center gap-3 border-b border-paper/10 px-4 py-3">
        <button onClick={() => navigate('/matches')} className="text-paper/60 hover:text-paper p-1">←</button>
        <div className="relative h-10 w-10 overflow-hidden rounded-full bg-paper-dim shrink-0">
          {partner?.photo_url && <img src={partner.photo_url} alt={partner.name} className="h-full w-full object-cover" />}
          {partnerOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink bg-sage" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-display leading-none">{partner?.name ?? 'Match'}</p>
            {partner?.verified && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#D4A144"><path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" /></svg>
            )}
          </div>
          <p className="mt-0.5 text-xs text-paper/40">{partnerOnline ? 'Online now' : 'Offline'}</p>
        </div>
        <button onClick={() => setShowReport(true)} className="p-2 text-paper/30 hover:text-ember transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-paper/40 mt-8">You matched! Say hi 👋</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.sender_id === myId ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender_id === myId ? 'bg-ember text-ink rounded-br-sm' : 'bg-ink-light text-paper rounded-bl-sm'
              }`}>
                {m.text}
                <p className={`mt-1 text-[10px] ${m.sender_id === myId ? 'text-ink/50' : 'text-paper/30'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-paper/10 p-3">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-paper/15 bg-ink-light px-4 py-2.5 outline-none placeholder:text-paper/30 focus:border-ember transition-colors text-sm" />
        <button onClick={send} disabled={!draft.trim()}
          className="rounded-full bg-ember px-5 py-2.5 font-medium text-ink disabled:opacity-40 transition-opacity text-sm">
          Send
        </button>
      </div>

      {/* Report/Block modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 px-4 pb-8"
            onClick={() => setShowReport(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="w-full max-w-sm rounded-2xl bg-ink-light overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-paper/10">
                <p className="font-display text-lg text-center">Options</p>
              </div>
              <ReportOptions
                myId={myId}
                partnerId={partnerId}
                matchId={matchId}
                onBlock={handleBlock}
                onClose={() => setShowReport(false)}
                navigate={navigate}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReportOptions({ myId, partnerId, matchId, onBlock, onClose, navigate }) {
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)

  const reasons = ['Fake profile', 'Inappropriate behavior', 'Harassment', 'Spam', 'Underage', 'Other']

  const submitReport = async () => {
    if (!reason) return
    await supabase.from('reports').insert({
      reporter_id: myId,
      reported_id: partnerId,
      match_id: matchId,
      reason,
    })
    setDone(true)
    setTimeout(() => { onClose(); navigate('/matches') }, 1500)
  }

  if (done) {
    return <p className="p-6 text-center text-sage">Report submitted. Thank you.</p>
  }

  if (reporting) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-paper/60 mb-2">What's the issue?</p>
        {reasons.map(r => (
          <button key={r} onClick={() => setReason(r)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${reason === r ? 'border-ember bg-ember/10 text-ember' : 'border-paper/10 text-paper/70'}`}>
            {r}
          </button>
        ))}
        <button onClick={submitReport} disabled={!reason}
          className="mt-2 w-full rounded-full bg-ember py-3 text-sm font-medium text-ink disabled:opacity-40">
          Submit report
        </button>
        <button onClick={() => setReporting(false)} className="w-full text-sm text-paper/40 py-2">Cancel</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => setReporting(true)}
        className="flex w-full items-center gap-3 px-4 py-4 text-ember hover:bg-ember/5 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round" />
        </svg>
        Report this person
      </button>
      <button onClick={onBlock}
        className="flex w-full items-center gap-3 px-4 py-4 text-ember border-t border-paper/10 hover:bg-ember/5 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round" />
        </svg>
        Block this person
      </button>
      <button onClick={onClose}
        className="w-full py-4 text-sm text-paper/40 border-t border-paper/10">
        Cancel
      </button>
    </div>
  )
}
