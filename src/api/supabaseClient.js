import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Standard client for public queries (no auth needed)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Creates a Supabase client that uses Clerk's JWT token
// This lets Supabase know WHO the user is, so RLS policies work
export function createClerkSupabaseClient(getToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await getToken({ template: 'supabase' })
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${clerkToken}`)
        return fetch(url, { ...options, headers })
      },
    },
  })
}

// Creates a Supabase client with a pre-obtained token
export function createAuthenticatedClient(token) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token}`)
        return fetch(url, { ...options, headers })
      },
    },
  })
}

// ============ Database helper functions ============

export async function getUserProfile(client, userId) {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateUserProfile(client, userId, updates) {
  const { data, error } = await client
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSavedGuides(client, userId) {
  const { data, error } = await client
    .from('saved_guides')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveGuide(client, userId, guide) {
  const { data, error } = await client
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

export async function deleteGuide(client, guideId) {
  const { error } = await client
    .from('saved_guides')
    .delete()
    .eq('id', guideId)
  if (error) throw error
}

export async function toggleGuideFavorite(client, guideId, isFavorite) {
  const { data, error } = await client
    .from('saved_guides')
    .update({ is_favorite: isFavorite })
    .eq('id', guideId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMonthlyUsage(client, userId) {
  const yearMonth = new Date().toISOString().substring(0, 7)
  const { data, error } = await client
    .from('monthly_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('year_month', yearMonth)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || { guides_generated: 0, questions_asked: 0 }
}

export async function getDailyQuestionCount(client, userId) {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await client
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'question')
    .gte('created_at', today)
  if (error) throw error
  return count || 0
}

export async function getChatSession(userId, token) {
  const client = createAuthenticatedClient(token)
  const { data, error } = await client
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveChatSession(userId, messages, token) {
  const client = createAuthenticatedClient(token)
  const { data: existing } = await client
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    const { data, error } = await client
      .from('chat_sessions')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await client
      .from('chat_sessions')
      .insert({ user_id: userId, messages })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function invokeEdgeFunction(getToken, functionName, body) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  console.log('invokeEdgeFunction called:', functionName, supabaseUrl)
  const clerkToken = await getToken({ template: 'supabase' })
  console.log('Got clerk token:', clerkToken ? 'yes' : 'no')
  
  const response = await fetch(
    supabaseUrl + '/functions/v1/' + functionName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + clerkToken,
      },
      body: JSON.stringify(body),
    }
  )
  
  const data = await response.json()
  console.log('Edge function response:', response.status, data)
  if (!response.ok) {
    throw new Error(data.error || 'Edge function failed')
  }
  return data
}

export async function getPublicGuide(publicId) {
  const response = await fetch(
    supabaseUrl + '/functions/v1/get-public-guide?id=' + publicId
  )
  const result = await response.json()
  if (!response.ok || result.error) {
    throw new Error(result.error || 'Failed to fetch guide')
  }
  return result.guide
}

export async function shareGuide(client, getToken, guideId, makePublic) {
  const clerkToken = await getToken({ template: 'supabase' })
  const response = await fetch(
    supabaseUrl + '/functions/v1/share-guide',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + clerkToken,
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

export async function getGuideViewStats(client, guideId) {
  const { data, error } = await client
    .from('guide_views')
    .select('created_at, referrer')
    .eq('guide_id', guideId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}
