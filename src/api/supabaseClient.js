import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Saved Guides API
export async function getSavedGuides(userId) {
  const { data, error } = await supabase
    .from('saved_guides')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function saveGuide(userId, guide) {
  const { data, error } = await supabase
    .from('saved_guides')
    .insert({
      user_id: userId,
      title: guide.title,
      core_system: guide.coreSystem,
      peripheral_device: guide.peripheralDevice,
      connection_type: guide.connectionType,
      guide_content: guide.content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteGuide(guideId) {
  const { error } = await supabase
    .from('saved_guides')
    .delete()
    .eq('id', guideId)

  if (error) throw error
}

export async function toggleGuideFavorite(guideId, isFavorite) {
  const { data, error } = await supabase
    .from('saved_guides')
    .update({ is_favorite: isFavorite })
    .eq('id', guideId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Usage API
export async function getMonthlyUsage(userId) {
  const yearMonth = new Date().toISOString().substring(0, 7)
  const { data, error } = await supabase
    .from('monthly_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('year_month', yearMonth)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data || { guides_generated: 0, questions_asked: 0 }
}

export async function getDailyQuestionCount(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'question')
    .gte('created_at', today)

  if (error) throw error
  return count || 0
}

// Chat Sessions API
export async function getChatSession(userId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveChatSession(userId, messages) {
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, messages })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Edge Function helpers
export async function invokeEdgeFunction(functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  })

  if (error) throw error
  return data
}

// Public Guide Sharing API
export async function getPublicGuide(publicId) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-public-guide?id=${publicId}`
  )
  const result = await response.json()

  if (!response.ok || result.error) {
    throw new Error(result.error || 'Failed to fetch guide')
  }

  return result.guide
}

export async function shareGuide(guideId, makePublic) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Authentication required')
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/share-guide`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ guideId, makePublic }),
    }
  )

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to share guide')
  }

  return result
}

export async function getGuideViewStats(guideId) {
  const { data, error } = await supabase
    .from('guide_views')
    .select('created_at, referrer')
    .eq('guide_id', guideId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data
}
