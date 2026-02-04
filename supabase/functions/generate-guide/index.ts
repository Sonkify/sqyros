import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

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
7. Connection Diagram - A Mermaid flowchart showing signal flow

CRITICAL: Output ONLY valid JSON with NO markdown formatting, NO code blocks, NO backticks.
Start your response directly with { and end with }

Use this exact schema:
{
  "title": "Device A → System B",
  "subtitle": "via Connection Type",
  "complexity": "simple|medium|complex",
  "estimatedTime": "15-30 minutes",
  "diagram": "graph LR\\n    A[Device A] -->|Connection| B[System B]",
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

For the "diagram" field:
- Use Mermaid flowchart syntax (graph LR or graph TD)
- Show actual signal flow between devices
- Use \\n for newlines
- Keep it simple (5-10 nodes max)

Be precise with model numbers and technical specifications.
Output ONLY the JSON object - no explanation, no markdown.`

const OPUS_COSTS = { inputPer1k: 1.5, outputPer1k: 7.5 }

function calculateCost(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    (inputTokens / 1000 * OPUS_COSTS.inputPer1k) +
    (outputTokens / 1000 * OPUS_COSTS.outputPer1k)
  )
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

// Clean and parse Claude's response - handles markdown code blocks
function parseClaudeResponse(text: string): Record<string, unknown> | null {
  let cleaned = text.trim()
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    // Remove opening ```json or ```
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '')
    // Remove closing ```
    cleaned = cleaned.replace(/\n?```\s*$/, '')
  }
  
  // Try to find JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  }
  
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.error('JSON parse error:', e)
    console.error('Attempted to parse:', cleaned.substring(0, 500))
    return null
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.slice(7)
    const payload = decodeJwtPayload(token)
    const userId = payload?.sub as string
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check tier and limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .single()

    const tier = profile?.tier || 'free'

    if (tier === 'free') {
      const yearMonth = new Date().toISOString().substring(0, 7)
      const { data: usage } = await supabase
        .from('monthly_usage')
        .select('guides_generated')
        .eq('user_id', userId)
        .eq('year_month', yearMonth)
        .single()

      if ((usage?.guides_generated || 0) >= 10) {
        return new Response(
          JSON.stringify({ error: 'Monthly limit reached', code: 'LIMIT_REACHED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { system, device, connection, category } = await req.json()
    if (!system || !device || !connection) {
      return new Response(
        JSON.stringify({ error: 'Missing: system, device, connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userPrompt = `Generate a detailed integration guide for connecting a ${device} to a ${system} system using ${connection} connection.
${category ? `Device category: ${category}` : ''}

Remember: Output ONLY valid JSON, no markdown, no code blocks. Start with { and end with }`

    console.log('Calling Claude API...')
    
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
      console.error('Claude API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to generate guide' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const rawContent = result.content[0]?.text || ''
    
    console.log('Raw Claude response (first 500 chars):', rawContent.substring(0, 500))
    
    // Parse the response, handling markdown code blocks
    let guideContent = parseClaudeResponse(rawContent)
    
    if (!guideContent || !guideContent.steps) {
      console.error('Failed to parse guide content, raw:', rawContent.substring(0, 1000))
      // Create a fallback structure
      guideContent = {
        title: `${device} → ${system}`,
        subtitle: `via ${connection}`,
        complexity: 'medium',
        estimatedTime: '30-45 minutes',
        prerequisites: ['Check device compatibility', 'Ensure network connectivity'],
        steps: [
          {
            stepNumber: 1,
            title: 'Initial Setup',
            content: 'The guide could not be fully generated. Please try again.',
          }
        ],
        verification: ['Test the connection'],
        troubleshooting: [
          { issue: 'Connection failed', solution: 'Check cables and network settings' }
        ],
        _parseError: true,
        _rawContent: rawContent.substring(0, 2000)
      }
    }

    // Track usage
    const inputTokens = result.usage?.input_tokens || 0
    const outputTokens = result.usage?.output_tokens || 0
    const costCents = calculateCost(inputTokens, outputTokens)

    await supabase.from('usage_logs').insert({
      user_id: userId,
      action_type: 'guide',
      model_used: OPUS_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_cents: costCents,
      metadata: { system, device, connection, category },
    })

    const yearMonth = new Date().toISOString().substring(0, 7)
    const { data: existingUsage } = await supabase
      .from('monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .single()

    if (existingUsage) {
      await supabase.from('monthly_usage').update({
        guides_generated: existingUsage.guides_generated + 1,
        total_tokens: existingUsage.total_tokens + inputTokens + outputTokens,
        total_cost_cents: existingUsage.total_cost_cents + costCents,
      }).eq('id', existingUsage.id)
    } else {
      await supabase.from('monthly_usage').insert({
        user_id: userId,
        year_month: yearMonth,
        guides_generated: 1,
        total_tokens: inputTokens + outputTokens,
        total_cost_cents: costCents,
      })
    }

    console.log('Guide generated successfully with', guideContent.steps?.length || 0, 'steps')

    return new Response(
      JSON.stringify({ guide: guideContent, usage: { inputTokens, outputTokens, costCents } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
