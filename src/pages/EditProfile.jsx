import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const inputClass = 'w-full rounded-xl border border-paper/15 bg-ink-light px-4 py-3 text-paper placeholder:text-paper/30 focus:border-ember outline-none transition-colors'

export default function EditProfile() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState({
    name: '', age: '', bio: '', gender: '', photo_url: '',
  })
  const [newPhotoFile, setNewPhotoFile] = useState(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/onboarding'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [navigate])

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhotoFile(file)
    setNewPhotoPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let photo_url = profile.photo_url

      if (newPhotoFile) {
        // Always use jpg to avoid extension issues
        const path = `${user.id}/profile.jpg`
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(path, newPhotoFile, { upsert: true, contentType: newPhotoFile.type || 'image/jpeg' })
        if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
        // Force cache-bust so browser shows new photo immediately
        const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl + '?t=' + Date.now()
      }

      const { error: updateError } = await supabase.from('profiles').update({
        name: profile.name,
        age: parseInt(profile.age),
        bio: profile.bio,
        photo_url,
      }).eq('id', user.id)
      if (updateError) throw updateError

      setProfile((p) => ({ ...p, photo_url }))
      setNewPhotoFile(null)
      setNewPhotoPreview(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-paper/50">Loading...</p>
      </div>
    )
  }

  const displayPhoto = newPhotoPreview || profile.photo_url

  return (
    <div className="min-h-screen bg-ink px-6 py-10 text-paper">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/discover')} className="text-paper/50 hover:text-paper">
            ← Back
          </button>
          <h1 className="font-display text-2xl">Edit profile</h1>
          <div className="flex gap-3">
            <button onClick={() => navigate('/help')} className="text-sm text-paper/40 hover:text-paper">Help</button>
            <button onClick={signOut} className="text-sm text-paper/40 hover:text-ember">Sign out</button>
          </div>
        </div>

        {/* Photo */}
        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-paper/20 bg-ink-light"
          >
            {displayPhoto
              ? <img src={displayPhoto} alt="Profile" className="h-full w-full object-cover" />
              : <span className="text-paper/30 text-sm">Add photo</span>}
            <div className="absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs text-paper">Change</span>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <p className="mt-2 text-xs text-paper/40">Tap to change photo</p>
          {newPhotoFile && (
            <p className="mt-1 text-xs text-gold">New photo selected — save to apply</p>
          )}
        </div>

        {/* Verified badge */}
        {profile.verified && (
          <div className="mt-4 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm text-gold">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
              </svg>
              Verified
            </span>
          </div>
        )}
        {!profile.verified && (
          <p className="mt-4 text-center text-xs text-paper/40">
            Pending verification — you'll appear in Discover once approved
          </p>
        )}

        {/* Fields */}
        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-paper/60">Name</label>
            <input
              className={inputClass}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-paper/60">Age</label>
            <input
              type="number"
              min="18"
              className={inputClass}
              value={profile.age}
              onChange={(e) => setProfile({ ...profile, age: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-paper/60">Gender</label>
            <div className="flex gap-3">
              {['Man', 'Woman'].map((g) => (
                <button
                  key={g}
                  onClick={() => setProfile({ ...profile, gender: g })}
                  className={`flex-1 rounded-xl border py-3 text-sm transition-colors ${
                    profile.gender === g
                      ? 'border-ember bg-ember/15 text-ember'
                      : 'border-paper/15 text-paper/70'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-paper/30">Gender can't be changed after verification</p>
          </div>
          <div>
            <label className="mb-2 block text-sm text-paper/60">Bio</label>
            <textarea
              className={inputClass}
              rows={4}
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell people a bit about yourself..."
              maxLength={200}
            />
            <p className="mt-1 text-right text-xs text-paper/30">{(profile.bio || '').length}/200</p>
          </div>
        </div>

        {/* Error / success */}
        {error && <p className="mt-4 text-sm text-ember">{error}</p>}
        {success && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-sage"
          >
            Profile saved!
          </motion.p>
        )}

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="mt-8 w-full rounded-full bg-ember py-3 font-medium text-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
