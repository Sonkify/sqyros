import { SignUp, useAuth } from '@clerk/clerk-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useEffect } from 'react'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const { userId, isSignedIn } = useAuth()
  const referralCode = searchParams.get('ref')

  // Store referral code in sessionStorage when landing on signup page
  useEffect(() => {
    if (referralCode) {
      sessionStorage.setItem('sqyros_referral_code', referralCode)
    }
  }, [referralCode])

  // Track referral after user signs up
  useEffect(() => {
    async function trackReferral() {
      const storedCode = sessionStorage.getItem('sqyros_referral_code')
      if (isSignedIn && userId && storedCode) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-referral`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referralCode: storedCode,
                userId: userId
              })
            }
          )
          const data = await response.json()
          if (data.success) {
            console.log('Referral tracked successfully')
            sessionStorage.removeItem('sqyros_referral_code')
          }
        } catch (err) {
          console.error('Error tracking referral:', err)
        }
      }
    }
    trackReferral()
  }, [isSignedIn, userId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 w-full">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">Sqyros</span>
          </Link>
          <p className="text-gray-600 mt-2">Built by AV Pros, for AV Pros</p>
          {referralCode && (
            <p className="text-sm text-green-600 mt-2 bg-green-50 px-3 py-1 rounded-full inline-block">
              🎁 You were invited by a friend!
            </p>
          )}
        </div>

        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  )
}
