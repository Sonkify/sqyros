// Generate Integration Guide Edge Function
// Generates detailed AV integration setup guides using Claude

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { verify } from 'https://deno.land/x/djwt@v3.0.1/mod.ts'

const OPUS_MODEL = 'claude-sonnet-4-20250514'

const INTEGRATION_GUIDE_PROMPT = `You are Sqyros, an expert AV integration assistant created by avnova.ai.
Your task is to generate detailed, accurate setup guides for connecting AV devices.

When generating integration guides, always include:
1. Prerequisites - Required software, network requirements, cables
2. Network Configuration - IP settings, VLANs, subnets
3. Device Configuration - Step-by-step for each device
4. Signal Routing - How to connect audio/video/control signals
5. Verification Steps - How to confirm successful integration
6. Troubleshooting - Common issues and solutions

Format your response as structured JSON with this exact schema:
{
  "title": "Device A → System B",
  "subtitle": "via Connection Type",
  "complexity": "simple|medium|complex",
  "estimatedTime": "15-30 minutes",
  "prerequisites": ["item1", "item2"],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step Title",
      "content": "Detailed instructions...",
      "tips": ["optional tips"],
      "warnings": ["optional warnings"],
      "code": "optional command or config snippet"
    }
  ],
  "verification": ["check1", "check2"],
  "troubleshooting": [
    {"issue": "Problem description", "solution": "How to fix"}
  ]
}

Use your deep knowledge of:
- Dante/AES67 audio networking
- QSC Q-SYS, Crestron, Biamp Tesira, Extron ecosystems
- Control protocols (RS-232, IP, IR)
- Video distribution (HDMI, HDBaseT, AV-over-IP)
- UC platforms (Zoom, Teams, Webex)

Be precise with model numbers, software versions, and technical specifications.
Only output valid JSON - no markdown code blocks or extra text.`

const OPUS_COSTS = {
  inputPer1k: 1.5,
  outputPer1k: 7.5,
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    (inputTokens / 1000 * OPUS_COSTS.inputPer1k) +
    (outputTokens / 1000 * OPUS_COSTS.outputPer1k)
  )
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract user ID from Clerk JWT (we trust Clerk's signature verification happened client-side)
    const token = authHeader.replace('Bearer ', '')
    const userId = getUserIdFromJwt(token)
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User ID from token:', userId)

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user profile for tier check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .single()

    const tier = profile?.tier || 'free'
    console.log('User tier:', tier)

    // Check usage limits for free users
    if (tier === 'free') {
      const yearMonth = new Date().toISOString().substring(0, 7)
      const { data: usage } = await supabase
        .from('monthly_usage')
        .select('guides_generated')
        .eq('user_id', userId)
        .eq('year_month', yearMonth)
        .single()

      const guidesUsed = usage?.guides_generated || 0
      if (guidesUsed >= 10) {
        return new Response(
          JSON.stringify({ 
            error: 'Monthly guide limit reached. Upgrade to Pro for unlimited guides.',
            code: 'LIMIT_REACHED'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse request body
    const { system, device, connection, category } = await req.json()

    if (!system || !device || !connection) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: system, device, connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Generating guide for:', system, device, connection)

    // Generate guide using Claude
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userPrompt = `Generate a detailed integration guide for connecting a ${device} to a ${system} system using ${connection} connection.
${category ? `Device category: ${category}` : ''}

Include specific configuration steps, IP settings, signal routing, and troubleshooting tips.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: OPUS_MODEL,
        max_tokens: 4096,
        system: INTEGRATION_GUIDE_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Anthropic API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to generate guide' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const content = result.content[0]?.text || ''
    
    // Parse the JSON response
    let guideContent
    try {
      guideContent = JSON.parse(content)
    } catch {
      guideContent = {
        title: `${device} → ${system}`,
        subtitle: `via ${connection}`,
        content: content,
      }
    }

    // Track usage
    const inputTokens = result.usage?.input_tokens || 0
    const outputTokens = result.usage?.output_tokens || 0
    const costCents = calculateCost(inputTokens, outputTokens)

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      action_type: 'guide',
      model_used: OPUS_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_cents: costCents,
      metadata: { system, device, connection, category },
    })

    // Update monthly usage
    const yearMonth = new Date().toISOString().substring(0, 7)
    const { data: existingUsage } = await supabase
      .from('monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .single()

    if (existingUsage) {
      await supabase
        .from('monthly_usage')
        .update({
          guides_generated: existingUsage.guides_generated + 1,
          total_tokens: existingUsage.total_tokens + inputTokens + outputTokens,
          total_cost_cents: existingUsage.total_cost_cents + costCents,
        })
        .eq('id', existingUsage.id)
    } else {
      await supabase.from('monthly_usage').insert({
        user_id: userId,
        year_month: yearMonth,
        guides_generated: 1,
        total_tokens: inputTokens + outputTokens,
        total_cost_cents: costCents,
      })
    }

    console.log('Guide generated successfully')

    return new Response(
      JSON.stringify({
        guide: guideContent,
        usage: { inputTokens, outputTokens, costCents },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
