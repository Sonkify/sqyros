import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useUser, useAuth as useClerkAuth, useSession } from '@clerk/clerk-react'
import { createClerkSupabaseClient, getUserProfile } from '../api/supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser()
  const { getToken, signOut: clerkSignOut } = useClerkAuth()
  const { session } = useSession()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const supabaseClient = useMemo(() => {
    if (!getToken) return null
    return createClerkSupabaseClient(getToken)
  }, [getToken])

  useEffect(() => {
    async function loadProfile() {
      if (!isUserLoaded) return
      if (!clerkUser || !supabaseClient) {
        setProfile(null)
        setLoading(false)
        return
      }
      try {
        const profileData = await getUserProfile(supabaseClient, clerkUser.id)
        setProfile(profileData)
      } catch (error) {
        console.log('Profile not found, creating one...')
        try {
          const { data, error: insertError } = await supabaseClient
            .from('user_profiles')
            .insert({
              id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              full_name: clerkUser.fullName || '',
              tier: 'free',
            })
            .select()
            .single()
          if (insertError) {
            console.error('Error creating profile:', insertError)
          } else {
            setProfile(data)
          }
        } catch (createError) {
          console.error('Error creating profile:', createError)
        }
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [clerkUser, isUserLoaded, supabaseClient])

  async function signOut() {
    await clerkSignOut()
    setProfile(null)
  }

  const value = {
    user: clerkUser ? {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
    } : null,
    profile,
    session,
    loading,
    isAuthenticated: !!clerkUser,
    isPro: profile?.tier === 'pro',
    signOut,
    supabaseClient,
    getToken,
    refreshProfile: async () => {
      if (clerkUser && supabaseClient) {
        try {
          const profileData = await getUserProfile(supabaseClient, clerkUser.id)
          setProfile(profileData)
        } catch (error) {
          console.error('Error refreshing profile:', error)
        }
      }
    },
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
