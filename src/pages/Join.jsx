import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// This page captures the referral code and redirects to onboarding
export default function Join() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ref = params.get('ref')

  useEffect(() => {
    if (ref) {
      // Store ref code in sessionStorage so onboarding can pick it up
      sessionStorage.setItem('referral_code', ref)
    }
    navigate('/onboarding')
  }, [ref, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <p className="text-paper/50">Loading Nearby...</p>
    </div>
  )
}
