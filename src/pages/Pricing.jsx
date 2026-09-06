import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { PLANS, getUserPlan } from '../lib/subscription'
import { BottomNav } from './Matches.jsx'

export default function Pricing() {
  const navigate = useNavigate()
  const [myId, setMyId] = useState(null)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      setMyId(user.id)
      const plan = await getUserPlan(user.id)
      setCurrentPlan(plan)
      setLoading(false)
    }
    load()
  }, [navigate])

  const handleSubscribe = async (planKey) => {
    setPaying(planKey)
    const plan = PLANS[planKey]

    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)

    script.onload = () => {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: plan.price * 100, // in paise
        currency: 'INR',
        name: 'Nearby',
        description: `${plan.name} — Monthly`,
        image: '/icon.png',
        prefill: { name: '', email: '' },
        theme: { color: plan.color },
        handler: async (response) => {
          // Payment successful
          await activatePlan(planKey, response.razorpay_payment_id)
        },
        modal: {
          ondismiss: () => setPaying(null),
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        setPaying(null)
        alert('Payment failed. Please try again.')
      })
      rzp.open()
    }
  }

  const activatePlan = async (planKey, paymentId) => {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    await supabase.from('profiles').update({
      plan: planKey,
      plan_expires_at: expiresAt.toISOString(),
    }).eq('id', myId)

    await supabase.from('subscriptions').upsert({
      user_id: myId,
      plan: planKey,
      status: 'active',
      razorpay_payment_id: paymentId,
      current_period_start: new Date().toISOString(),
      current_period_end: expiresAt.toISOString(),
    })

    setCurrentPlan(planKey)
    setPaying(null)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <p className="text-paper/50">Loading...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper pb-28">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-paper/50 text-sm mb-4">← Back</button>
        <h1 className="font-display text-3xl">Upgrade Nearby</h1>
        <p className="mt-1 text-paper/50 text-sm">Find genuine connections, faster</p>
      </div>

      {/* Current plan badge */}
      {currentPlan !== 'free' && (
        <div className="mx-5 mb-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">✨</span>
          <div>
            <p className="font-medium text-gold">Active: Nearby {currentPlan === 'plus' ? 'Plus' : 'Gold'}</p>
            <p className="text-xs text-paper/50">Your plan renews monthly</p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="px-5 space-y-4">
        {/* Plus */}
        <PlanCard
          planKey="plus"
          plan={PLANS.plus}
          currentPlan={currentPlan}
          paying={paying}
          onSubscribe={handleSubscribe}
        />

        {/* Gold — highlighted */}
        <PlanCard
          planKey="gold"
          plan={PLANS.gold}
          currentPlan={currentPlan}
          paying={paying}
          onSubscribe={handleSubscribe}
          featured
        />
      </div>

      {/* Free plan */}
      <div className="mx-5 mt-4 rounded-2xl border border-paper/10 bg-ink-light p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Free</p>
          {currentPlan === 'free' && (
            <span className="rounded-full bg-paper/10 px-3 py-1 text-xs text-paper/50">Current plan</span>
          )}
        </div>
        <div className="space-y-2 text-sm text-paper/50">
          {['Discover & swipe', 'Daily Vibe', 'Matches & chat', '3 super likes/day'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <span className="text-paper/30">○</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fine print */}
      <p className="mx-5 mt-4 text-xs text-paper/30 text-center">
        Payments via Razorpay. Cancel anytime. Plans auto-renew monthly.
      </p>

      {/* Success toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-sage px-6 py-3 text-sm font-medium text-ink shadow-lg"
          >
            ✓ Plan activated! Enjoy Nearby {currentPlan === 'plus' ? 'Plus' : 'Gold'}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active="premium" />
    </div>
  )
}

function PlanCard({ planKey, plan, currentPlan, paying, onSubscribe, featured }) {
  const isActive = currentPlan === planKey
  const isHigher = planKey === 'gold' && currentPlan === 'plus'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border p-5 overflow-hidden ${
        featured
          ? 'border-gold/40 bg-gradient-to-br from-gold/10 to-transparent'
          : 'border-paper/10 bg-ink-light'
      }`}
    >
      {featured && (
        <div className="absolute top-3 right-3 rounded-full bg-gold px-3 py-0.5 text-xs font-medium text-ink">
          Most popular
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-display text-xl" style={{ color: plan.color }}>{plan.name}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display text-3xl text-paper">₹{plan.price}</span>
            <span className="text-paper/40 text-sm">/month</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 mb-5">
        {plan.features.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-base shrink-0">{f.icon}</span>
            <span className="text-sm text-paper/80">{f.text}</span>
          </div>
        ))}
      </div>

      {isActive ? (
        <div className="w-full rounded-full border border-paper/20 py-3 text-center text-sm text-paper/50">
          ✓ Active plan
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(planKey)}
          disabled={!!paying}
          className="w-full rounded-full py-3 font-medium text-ink transition-transform active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: plan.color }}
        >
          {paying === planKey ? 'Opening payment...' : `Get ${plan.name} — ₹${plan.price}/mo`}
        </button>
      )}
    </motion.div>
  )
}
