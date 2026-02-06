// Maintenance Q&A Chat Edge Function
// Handles AV maintenance questions with intelligent model routing

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const MODELS = {
  OPUS: 'claude-opus-4-5-20250101',
  SONNET: 'claude-sonnet-4-5-20250929',
}

const MAINTENANCE_QA_PROMPT = `You are Sqyros, an expert AV maintenance assistant created by avnova.ai.

Provide quick, accurate answers to AV maintenance questions. Focus on:
- Firmware update procedures
- Factory reset methods
- Network/IP configuration
- LED status indicators
- Common error messages
- Control protocol commands (RS-232, Telnet)
- Password recovery
- Basic troubleshooting

Keep responses concise but complete. Use bullet points for multi-step procedures.
Include specific button combinations, menu paths, and commands where applicable.
Always mention which software tools are needed (e.g., Shure Designer, Q-SYS Configurator).

If you're unsure about a specific model's procedure, say so and provide general guidance.

For equipment you know well, include:
- Default IP addresses and login credentials
- Recommended firmware versions
- Known issues and workarounds
- Best practices for configuration`

// Task classification for routing
const COMPLEX_INDICATORS = [
  'custom', 'unusual', 'special', 'advanced', 'complex', 'multiple',
  'chain', 'daisy', 'redundant', 'failover', 'multi-zone', 'enterprise',
  'integrate', 'connect', 'setup', 'configure', 'compatible'
]

function shouldUseOpus(message: string): boolean {
  const lower = message.toLowerCase()
  return COMPLEX_INDICATORS.some(ind => lower.includes(ind))
}

// Model costs
const MODEL_COSTS = {
  [MODELS.OPUS]: { inputPer1k: 1.5, outputPer1k: 7.5 },
  [MODELS.SONNET]: { inputPer1k: 0.3, outputPer1k: 1.5 },
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS[MODELS.SONNET]
  return Math.ceil(
    (inputTokens / 1000 * costs.inputPer1k) +
    (outputTokens / 1000 * costs.outputPer1k)
  )
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Decode Clerk JWT to get user ID
    const token = authHeader.replace('Bearer ', '')
    let userId: string
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub
      if (!userId) {
        throw new Error('No user ID in token')
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .single()

    const tier = profile?.tier || 'free'

    // Check daily question limits for free users
    if (tier === 'free') {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'question')
        .gte('created_at', today)

      if ((count || 0) >= 5) {
        return new Response(
          JSON.stringify({
            error: 'limit_exceeded',
            message: 'Daily question limit reached (5/5). Upgrade to Pro for unlimited questions.',
            upgradeUrl: '/pricing',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse request
    const { message, conversationHistory = [] } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine model to use
    const useOpus = shouldUseOpus(message)
    const model = useOpus ? MODELS.OPUS : MODELS.SONNET
    const maxTokens = useOpus ? 2000 : 1000

    console.log(`Using model ${model} for message: ${message.substring(0, 50)}...`)

    // Build messages array
    const messages = [
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message },
    ]

    // Call Claude API
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: MAINTENANCE_QA_PROMPT,
        messages,
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

    // Calculate cost
    const costCents = calculateCost(model, usage.input_tokens, usage.output_tokens)

    // Track usage
    const yearMonth = new Date().toISOString().substring(0, 7)

    // Log individual usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      action_type: 'question',
      model_used: model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_cents: costCents,
      metadata: { message_preview: message.substring(0, 100) },
    })

    // Update monthly aggregates
    const { data: existingUsage } = await supabase
      .from('monthly_usage')
      .select('id, questions_asked, total_tokens, total_cost_cents')
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .single()

    if (existingUsage) {
      await supabase
        .from('monthly_usage')
        .update({
          questions_asked: existingUsage.questions_asked + 1,
          total_tokens: existingUsage.total_tokens + usage.input_tokens + usage.output_tokens,
          total_cost_cents: existingUsage.total_cost_cents + costCents,
        })
        .eq('id', existingUsage.id)
    } else {
      await supabase.from('monthly_usage').insert({
        user_id: userId,
        year_month: yearMonth,
        guides_generated: 0,
        questions_asked: 1,
        total_tokens: usage.input_tokens + usage.output_tokens,
        total_cost_cents: costCents,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: content,
        meta: {
          model,
          taskType: useOpus ? 'complex_query' : 'simple_qa',
          reasoning: useOpus
            ? 'Complex query routed to advanced model'
            : 'Simple query - fast response',
          usage: {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cost_cents: costCents,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process message',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
