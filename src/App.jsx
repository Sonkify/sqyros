import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Layout from '@/components/shared/Layout'

// Pages
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import GuideGenerator from '@/pages/GuideGenerator'
import MaintenanceChat from '@/pages/MaintenanceChat'
import SavedGuides from '@/pages/SavedGuides'
import Pricing from '@/pages/Pricing'
import PublicGuidePage from '@/pages/PublicGuidePage'
import SEOGuidePage from '@/pages/SEOGuidePage'
import GuidesDirectory from '@/pages/GuidesDirectory'
import Referrals from '@/pages/Referrals'
import ProfileSetup from '@/pages/ProfileSetup'
import CommunityGuides from '@/pages/CommunityGuides'
import Leaderboard from '@/pages/Leaderboard'

// Protected route wrapper
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>
        <Layout>{children}</Layout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/guide/:publicId" element={<PublicGuidePage />} />
      <Route path="/guides" element={<GuidesDirectory />} />
      <Route path="/guides/:slug" element={<SEOGuidePage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/generate-guide"
        element={
          <ProtectedRoute>
            <GuideGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <MaintenanceChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved-guides"
        element={
          <ProtectedRoute>
            <SavedGuides />
          </ProtectedRoute>
        }
      />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Community guides */}
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <CommunityGuides />
          </ProtectedRoute>
        }
      />
      {/* Leaderboard */}
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      {/* Profile setup */}
      <Route
        path="/profile/setup"
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />
      {/* Referrals */}
      <Route
        path="/referrals"
        element={
          <ProtectedRoute>
            <Referrals />
          </ProtectedRoute>
        }
      />
      {/* 404 fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-4">Page not found</p>
              <a href="/dashboard" className="text-blue-600 hover:underline">
                Go to Dashboard
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  )
}
