// Share Guide Edge Function
// Toggles guide visibility (public/private) and returns shareable URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decode JWT to get user ID (Clerk puts it in 'sub' claim)
function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.sub || null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const userId = getUserIdFromJwt(token)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { guideId, makePublic } = await req.json()

    if (!guideId) {
      return new Response(
        JSON.stringify({ error: 'guideId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingGuide, error: fetchError } = await supabase
      .from('saved_guides')
      .select('id, user_id, public_id, is_public')
      .eq('id', guideId)
      .single()

    if (fetchError || !existingGuide) {
      return new Response(
        JSON.stringify({ error: 'Guide not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingGuide.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'You do not own this guide' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single()

    const username = profile?.username || profile?.full_name || 'Anonymous'

    const updateData: Record<string, unknown> = { is_public: makePublic }
    if (makePublic) {
      updateData.created_by_username = username
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://sqyros.com'
    const shareUrl = makePublic && updatedGuide?.public_id
      ? appUrl + '/guide/' + updatedGuide.public_id
      : null

    return new Response(
      JSON.stringify({
        success: true,
        isPublic: updatedGuide?.is_public,
        publicId: updatedGuide?.public_id,
        shareUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Share guide error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to share guide' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
