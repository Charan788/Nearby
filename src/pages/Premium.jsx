import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getUserPlan, canAccessFeature, PLANS } from '../lib/subscription'
import { BottomNav } from './Matches.jsx'

export default function Premium() {
  const navigate = useNavigate()
  const [myId, setMyId] = useState(null)
  const [myPhoto, setMyPhoto] = useState(null)
  const [plan, setPlan] = useState('free')
  const [whoLikedMe, setWhoLikedMe] = useState([])
  const [superLikesLeft, setSuperLikesLeft] = useState(3)
  const [boosted, setBoosted] = useState(false)
  const [boostTimeLeft, setBoostTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('likes')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)

      const userPlan = await getUserPlan(user.id)
      setPlan(userPlan)

      const { data: me } = await supabase.from('profiles').select('photo_url').eq('id', user.id).single()
      setMyPhoto(me?.photo_url)

      // Who liked me
      const { data: likes } = await supabase
        .from('swipes').select('swiper_id, created_at')
        .eq('swiped_id', user.id).eq('direction', 'like')

      if (likes?.length) {
        const profiles = await Promise.all(likes.map(async (l) => {
          const { data: p } = await supabase.from('profiles')
            .select('id, name, age, photo_url, verified').eq('id', l.swiper_id).single()
          return p
        }))
        setWhoLikedMe(profiles.filter(Boolean))
      }

      // Super likes used today
      const today = new Date(); today.setHours(0,0,0,0)
      const { count } = await supabase.from('super_likes')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id).gte('created_at', today.toISOString())
      setSuperLikesLeft(userPlan === 'free' ? Math.max(0, 3 - (count || 0)) : '∞')

      // Active boost
      const { data: boost } = await supabase.from('boosts')
        .select('expires_at').eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false }).limit(1).single()
      if (boost) {
        setBoosted(true)
        setBoostTimeLeft(Math.ceil((new Date(boost.expires_at) - Date.now()) / 60000))
      }

      setLoading(false)
    }
    load()
  }, [navigate])

  const activateBoost = async () => {
    const expires = new Date(Date.now() + 30 * 60 * 1000)
    await supabase.from('boosts').insert({ user_id: myId, expires_at: expires.toISOString() })
    setBoosted(true)
    setBoostTimeLeft(30)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <p className="text-paper/50">Loading...</p>
    </div>
  )

  const canSeeLikes = canAccessFeature(plan, 'see_who_liked')
  const canDMInvite = canAccessFeature(plan, 'dm_invite')
  const canBoost = canAccessFeature(plan, 'boost_weekly')

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper pb-28">
      <header className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Premium</h1>
            <p className="mt-0.5 text-paper/50 text-sm">
              {plan === 'free' ? 'Upgrade to unlock more' : `Nearby ${plan === 'plus' ? 'Plus ⚡' : 'Gold ✨'}`}
            </p>
          </div>
          {plan !== 'free' && (
            <div className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: plan === 'gold' ? '#D4A14420' : '#E8734A20', color: plan === 'gold' ? '#D4A144' : '#E8734A' }}>
              {plan === 'plus' ? 'Plus ⚡' : 'Gold ✨'}
            </div>
          )}
        </div>
      </header>

      {/* Upgrade banner for free users */}
      {plan === 'free' && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/pricing')}
          className="mx-5 mb-4 rounded-2xl bg-gradient-to-r from-ember to-gold p-4 text-left"
        >
          <p className="font-display text-lg text-ink">Unlock Nearby Premium</p>
          <p className="text-ink/70 text-sm mt-0.5">See who liked you, invite to DM, and more</p>
          <p className="mt-2 text-ink font-medium text-sm">Starting ₹199/month →</p>
        </motion.button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-5 overflow-x-auto">
        {[['likes', '❤️ Likes'], ['features', '⚡ Features'], ...(canDMInvite ? [['invites', '💌 DM Invites']] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${tab === id ? 'bg-ember text-ink' : 'border border-paper/15 text-paper/60'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5">
        {/* Who liked you */}
        {tab === 'likes' && (
          <div>
            {canSeeLikes ? (
              <>
                <p className="mb-4 text-sm text-paper/50">{whoLikedMe.length} people liked your profile</p>
                {whoLikedMe.length === 0 ? (
                  <div className="rounded-2xl border border-paper/10 bg-ink-light p-10 text-center">
                    <p className="text-4xl mb-3">💝</p>
                    <p className="font-display text-lg">No likes yet</p>
                    <p className="mt-2 text-sm text-paper/50">Keep swiping to get more likes</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {whoLikedMe.map((p) => (
                      <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-ink-light">
                        {p.photo_url && <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-3">
                          <p className="font-display text-base">{p.name}, {p.age}</p>
                          {p.verified && <p className="text-xs text-gold">✓ Verified</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <LockedFeature
                icon="👀"
                title="See who liked you"
                description="Find out exactly who's interested in you — no more guessing."
                plan="plus"
                onUpgrade={() => navigate('/pricing')}
                count={whoLikedMe.length}
              />
            )}
          </div>
        )}

        {/* Features */}
        {tab === 'features' && (
          <div className="space-y-4">
            {/* Super Likes */}
            <FeatureCard
              icon="⭐"
              title="Super Like"
              subtitle="Stand out — they'll know you really like them"
              locked={false}
              rightContent={
                <div className="text-right">
                  <p className="font-display text-xl text-blue-400">{superLikesLeft}</p>
                  <p className="text-xs text-paper/40">{plan === 'free' ? 'left today' : 'unlimited'}</p>
                </div>
              }
              footer={plan === 'free' ? '3 free per day. Upgrade Plus for unlimited.' : 'Unlimited with your plan ✓'}
            />

            {/* Boost */}
            <FeatureCard
              icon="🚀"
              title="Boost"
              subtitle="Be the top profile for 30 minutes"
              locked={!canBoost}
              onUnlock={() => navigate('/pricing')}
              rightContent={boosted ? (
                <div className="text-right">
                  <p className="font-display text-xl text-sage">{boostTimeLeft}m</p>
                  <p className="text-xs text-paper/40">remaining</p>
                </div>
              ) : null}
              footer={
                boosted ? (
                  <div className="rounded-xl bg-sage/10 border border-sage/20 px-4 py-2.5 text-center text-sm text-sage">
                    🚀 Boost active
                  </div>
                ) : canBoost ? (
                  <button onClick={activateBoost} className="w-full rounded-full bg-ember py-3 text-sm font-medium text-ink">
                    Activate 30-min boost
                  </button>
                ) : null
              }
            />

            {/* Read receipts */}
            <FeatureCard
              icon="✓✓"
              title="Read receipts"
              subtitle="Know when your messages are read"
              locked={!canAccessFeature(plan, 'read_receipts')}
              onUnlock={() => navigate('/pricing')}
              footer={canAccessFeature(plan, 'read_receipts') ? 'Active on all your chats ✓' : null}
            />

            {/* Incognito */}
            <FeatureCard
              icon="🕵️"
              title="Incognito mode"
              subtitle="Browse profiles without appearing in their Discover"
              locked={!canAccessFeature(plan, 'incognito')}
              onUnlock={() => navigate('/pricing')}
              goldOnly
              footer={canAccessFeature(plan, 'incognito') ? 'You are browsing invisibly ✓' : null}
            />

            {/* DM Invite preview */}
            <FeatureCard
              icon="💌"
              title="Invite to DM"
              subtitle="Send a direct message to anyone, even without matching"
              locked={!canDMInvite}
              onUnlock={() => navigate('/pricing')}
              goldOnly
              footer={canDMInvite ? (
                <button onClick={() => setTab('invites')} className="w-full rounded-full border border-gold/40 py-2.5 text-sm font-medium text-gold">
                  Go to DM Invites →
                </button>
              ) : null}
            />
          </div>
        )}

        {/* DM Invites (Gold only) */}
        {tab === 'invites' && canDMInvite && (
          <DMInvitesTab myId={myId} navigate={navigate} />
        )}
      </div>

      <BottomNav active="premium" />
    </div>
  )
}

function LockedFeature({ icon, title, description, plan, onUpgrade, count }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-ink-light overflow-hidden">
      {/* Blurred preview */}
      <div className="relative p-5">
        <div className="grid grid-cols-2 gap-3 blur-sm pointer-events-none select-none">
          {Array.from({ length: Math.min(count || 4, 4) }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-paper/10 flex items-center justify-center text-4xl">
              {icon}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/70 backdrop-blur-sm p-6 text-center">
          <span className="text-4xl mb-3">{icon}</span>
          <p className="font-display text-xl text-paper">{title}</p>
          <p className="mt-2 text-sm text-paper/60">{description}</p>
          {count > 0 && (
            <p className="mt-3 font-medium text-ember">{count} people already liked you</p>
          )}
          <button onClick={onUpgrade}
            className="mt-4 rounded-full bg-ember px-6 py-2.5 text-sm font-medium text-ink">
            Unlock with {plan === 'plus' ? 'Plus ⚡' : 'Gold ✨'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, subtitle, locked, onUnlock, goldOnly, rightContent, footer }) {
  return (
    <div className={`rounded-2xl border p-5 ${locked ? 'border-paper/10 bg-ink-light opacity-80' : 'border-paper/10 bg-ink-light'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${goldOnly ? 'bg-gold/15' : 'bg-ember/15'}`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{title}</p>
              {goldOnly && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">Gold</span>}
              {locked && <span className="text-paper/30">🔒</span>}
            </div>
            <p className="text-xs text-paper/50 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {rightContent}
      </div>
      {locked ? (
        <button onClick={onUnlock}
          className={`w-full rounded-full py-2.5 text-sm font-medium border ${goldOnly ? 'border-gold/40 text-gold' : 'border-ember/40 text-ember'}`}>
          Upgrade to unlock →
        </button>
      ) : footer ? (
        typeof footer === 'string'
          ? <p className="text-xs text-paper/40">{footer}</p>
          : footer
      ) : null}
    </div>
  )
}

function DMInvitesTab({ myId, navigate }) {
  const [invites, setInvites] = useState([])
  const [received, setReceived] = useState([])
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: sent } = await supabase.from('dm_invites')
        .select('*, receiver:profiles!dm_invites_receiver_id_fkey(name, photo_url)')
        .eq('sender_id', myId).order('created_at', { ascending: false })

      const { data: recv } = await supabase.from('dm_invites')
        .select('*, sender:profiles!dm_invites_sender_id_fkey(name, photo_url, id)')
        .eq('receiver_id', myId).eq('status', 'pending').order('created_at', { ascending: false })

      setInvites(sent || [])
      setReceived(recv || [])
      setLoading(false)
    }
    load()
  }, [myId])

  const respondToInvite = async (inviteId, senderId, accept) => {
    await supabase.from('dm_invites').update({ status: accept ? 'accepted' : 'declined' }).eq('id', inviteId)

    if (accept) {
      // Create a match so they can chat
      const { data: match } = await supabase.from('matches')
        .insert({ user_a: myId, user_b: senderId }).select().single()
      if (match) navigate(`/chat/${match.id}`)
    }

    setReceived(prev => prev.filter(i => i.id !== inviteId))
  }

  if (loading) return <p className="text-paper/50 text-sm">Loading...</p>

  return (
    <div className="space-y-5">
      {/* Received invites */}
      {received.length > 0 && (
        <div>
          <p className="text-sm font-medium text-paper mb-3">📬 Received ({received.length})</p>
          <div className="space-y-3">
            {received.map((inv) => (
              <div key={inv.id} className="rounded-2xl border border-gold/20 bg-gold/5 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-ink-light shrink-0">
                    {inv.sender?.photo_url && <img src={inv.sender.photo_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-medium">{inv.sender?.name}</p>
                    <p className="text-xs text-paper/50">Sent you a DM invite</p>
                  </div>
                </div>
                <p className="text-sm text-paper/80 bg-ink-light rounded-xl px-3 py-2 mb-3 italic">"{inv.message}"</p>
                <div className="flex gap-2">
                  <button onClick={() => respondToInvite(inv.id, inv.sender?.id, true)}
                    className="flex-1 rounded-full bg-sage py-2.5 text-sm font-medium text-ink">
                    Accept & Chat
                  </button>
                  <button onClick={() => respondToInvite(inv.id, inv.sender?.id, false)}
                    className="flex-1 rounded-full border border-paper/15 py-2.5 text-sm text-paper/50">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent invites */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-paper">💌 DM Invites</p>
          <button onClick={() => setShowCompose(true)}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-ink">
            + Send invite
          </button>
        </div>
        {invites.length === 0 ? (
          <div className="rounded-2xl border border-paper/10 bg-ink-light p-8 text-center">
            <p className="text-3xl mb-2">💌</p>
            <p className="font-display text-lg">No invites sent</p>
            <p className="text-sm text-paper/50 mt-1">Message someone directly without matching first</p>
            <button onClick={() => setShowCompose(true)}
              className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink">
              Send your first invite
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="rounded-2xl border border-paper/10 bg-ink-light p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-ink shrink-0">
                  {inv.receiver?.photo_url && <img src={inv.receiver.photo_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{inv.receiver?.name}</p>
                  <p className="text-xs text-paper/50 truncate">"{inv.message}"</p>
                </div>
                <span className={`text-xs rounded-full px-2 py-1 ${
                  inv.status === 'accepted' ? 'bg-sage/15 text-sage' :
                  inv.status === 'declined' ? 'bg-ember/15 text-ember' :
                  'bg-paper/10 text-paper/50'
                }`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {showCompose && <ComposeInvite myId={myId} onClose={() => setShowCompose(false)} onSent={(inv) => setInvites(prev => [inv, ...prev])} />}
      </AnimatePresence>
    </div>
  )
}

function ComposeInvite({ myId, onClose, onSent }) {
  const [profiles, setProfiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: me } = await supabase.from('profiles').select('gender').eq('id', myId).single()
      const opposite = me?.gender === 'Man' ? 'Woman' : 'Man'
      const { data } = await supabase.from('profiles')
        .select('id, name, age, photo_url').eq('verified', true).eq('gender', opposite).limit(20)
      setProfiles(data || [])
    }
    load()
  }, [myId])

  const send = async () => {
    if (!selected || !message.trim()) return
    setSending(true)
    const { data } = await supabase.from('dm_invites').insert({
      sender_id: myId,
      receiver_id: selected.id,
      message: message.trim(),
    }).select().single()
    onSent({ ...data, receiver: selected })
    onClose()
  }

  const filtered = profiles.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 px-4 pb-4"
      onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        className="w-full max-w-md rounded-3xl bg-ink-light overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-paper/10">
          <p className="font-display text-xl">Send DM Invite</p>
          <p className="text-xs text-paper/50 mt-1">They can accept or decline — no pressure</p>
        </div>
        <div className="p-4 border-b border-paper/10">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-xl border border-paper/15 bg-ink px-4 py-2.5 text-sm outline-none focus:border-gold" />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${selected?.id === p.id ? 'bg-gold/10' : 'hover:bg-paper/5'}`}>
              <div className="h-10 w-10 rounded-full overflow-hidden bg-ink shrink-0">
                {p.photo_url && <img src={p.photo_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <p className="font-medium">{p.name}, {p.age}</p>
              {selected?.id === p.id && <span className="ml-auto text-gold">✓</span>}
            </button>
          ))}
        </div>
        {selected && (
          <div className="p-4 border-t border-paper/10 space-y-3">
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={`Say hi to ${selected.name}...`}
              rows={3} maxLength={200}
              className="w-full rounded-xl border border-paper/15 bg-ink px-4 py-3 text-sm outline-none focus:border-gold resize-none" />
            <button onClick={send} disabled={!message.trim() || sending}
              className="w-full rounded-full bg-gold py-3 font-medium text-ink disabled:opacity-40">
              {sending ? 'Sending...' : `Send invite to ${selected.name} 💌`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
