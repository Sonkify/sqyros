// Generate Integration Guide Edge Function
// Generates detailed AV integration setup guides using Claude Opus

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const OPUS_MODEL = 'claude-opus-4-5-20250101'

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

// Model costs for tracking
const OPUS_COSTS = {
  inputPer1k: 1.5,   // $15 per 1M = 1.5 cents per 1k
  outputPer1k: 7.5,  // $75 per 1M = 7.5 cents per 1k
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    (inputTokens / 1000 * OPUS_COSTS.inputPer1k) +
    (outputTokens / 1000 * OPUS_COSTS.outputPer1k)
  )
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get auth header for Supabase client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for tier check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', user.id)
      .single()

    const tier = profile?.tier || 'free'

    // Check usage limits for free users
    if (tier === 'free') {
      const yearMonth = new Date().toISOString().substring(0, 7)
      const { data: usage } = await supabase
        .from('monthly_usage')
        .select('guides_generated')
        .eq('user_id', user.id)
        .eq('year_month', yearMonth)
        .single()

      const guidesUsed = usage?.guides_generated || 0
      if (guidesUsed >= 3) {
        return new Response(
          JSON.stringify({
            error: 'limit_exceeded',
            message: 'Monthly guide limit reached (3/3). Upgrade to Pro for unlimited guides.',
            upgradeUrl: '/pricing',
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse request body
    const { system, device, connection, category } = await req.json()

    if (!system || !device || !connection) {
      return new Response(
        JSON.stringify({ error: 'system, device, and connection are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build the prompt
    const userMessage = `Generate a detailed integration setup guide for:

Core AV System: ${system}
Peripheral Device: ${device}
Device Category: ${category || 'General'}
Connection Type: ${connection}

Provide complete step-by-step instructions in JSON format.`

    // Call Claude API
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    console.log('Calling Claude API for guide generation...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: OPUS_MODEL,
        max_tokens: 4000,
        system: INTEGRATION_GUIDE_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Claude API error:', error)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const claudeResponse = await response.json()
    const content = claudeResponse.content[0]?.text || ''
    const usage = claudeResponse.usage || { input_tokens: 0, output_tokens: 0 }

    // Parse the JSON response
    let guide
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        guide = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse guide JSON:', parseError)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse guide response',
          rawContent: content,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Calculate cost
    const costCents = calculateCost(usage.input_tokens, usage.output_tokens)

    // Track usage
    const yearMonth = new Date().toISOString().substring(0, 7)

    // Log individual usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'guide',
      model_used: OPUS_MODEL,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_cents: costCents,
      metadata: { system, device, connection, category },
    })

    // Update monthly aggregates
    const { data: existingUsage } = await supabase
      .from('monthly_usage')
      .select('id, guides_generated, total_tokens, total_cost_cents')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    if (existingUsage) {
      await supabase
        .from('monthly_usage')
        .update({
          guides_generated: existingUsage.guides_generated + 1,
          total_tokens: existingUsage.total_tokens + usage.input_tokens + usage.output_tokens,
          total_cost_cents: existingUsage.total_cost_cents + costCents,
        })
        .eq('id', existingUsage.id)
    } else {
      await supabase.from('monthly_usage').insert({
        user_id: user.id,
        year_month: yearMonth,
        guides_generated: 1,
        questions_asked: 0,
        total_tokens: usage.input_tokens + usage.output_tokens,
        total_cost_cents: costCents,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        guide,
        meta: {
          model: OPUS_MODEL,
          taskType: 'integration_guide',
          usage: {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cost_cents: costCents,
          },
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Generate guide error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate guide',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
