import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { loadModels, checkLiveness, compareFaces } from '../lib/faceVerification'

const STEPS = ['account', 'basics', 'photo', 'selfie', 'review']

export default function Onboarding() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signup') // 'signup' | 'login'
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState({
    email: '', password: '', name: '', age: '', gender: '', bio: '',
    profilePhotoFile: null, profilePhotoPreview: null,
  })
  const [verification, setVerification] = useState({
    status: 'idle', message: '', matchDistance: null, selfieBlob: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const step = STEPS[stepIndex]
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const back = () => setStepIndex((i) => Math.max(i - 1, 0))

  const handleFinalSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    const referralCode = localStorage.getItem('nearby_referral_code')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })
      if (authError) throw authError

      await new Promise(r => setTimeout(r, 1000))
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      const userId = sessionUser?.id || authData.user?.id
      if (!userId) throw new Error('Failed to create account. Please try again.')

      const photoPath = `${userId}/profile.jpg`
      const { error: photoError } = await supabase.storage
        .from('profile-photos')
        .upload(photoPath, data.profilePhotoFile, { upsert: true, contentType: data.profilePhotoFile.type || 'image/jpeg' })
      if (photoError) throw new Error('Photo upload failed: ' + photoError.message)
      const { data: photoUrlData } = supabase.storage.from('profile-photos').getPublicUrl(photoPath)

      const selfiePath = `${userId}/selfie.jpg`
      const { error: selfieError } = await supabase.storage
        .from('selfies')
        .upload(selfiePath, verification.selfieBlob, { upsert: true, contentType: 'image/jpeg' })
      if (selfieError) throw new Error('Selfie upload failed: ' + selfieError.message)
      const { data: selfieUrlData } = supabase.storage.from('selfies').getPublicUrl(selfiePath)

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        name: data.name,
        age: parseInt(data.age),
        gender: data.gender,
        bio: data.bio,
        photo_url: photoUrlData.publicUrl,
        verified: false,
      })
      if (profileError) throw new Error('Profile save failed: ' + profileError.message)

      const { error: verError } = await supabase.from('verifications').insert({
        user_id: userId,
        claimed_gender: data.gender,
        profile_photo_url: photoUrlData.publicUrl,
        selfie_url: selfieUrlData.publicUrl,
        ai_match_distance: verification.matchDistance,
        ai_liveness_passed: true,
        status: 'pending_review',
      })
      if (verError) throw new Error('Verification save failed: ' + verError.message)

      // Track referral if exists
      if (referralCode) {
        const { data: referrer } = await supabase
          .from('profiles').select('id').eq('invite_code', referralCode).single()
        if (referrer) {
          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: userId,
            status: 'pending',
          })
        }
        localStorage.removeItem('nearby_referral_code')
      }

      next()
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Login mode
  if (mode === 'login') {
    return <LoginScreen onSwitch={() => setMode('signup')} onSuccess={() => navigate('/status')} />
  }

  return (
    <div className="min-h-screen bg-ink px-6 py-10 text-paper md:px-0">
      <div className="mx-auto max-w-md">
        <ProgressBar current={stepIndex} total={STEPS.length} />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10"
          >
            {step === 'account' && (
              <AccountStep data={data} setData={setData} onNext={next} onSwitchToLogin={() => setMode('login')} />
            )}
            {step === 'basics' && <BasicsStep data={data} setData={setData} onNext={next} onBack={back} />}
            {step === 'photo' && <PhotoStep data={data} setData={setData} onNext={next} onBack={back} />}
            {step === 'selfie' && (
              <SelfieStep
                data={data}
                verification={verification}
                setVerification={setVerification}
                onNext={handleFinalSubmit}
                onBack={back}
                submitting={submitting}
                submitError={submitError}
              />
            )}
            {step === 'review' && <ReviewStep data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------- Login Screen ----------

function LoginScreen({ onSwitch, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async () => {
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl text-paper">Welcome back</h1>
        <p className="mt-2 text-paper/60">Sign in to continue</p>
        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-paper/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-paper/15 bg-ink-light px-4 py-3 text-paper placeholder:text-paper/30 focus:border-ember outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-paper/60">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="Your password"
              className="w-full rounded-xl border border-paper/15 bg-ink-light px-4 py-3 text-paper placeholder:text-paper/30 focus:border-ember outline-none"
            />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-ember">{error}</p>}
        <button
          onClick={login}
          disabled={loading || !email.includes('@') || !password}
          className="mt-8 w-full rounded-full bg-ember py-3 font-medium text-ink disabled:opacity-40"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="mt-6 text-center text-sm text-paper/50">
          Don't have an account?{' '}
          <button onClick={onSwitch} className="text-ember hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}

// ---------- Shared components ----------

function ProgressBar({ current, total }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-paper/10">
          <motion.div className="h-full bg-ember" initial={{ width: 0 }}
            animate={{ width: i <= current ? '100%' : 0 }} transition={{ duration: 0.4 }} />
        </div>
      ))}
    </div>
  )
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-sm text-paper/60">{children}</label>
}

const inputClass = 'w-full rounded-xl border border-paper/15 bg-ink-light px-4 py-3 text-paper placeholder:text-paper/30 focus:border-ember outline-none'

function PrimaryButton({ children, ...props }) {
  return (
    <button {...props}
      className="w-full rounded-full bg-ember py-3 font-medium text-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100">
      {children}
    </button>
  )
}

function AccountStep({ data, setData, onNext, onSwitchToLogin }) {
  const canContinue = data.email.includes('@') && data.password.length >= 6
  return (
    <div>
      <h1 className="font-display text-3xl">Create your account</h1>
      <p className="mt-2 text-paper/60">You'll verify your face next.</p>
      <div className="mt-8 space-y-5">
        <div>
          <FieldLabel>Email</FieldLabel>
          <input type="email" className={inputClass} value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="you@example.com" />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <input type="password" className={inputClass} value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })} placeholder="At least 6 characters" />
        </div>
      </div>
      <div className="mt-8"><PrimaryButton disabled={!canContinue} onClick={onNext}>Continue</PrimaryButton></div>
      <p className="mt-6 text-center text-sm text-paper/50">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="text-ember hover:underline">Sign in</button>
      </p>
    </div>
  )
}

