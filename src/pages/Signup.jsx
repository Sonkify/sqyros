import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-white">Sqyros</span>
          </Link>
          <p className="text-blue-200 mt-2">Built by AV Pros, for AV Pros</p>
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