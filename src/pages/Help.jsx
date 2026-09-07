import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { BottomNav } from './Matches.jsx'

const FAQS = [
  {
    q: 'How does face verification work?',
    a: 'You take a live selfie during signup. Our AI checks it\'s a real live person matching your profile photo, then a human moderator makes the final approval. This usually takes a few hours.',
  },
  {
    q: 'My verification is taking too long',
    a: 'We review every profile manually — it usually takes 2-6 hours. If it\'s been more than 24 hours, tap "Contact Support" below and we\'ll check it for you.',
  },
  {
    q: 'How do matches work?',
    a: 'When you and someone both like each other, it\'s a match! You\'ll see a match animation and can start chatting immediately.',
  },
  {
    q: 'What is Vibe Match?',
    a: 'Vibe Match scores your compatibility with each profile based on your Daily Vibe answers. The more questions you both answer, the more accurate it gets.',
  },
  {
    q: 'How do I get Nearby Plus or Gold?',
    a: 'Go to Premium tab → tap the upgrade banner. Plus is ₹199/month, Gold is ₹299/month. You can also earn 7 days Plus free by inviting 3 verified friends.',
  },
  {
    q: 'What is the DM Invite feature?',
    a: 'Gold members can send a direct message to anyone on Nearby — even without matching first. The person can accept or decline. It\'s respectful and unique to Nearby.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Contact us via the form below and we\'ll delete your account and all data within 24 hours.',
  },
  {
    q: 'I found a fake or inappropriate profile',
    a: 'Tap the three dots in the chat with that person → Report. Our team reviews all reports within 24 hours and bans violators.',
  },
]

export default function Help() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const [showContact, setShowContact] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email)
    })
  })

  const sendMessage = async () => {
    if (!form.subject || !form.message) return
    setSending(true)

    // Save to Supabase support_tickets table
    await supabase.from('support_tickets').insert({
      email: userEmail,
      subject: form.subject,
      message: form.message,
    }).then(() => {})

    // Also open WhatsApp as backup
    setSending(false)
    setSent(true)
    setForm({ subject: '', message: '' })
    setTimeout(() => { setSent(false); setShowContact(false) }, 3000)
  }

  const openWhatsApp = () => {
    const text = `Hi Nearby Support,\n\nEmail: ${userEmail}\nSubject: ${form.subject || 'Help needed'}\n\n${form.message || ''}`
    window.open(`https://wa.me/919885420114?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper pb-28">
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-paper/50 text-sm mb-4 block">← Back</button>
        <h1 className="font-display text-3xl">Help & Support</h1>
        <p className="mt-1 text-paper/50 text-sm">We're here to help</p>
      </div>

      {/* Quick actions */}
      <div className="mx-5 grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setShowContact(true)}
          className="rounded-2xl border border-ember/30 bg-ember/10 p-4 text-left"
        >
          <span className="text-2xl">💬</span>
          <p className="font-medium text-ember mt-2">Contact us</p>
          <p className="text-xs text-paper/50 mt-0.5">nearby.dating1@gmail.com</p>
        </button>
        <button
          onClick={openWhatsApp}
          className="rounded-2xl border border-sage/30 bg-sage/10 p-4 text-left"
        >
          <span className="text-2xl">📱</span>
          <p className="font-medium text-sage mt-2">WhatsApp</p>
          <p className="text-xs text-paper/50 mt-0.5">Quick responses</p>
        </button>
      </div>

      {/* FAQs */}
      <div className="mx-5">
        <p className="font-medium mb-3">Frequently asked questions</p>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-paper/10 bg-ink-light overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="text-sm font-medium pr-3">{faq.q}</span>
                <motion.span
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  className="text-paper/40 shrink-0"
                >
                  ↓
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm text-paper/60">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Contact form modal */}
      <AnimatePresence>
        {showContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 px-4 pb-4"
            onClick={() => setShowContact(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="w-full max-w-md rounded-3xl bg-ink-light overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-paper/10">
                <p className="font-display text-xl">Contact Support</p>
                <p className="text-xs text-paper/50 mt-0.5">We'll reply to {userEmail}</p>
              </div>
              {sent ? (
                <div className="p-8 text-center">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="font-display text-lg">Message sent!</p>
                  <p className="text-sm text-paper/50 mt-1">We'll get back to you within 24 hours</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-paper/50 mb-1.5">Subject</p>
                    <select
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-paper/15 bg-ink px-4 py-3 text-sm outline-none focus:border-ember"
                    >
                      <option value="">Select a topic</option>
                      <option value="Verification issue">Verification issue</option>
                      <option value="Account problem">Account problem</option>
                      <option value="Payment issue">Payment issue</option>
                      <option value="Report a user">Report a user</option>
                      <option value="Delete my account">Delete my account</option>
                      <option value="Bug report">Bug report</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-paper/50 mb-1.5">Message</p>
                    <textarea
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="Describe your issue..."
                      rows={4}
                      className="w-full rounded-xl border border-paper/15 bg-ink px-4 py-3 text-sm outline-none focus:border-ember resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={sendMessage}
                      disabled={!form.subject || !form.message || sending}
                      className="flex-1 rounded-full bg-ember py-3 text-sm font-medium text-ink disabled:opacity-40"
                    >
                      {sending ? 'Sending...' : 'Send message'}
                    </button>
                    <button
                      onClick={openWhatsApp}
                      className="rounded-full border border-sage/40 px-4 py-3 text-sm text-sage"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active="profile" />
    </div>
  )
}