function BasicsStep({ data, setData, onNext, onBack }) {
  const canContinue = data.name && data.age >= 18 && data.gender
  return (
    <div>
      <h1 className="font-display text-3xl">Tell us about you</h1>
      <p className="mt-2 text-paper/60">This is what people will see on your profile.</p>
      <div className="mt-8 space-y-5">
        <div>
          <FieldLabel>Name</FieldLabel>
          <input className={inputClass} value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Your name" />
        </div>
        <div>
          <FieldLabel>Age</FieldLabel>
          <input type="number" min="18" className={inputClass} value={data.age}
            onChange={(e) => setData({ ...data, age: e.target.value })} placeholder="18+" />
        </div>
        <div>
          <FieldLabel>I am a</FieldLabel>
          <div className="flex gap-3">
            {['Man', 'Woman'].map((g) => (
              <button key={g} onClick={() => setData({ ...data, gender: g })}
                className={`flex-1 rounded-xl border py-3 transition-colors ${data.gender === g ? 'border-ember bg-ember/15 text-ember' : 'border-paper/15 text-paper/70'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Short bio (optional)</FieldLabel>
          <textarea className={inputClass} rows={3} value={data.bio}
            onChange={(e) => setData({ ...data, bio: e.target.value })} placeholder="One or two lines about you" />
        </div>
      </div>
      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="px-4 text-paper/50">Back</button>
        <PrimaryButton disabled={!canContinue} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  )
}

function PhotoStep({ data, setData, onNext, onBack }) {
  const fileRef = useRef(null)
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setData({ ...data, profilePhotoFile: file, profilePhotoPreview: URL.createObjectURL(file) })
  }
  return (
    <div>
      <h1 className="font-display text-3xl">Add your photo</h1>
      <p className="mt-2 text-paper/60">Just one clear photo of your face.</p>
      <div className="mt-8 flex flex-col items-center">
        <button onClick={() => fileRef.current?.click()}
          className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-paper/25 bg-ink-light">
          {data.profilePhotoPreview
            ? <img src={data.profilePhotoPreview} alt="Your upload" className="h-full w-full object-cover" />
            : <span className="text-paper/40">Tap to upload</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="px-4 text-paper/50">Back</button>
        <PrimaryButton disabled={!data.profilePhotoFile} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  )
}

function SelfieStep({ data, verification, setVerification, onNext, onBack, submitting, submitError }) {
  const videoRef = useRef(null)
  const imgRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)

  const startCamera = useCallback(async () => {
    setCameraReady(false)
    setModelsLoading(true)
    setVerification((v) => ({ ...v, status: 'idle', message: '' }))
    try {
      await loadModels()
      setModelsLoading(false)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraReady(true)
      }
    } catch (err) {
      setModelsLoading(false)
      setVerification((v) => ({ ...v, status: 'failed', message: 'Camera blocked. Allow camera then click Retry.' }))
    }
  }, [setVerification])

  useEffect(() => {
    startCamera()
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const runCheck = useCallback(async () => {
    setVerification((v) => ({ ...v, status: 'checking', message: 'Checking...' }))
    try {
      const liveness = await checkLiveness(videoRef.current)
      if (!liveness.live) {
        setVerification((v) => ({ ...v, status: 'failed', message: liveness.reason }))
        return
      }
      const match = await compareFaces(imgRef.current, liveness.descriptor)
      if (!match.match) {
        setVerification((v) => ({ ...v, status: 'failed', message: match.reason, matchDistance: match.distance }))
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
      canvas.toBlob((blob) => {
        setVerification({ status: 'passed', message: 'Face verified! Tap Submit to continue.', matchDistance: match.distance, selfieBlob: blob })
      }, 'image/jpeg', 0.9)
    } catch (err) {
      setVerification((v) => ({ ...v, status: 'failed', message: 'Something went wrong. Try again.' }))
    }
  }, [setVerification])

  return (
    <div>
      <h1 className="font-display text-3xl">Live selfie check</h1>
      <p className="mt-2 text-paper/60">Look at the camera and hold still.</p>
      <div className="relative mt-8 mx-auto h-72 w-72 overflow-hidden rounded-full border-4 border-paper/10">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-light text-sm text-paper/50 text-center px-4">
            {modelsLoading ? 'Loading AI... (10-20 sec first time)' : 'Starting camera...'}
          </div>
        )}
      </div>
      <img ref={imgRef} src={data.profilePhotoPreview} alt="" className="hidden" crossOrigin="anonymous" />
      {verification.status !== 'idle' && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`mt-4 text-center text-sm ${verification.status === 'passed' ? 'text-sage' : verification.status === 'failed' ? 'text-ember' : 'text-paper/60'}`}>
          {verification.message}
        </motion.p>
      )}
      {submitError && <p className="mt-2 text-center text-sm text-ember">{submitError}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="px-4 text-paper/50">Back</button>
        {verification.status === 'passed' ? (
          <PrimaryButton onClick={onNext} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit profile'}
          </PrimaryButton>
        ) : verification.status === 'failed' ? (
          <PrimaryButton onClick={startCamera}>Retry camera</PrimaryButton>
        ) : (
          <PrimaryButton disabled={!cameraReady || verification.status === 'checking'} onClick={runCheck}>
            {verification.status === 'checking' ? 'Checking...' : 'Verify my face'}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

function ReviewStep({ data }) {
  const navigate = useNavigate()
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" fill="currentColor" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-3xl">You are in the queue</h1>
      <p className="mt-3 text-paper/60">
        Hi {data.name || 'there'} — your selfie passed the check and is with a moderator. Usually takes a few hours.
      </p>
      <p className="mt-6 text-sm text-paper/40">We will email you at {data.email} once verified.</p>
      <button onClick={() => navigate('/discover')} className="mt-8 rounded-full border border-paper/20 px-6 py-2.5 text-sm text-paper/70">
        Go to Discover
      </button>
    </div>
  )
}
