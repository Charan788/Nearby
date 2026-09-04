import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { loadModels, checkLiveness, compareFaces } from '../lib/faceVerification'

const STEPS = ['account', 'basics', 'photo', 'selfie', 'review']

export default function Onboarding() {
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    gender: '',
    bio: '',
    profilePhotoFile: null,
    profilePhotoPreview: null,
  })
  const [verification, setVerification] = useState({
    status: 'idle', // idle | checking | passed | failed
    message: '',
    matchDistance: null,
    selfieBlob: null,
  })

  const step = STEPS[stepIndex]
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const back = () => setStepIndex((i) => Math.max(i - 1, 0))

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
            {step === 'account' && <AccountStep data={data} setData={setData} onNext={next} />}
            {step === 'basics' && (
              <BasicsStep data={data} setData={setData} onNext={next} onBack={back} />
            )}
            {step === 'photo' && (
              <PhotoStep data={data} setData={setData} onNext={next} onBack={back} />
            )}
            {step === 'selfie' && (
              <SelfieStep
                data={data}
                verification={verification}
                setVerification={setVerification}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 'review' && <ReviewStep data={data} verification={verification} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ProgressBar({ current, total }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 overflow-hidden rounded-full bg-paper/10"
        >
          <motion.div
            className="h-full bg-ember"
            initial={{ width: 0 }}
            animate={{ width: i <= current ? '100%' : 0 }}
            transition={{ duration: 0.4 }}
          />
        </div>
      ))}
    </div>
  )
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-sm text-paper/60">{children}</label>
}

const inputClass =
  'w-full rounded-xl border border-paper/15 bg-ink-light px-4 py-3 text-paper placeholder:text-paper/30 focus:border-ember outline-none'

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full rounded-full bg-ember py-3 font-medium text-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
    >
      {children}
    </button>
  )
}

function AccountStep({ data, setData, onNext }) {
  const canContinue = data.email.includes('@') && data.password.length >= 6

  return (
    <div>
      <h1 className="font-display text-3xl">Create your account</h1>
      <p className="mt-2 text-paper/60">You'll verify your face next — this part's just login info.</p>
      <div className="mt-8 space-y-5">
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email"
            className={inputClass}
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <input
            type="password"
            className={inputClass}
            value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })}
            placeholder="At least 6 characters"
          />
        </div>
      </div>
      <div className="mt-8">
        <PrimaryButton disabled={!canContinue} onClick={onNext}>
          Continue
        </PrimaryButton>
      </div>
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
          <input
            className={inputClass}
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Your name"
          />
        </div>
        <div>
          <FieldLabel>Age</FieldLabel>
          <input
            type="number"
            min="18"
            className={inputClass}
            value={data.age}
            onChange={(e) => setData({ ...data, age: e.target.value })}
            placeholder="18+"
          />
        </div>
        <div>
          <FieldLabel>I am a</FieldLabel>
          <div className="flex gap-3">
            {['Man', 'Woman'].map((g) => (
              <button
                key={g}
                onClick={() => setData({ ...data, gender: g })}
                className={`flex-1 rounded-xl border py-3 transition-colors ${
                  data.gender === g
                    ? 'border-ember bg-ember/15 text-ember'
                    : 'border-paper/15 text-paper/70'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Short bio (optional)</FieldLabel>
          <textarea
            className={inputClass}
            rows={3}
            value={data.bio}
            onChange={(e) => setData({ ...data, bio: e.target.value })}
            placeholder="One or two lines about you"
          />
        </div>
      </div>
      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="px-4 text-paper/50">
          Back
        </button>
        <PrimaryButton disabled={!canContinue} onClick={onNext}>
          Continue
        </PrimaryButton>
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
      <p className="mt-2 text-paper/60">
        Just one — a clear photo of your face. We'll check it matches a live selfie next.
      </p>

      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-paper/25 bg-ink-light"
        >
          {data.profilePhotoPreview ? (
            <img src={data.profilePhotoPreview} alt="Your upload" className="h-full w-full object-cover" />
          ) : (
            <span className="text-paper/40">Tap to upload</span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="px-4 text-paper/50">
          Back
        </button>
        <PrimaryButton disabled={!data.profilePhotoFile} onClick={onNext}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  )
}

function SelfieStep({ data, verification, setVerification, onNext, onBack }) {
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
      setVerification((v) => ({ ...v, status: 'failed', message: 'Camera blocked. Allow camera in browser settings then click Retry.' }))
    }
  }, [setVerification])

  useEffect(() => {
    startCamera()
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setVerification((v) => ({
          ...v,
          status: 'failed',
          message: match.reason,
          matchDistance: match.distance,
        }))
        return
      }

      // Capture the selfie frame to send along for human review
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
      canvas.toBlob((blob) => {
        setVerification({
          status: 'passed',
          message: 'Looks good — sent for final human review.',
          matchDistance: match.distance,
          selfieBlob: blob,
        })
      }, 'image/jpeg', 0.9)
    } catch (err) {
      setVerification((v) => ({
        ...v,
        status: 'failed',
        message: 'Something went wrong reading your camera. Try again.',
      }))
    }
  }, [setVerification])

  return (
    <div>
      <h1 className="font-display text-3xl">Live selfie check</h1>
      <p className="mt-2 text-paper/60">
        Look at the camera and hold still for a second. This confirms it's really you.
      </p>

      <div className="relative mt-8 mx-auto h-72 w-72 overflow-hidden rounded-full border-4 border-paper/10">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-light text-sm text-paper/50 text-center px-4">
            {modelsLoading ? 'Loading AI models... (first time takes ~10 seconds)' : 'Starting camera...'}
          </div>
        )}
      </div>
      {/* Hidden reference image used only for the in-browser comparison */}
      <img ref={imgRef} src={data.profilePhotoPreview} alt="" className="hidden" crossOrigin="anonymous" />

      {verification.status !== 'idle' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-4 text-center text-sm ${
            verification.status === 'passed'
              ? 'text-sage'
              : verification.status === 'failed'
                ? 'text-ember'
                : 'text-paper/60'
          }`}
        >
          {verification.message}
        </motion.p>
      )}

      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="px-4 text-paper/50">
          Back
        </button>
        {verification.status === 'passed' ? (
          <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
        ) : verification.status === 'failed' ? (
          <PrimaryButton onClick={startCamera}>Retry camera</PrimaryButton>
        ) : (
          <PrimaryButton
            disabled={!cameraReady || verification.status === 'checking'}
            onClick={runCheck}
          >
            {verification.status === 'checking' ? 'Checking...' : 'Verify my face'}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

function ReviewStep({ data, verification }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" fill="currentColor" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-3xl">You're in the queue</h1>
      <p className="mt-3 text-paper/60">
        Hi {data.name || 'there'} — your selfie passed the automatic check and is now with a
        human moderator for final confirmation. This usually takes a few hours.
      </p>
      <p className="mt-6 text-sm text-paper/40">
        We'll email you at {data.email || 'your address'} once you're verified.
      </p>
    </div>
  )
}
