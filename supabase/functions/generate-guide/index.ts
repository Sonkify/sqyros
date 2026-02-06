import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const INTEGRATION_GUIDE_PROMPT = `You are Sqyros, an expert AV integration assistant created by avnova.ai.

Your task is to generate a detailed, accurate setup guide based on the research provided below.

The research contains verified information from manufacturer documentation. Use this information to create the guide.

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
  ],
  "sources": [
    {"name": "Source Title", "url": "https://..."}
  ],
  "disclaimer": "This guide was generated with AI assistance using manufacturer documentation. Always verify critical settings against official sources before deployment."
}

For the "diagram" field:
- Use Mermaid flowchart syntax (graph LR or graph TD)
- Show actual signal flow between devices
- Use \\n for newlines
- Keep it simple (5-10 nodes max)

Be precise with model numbers, IP addresses, and technical specifications from the research.
Output ONLY the JSON object - no explanation, no markdown.`

// Founder emails get unlimited access
const FOUNDER_EMAILS = ['sony@avnova.ai']

const CLAUDE_COSTS = { inputPer1k: 0.3, outputPer1k: 1.5 }

function calculateCost(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    (inputTokens / 1000 * CLAUDE_COSTS.inputPer1k) +
    (outputTokens / 1000 * CLAUDE_COSTS.outputPer1k)
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

function parseClaudeResponse(text: string): Record<string, unknown> | null {
  let cleaned = text.trim()
  
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n')
    lines.shift()
    while (lines.length && !lines[lines.length - 1].includes('}')) {
      lines.pop()
    }
    if (lines.length && lines[lines.length - 1].trim() === '```') {
      lines.pop()
    }
    cleaned = lines.join('\n').trim()
  }
  
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use Perplexity to research manufacturer documentation
async function researchWithPerplexity(
  peripheral: { name: string; brand: string },
  coreSystem: { name: string; brand: string },
  connectionType: string
): Promise<{ content: string; citations: string[] }> {
  const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')
  
  if (!perplexityKey) {
    console.log('Perplexity API key not configured, skipping research')
    return { content: '', citations: [] }
  }

  const query = `Find official manufacturer documentation for integrating ${peripheral.name} by ${peripheral.brand} with ${coreSystem.name} by ${coreSystem.brand} using ${connectionType}.

I need:
1. Default IP address and network settings for ${peripheral.name}
2. ${connectionType} configuration steps for ${peripheral.name}
3. How to add/discover ${peripheral.name} in ${coreSystem.name}
4. Required software tools (e.g., Shure Designer, Q-SYS Configurator)
5. Default login credentials if applicable
6. Any known compatibility notes or firmware requirements

Focus on official documentation from ${peripheral.brand}.com and ${coreSystem.brand}.com`

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + perplexityKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a technical research assistant. Find and summarize official manufacturer documentation for AV equipment integration. Always cite your sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        return_citations: true,
        search_recency_filter: 'year'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error:', response.status, errorText)
      return { content: '', citations: [] }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const citations = data.citations || []

    console.log('Perplexity research completed, found', citations.length, 'sources')
    
    return { content, citations }
  } catch (error) {
    console.error('Perplexity research error:', error)
    return { content: '', citations: [] }
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
    const payload = decodeJwtPayload(token)
    if (!payload?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId = payload.sub as string

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .single()

    const tier = profile?.tier || 'free'

    if (tier === 'free') {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'guide')
        .gte('created_at', today)

      if ((count || 0) >= 3) {
        return new Response(
          JSON.stringify({
            error: 'limit_exceeded',
            message: 'Daily guide limit reached (3/3). Upgrade to Pro for unlimited guides.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { coreSystem, peripheral, connectionType } = await req.json()

    if (!coreSystem || !peripheral) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Generating guide for:', peripheral.name, '->', coreSystem.name)

    // Step 1: Research with Perplexity
    const research = await researchWithPerplexity(
      peripheral,
      coreSystem,
      connectionType || 'Dante/AES67'
    )

    // Step 2: Generate guide with Claude using research
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    let userPrompt = `Generate a detailed integration guide for connecting:

Device: ${peripheral.name} (${peripheral.brand})
To System: ${coreSystem.name} (${coreSystem.brand})
Connection Type: ${connectionType || 'Dante/AES67'}`

    if (research.content) {
      userPrompt += `

## Research from Official Documentation:
${research.content}

## Sources Found:
${research.citations.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Use this research to ensure accuracy. Include the sources in your response.`
    } else {
      userPrompt += `

Note: No external research was available. Generate based on your training knowledge, but add a stronger disclaimer about verifying with official documentation.`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: INTEGRATION_GUIDE_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', response.status, errorText)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const claudeResponse = await response.json()
    const responseText = claudeResponse.content?.[0]?.text || ''
    const usage = claudeResponse.usage || { input_tokens: 0, output_tokens: 0 }
    const costCents = calculateCost(usage.input_tokens, usage.output_tokens)

    const guideContent = parseClaudeResponse(responseText)

    if (!guideContent) {
      console.error('Failed to parse guide content from:', responseText.substring(0, 1000))
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate guide',
          raw: responseText.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure sources from Perplexity are included
    if (research.citations.length > 0 && (!guideContent.sources || guideContent.sources.length === 0)) {
      guideContent.sources = research.citations.map(url => ({
        name: new URL(url).hostname.replace('www.', ''),
        url: url
      }))
    }

    // Add disclaimer if not present
    if (!guideContent.disclaimer) {
      guideContent.disclaimer = research.content
        ? "This guide was generated with AI assistance using manufacturer documentation. Always verify critical settings against official sources before deployment."
        : "This guide was generated with AI assistance. Official documentation was not available during generation - please verify all settings against manufacturer specifications before deployment."
    }

    // Track usage
    const yearMonth = new Date().toISOString().substring(0, 7)

    await supabase.from('usage_logs').insert({
      user_id: userId,
      action_type: 'guide',
      model_used: CLAUDE_MODEL,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_cents: costCents,
      metadata: {
        core_system: coreSystem.name,
        peripheral: peripheral.name,
        connection_type: connectionType,
        research_sources: research.citations.length,
      },
    })

    const { data: existingUsage } = await supabase
      .from('monthly_usage')
      .select('id, guides_generated, total_tokens, total_cost_cents')
      .eq('user_id', userId)
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
        user_id: userId,
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
        guide: guideContent,
        meta: {
          model: CLAUDE_MODEL,
          researchSources: research.citations.length,
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
    console.error('Generate guide error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate guide' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
