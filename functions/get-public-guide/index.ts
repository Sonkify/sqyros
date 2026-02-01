// Get Public Guide Edge Function
// Fetches a public guide by its public_id without requiring authentication

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get public_id from query params
    const url = new URL(req.url)
    const publicId = url.searchParams.get('id')

    if (!publicId) {
      return new Response(
        JSON.stringify({ error: 'Missing guide ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch the public guide
    const { data: guide, error } = await supabase
      .from('saved_guides')
      .select(`
        id,
        public_id,
        title,
        core_system,
        peripheral_device,
        connection_type,
        category,
        guide_content,
        created_by_username,
        view_count,
        created_at
      `)
      .eq('public_id', publicId)
      .eq('is_public', true)
      .single()

    if (error || !guide) {
      return new Response(
        JSON.stringify({ error: 'Guide not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Increment view count and update last_viewed_at
    await supabase
      .from('saved_guides')
      .update({
        view_count: guide.view_count + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq('id', guide.id)

    // Log view for analytics
    const viewerIp = req.headers.get('x-forwarded-for') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown'
    const referrer = req.headers.get('referer') || null
    const userAgent = req.headers.get('user-agent') || null

    // Check if viewer is authenticated (optional)
    let viewerId = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      viewerId = user?.id || null
    }

    await supabase.from('guide_views').insert({
      guide_id: guide.id,
      viewer_id: viewerId,
      viewer_ip: viewerIp,
      referrer: referrer,
      user_agent: userAgent,
    })

    return new Response(
      JSON.stringify({
        success: true,
        guide
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Get public guide error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch guide' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
