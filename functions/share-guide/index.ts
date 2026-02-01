// Share Guide Edge Function
// Toggles guide visibility (public/private) and returns shareable URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { guideId, makePublic } = await req.json()

    if (!guideId) {
      return new Response(
        JSON.stringify({ error: 'guideId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user owns this guide
    const { data: existingGuide, error: fetchError } = await supabase
      .from('saved_guides')
      .select('id, user_id, public_id, is_public')
      .eq('id', guideId)
      .single()

    if (fetchError || !existingGuide) {
      return new Response(
        JSON.stringify({ error: 'Guide not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (existingGuide.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You do not own this guide' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's display name for attribution
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const username = profile?.full_name || user.email?.split('@')[0] || 'Anonymous'

    // Update guide visibility
    const updateData: Record<string, unknown> = {
      is_public: makePublic,
    }

    // Only set username when making public
    if (makePublic) {
      updateData.created_by_username = username
      // Increment share_count if this is a new share action
      if (!existingGuide.is_public) {
        updateData.share_count = 1 // Will be incremented by trigger or directly
      }
    }

    const { data: updatedGuide, error: updateError } = await supabase
      .from('saved_guides')
      .update(updateData)
      .eq('id', guideId)
      .select('public_id, is_public')
      .single()

    if (updateError) {
      console.error('Failed to update guide:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update guide' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Increment share_count separately if making public for the first time
    if (makePublic && !existingGuide.is_public) {
      await supabase.rpc('increment_share_count', { guide_id: guideId }).catch(() => {
        // If RPC doesn't exist, do it manually
        supabase
          .from('saved_guides')
          .update({ share_count: (existingGuide as any).share_count + 1 || 1 })
          .eq('id', guideId)
      })
    }

    // Build the share URL
    const appUrl = Deno.env.get('APP_URL') || 'https://sqyros.com'
    const shareUrl = makePublic && updatedGuide?.public_id
      ? `${appUrl}/guide/${updatedGuide.public_id}`
      : null

    return new Response(
      JSON.stringify({
        success: true,
        isPublic: updatedGuide?.is_public,
        publicId: updatedGuide?.public_id,
        shareUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Share guide error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to share guide' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
