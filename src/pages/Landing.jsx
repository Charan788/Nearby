import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const steps = [
  { label: 'Selfie', detail: 'A live camera capture, not a gallery upload.' },
  { label: 'AI check', detail: 'Confirms it\'s a real, live face matching your photo.' },
  { label: 'Human review', detail: 'A moderator makes the final call, every time.' },
  { label: 'You\'re in', detail: 'A verified badge follows you everywhere on the app.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:px-16 md:pt-28">
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #E8734A, transparent 70%)' }}
        />
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src="/logo.png" alt="Nearby" className="h-20 w-20 rounded-2xl mb-6" />
            <h1 className="font-display text-5xl leading-[1.05] font-medium md:text-6xl">
              Every face here is a real person.
            </h1>
            <p className="mt-6 max-w-md text-lg text-paper/70">
              We verify every profile with a live selfie check before anyone can talk to
              anyone. No catfish, no stolen photos, no bots — just people who are actually
              who they say they are.
            </p>
            <div className="mt-9 flex items-center gap-4">
              <button
                onClick={() => navigate('/onboarding')}
                className="rounded-full bg-ember px-7 py-3 font-medium text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Get verified
              </button>
              <span className="text-sm text-paper/50">Takes about 2 minutes</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="justify-self-center"
          >
            <ProfileCardPreview />
          </motion.div>
        </div>
      </section>

      {/* How verification works — a real sequence, shown as one */}
      <section className="border-t border-paper/10 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-medium">How verification works</h2>
          <div className="relative mt-12 grid gap-10 md:grid-cols-4">
            <div className="absolute top-4 left-0 hidden h-px w-full bg-paper/15 md:block" />
            {steps.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="mb-4 h-2 w-2 rounded-full bg-gold" />
                <h3 className="font-display text-xl">{step.label}</h3>
                <p className="mt-2 text-sm text-paper/60">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-paper/10 px-6 py-10 text-sm text-paper/40 md:px-16">
        Built for genuine connections, not endless swiping.
      </footer>
    </div>
  )
}

function ProfileCardPreview() {
  return (
    <div className="w-72 rounded-3xl bg-paper p-4 text-ink shadow-2xl">
      <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-paper-dim">
        <div className="absolute inset-0 flex items-center justify-center text-ink/20">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-ink/85 px-3 py-1 text-xs text-gold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
          </svg>
          Verified
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-display text-2xl">Ananya, 21</span>
        <span className="text-sm text-ink/50">2 km away</span>
      </div>
      <p className="mt-1 text-sm text-ink/60">Design student, plays badminton badly</p>
    </div>
  )
}
