// Get Public Guide Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const url = new URL(req.url)
    const publicId = url.searchParams.get('id')

    if (!publicId) {
      return new Response(
        JSON.stringify({ error: 'Missing guide ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: guide, error } = await supabase
      .from('saved_guides')
      .select('id, public_id, title, core_system, peripheral_device, connection_type, category, guide_content, created_by_username, view_count, created_at')
      .eq('public_id', publicId)
      .eq('is_public', true)
      .single()

    if (error || !guide) {
      return new Response(
        JSON.stringify({ error: 'Guide not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment view count
    await supabase
      .from('saved_guides')
      .update({ view_count: (guide.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq('id', guide.id)

    // Optional viewer tracking
    let viewerId = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      viewerId = getUserIdFromJwt(token)
    }

    const viewerIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    const referrer = req.headers.get('referer') || null

    // Insert view record (ignore errors)
    try {
      await supabase.from('guide_views').insert({
        guide_id: guide.id,
        viewer_id: viewerId,
        viewer_ip: viewerIp,
        referrer: referrer,
      })
    } catch (e) {
      // Ignore view tracking errors
    }

    return new Response(
      JSON.stringify({ success: true, guide }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Get public guide error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch guide' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
