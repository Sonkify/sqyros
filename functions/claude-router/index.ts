// Claude API Router Edge Function
// Routes requests to appropriate Claude model based on task complexity

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const MODELS = {
  OPUS: 'claude-opus-4-5-20250101',
  SONNET: 'claude-sonnet-4-5-20250929',
} as const

// Task classification rules
const TASK_PATTERNS = {
  simple_qa: {
    keywords: [
      'how to', 'what is', 'where is', 'reset', 'firmware', 'update',
      'password', 'led', 'status', 'ip address', 'default', 'reboot',
      'factory', 'serial number', 'version', 'power', 'cable'
    ],
    model: MODELS.SONNET,
    maxTokens: 1000,
  },
  troubleshooting: {
    keywords: [
      'not working', 'error', 'problem', 'issue', 'fix', 'troubleshoot',
      'help', 'broken', 'failed', 'won\'t', 'can\'t', 'unable', 'noise',
      'static', 'dropout', 'latency'
    ],
    model: MODELS.SONNET,
    maxTokens: 1500,
  },
  integration_guide: {
    keywords: [
      'connect', 'integrate', 'setup', 'configure', 'route', 'dante',
      'aes67', 'integration', 'step by step', 'installation'
    ],
    requiresDeviceSelection: true,
    model: MODELS.OPUS,
    maxTokens: 4000,
  },
  compatibility_check: {
    keywords: [
      'compatible', 'work with', 'support', 'can i use', 'will it work',
      'supported', 'requirements'
    ],
    model: MODELS.OPUS,
    maxTokens: 2000,
  },
}

// Complex request indicators that bump to Opus
const COMPLEX_INDICATORS = [
  'custom', 'unusual', 'special', 'advanced', 'complex', 'multiple',
  'chain', 'daisy', 'redundant', 'failover', 'multi-zone', 'enterprise'
]

interface TaskClassification {
  taskType: string
  model: string
  maxTokens: number
  reasoning: string
}

interface Context {
  selectedSystem?: string
  selectedDevice?: string
  selectedConnection?: string
  conversationHistory?: Array<{ role: string; content: string }>
}

function classifyTask(userMessage: string, context: Context = {}): TaskClassification {
  const lowerMessage = userMessage.toLowerCase()

  // If user has selected devices for integration guide, use Opus
  if (context.selectedSystem && context.selectedDevice && context.selectedConnection) {
    return {
      taskType: 'integration_guide',
      model: MODELS.OPUS,
      maxTokens: 4000,
      reasoning: 'Complex multi-device integration requires superior reasoning',
    }
  }

  // Check for compatibility questions (use Opus)
  if (TASK_PATTERNS.compatibility_check.keywords.some(kw => lowerMessage.includes(kw))) {
    return {
      taskType: 'compatibility_check',
      model: MODELS.OPUS,
      maxTokens: 2000,
      reasoning: 'Compatibility analysis requires deep technical knowledge',
    }
  }

  // Check for complex/unusual requests (use Opus)
  if (COMPLEX_INDICATORS.some(ind => lowerMessage.includes(ind))) {
    return {
      taskType: 'complex_request',
      model: MODELS.OPUS,
      maxTokens: 3000,
      reasoning: 'Complex or unusual request benefits from advanced reasoning',
    }
  }

  // Check for integration-related keywords
  if (TASK_PATTERNS.integration_guide.keywords.some(kw => lowerMessage.includes(kw))) {
    return {
      taskType: 'integration_setup',
      model: MODELS.OPUS,
      maxTokens: 3000,
      reasoning: 'Integration setup benefits from detailed reasoning',
    }
  }

  // Check for troubleshooting
  if (TASK_PATTERNS.troubleshooting.keywords.some(kw => lowerMessage.includes(kw))) {
    return {
      taskType: 'troubleshooting',
      model: MODELS.SONNET,
      maxTokens: 1500,
      reasoning: 'Troubleshooting - pattern matching for common issues',
    }
  }

  // Default to Sonnet for simple Q&A
  return {
    taskType: 'simple_qa',
    model: MODELS.SONNET,
    maxTokens: 1000,
    reasoning: 'Simple question - fast response preferred',
  }
}

async function callClaudeAPI(
  model: string,
  maxTokens: number,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
) {
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
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Claude API error:', error)
    throw new Error(`Claude API error: ${response.status}`)
  }

  return response.json()
}

// Cost calculation (in cents)
const MODEL_COSTS = {
  [MODELS.OPUS]: {
    inputPer1k: 1.5,   // $15 per 1M tokens = $0.015 per 1k = 1.5 cents
    outputPer1k: 7.5,  // $75 per 1M tokens = $0.075 per 1k = 7.5 cents
  },
  [MODELS.SONNET]: {
    inputPer1k: 0.3,   // $3 per 1M tokens = $0.003 per 1k = 0.3 cents
    outputPer1k: 1.5,  // $15 per 1M tokens = $0.015 per 1k = 1.5 cents
  },
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS[MODELS.SONNET]
  return Math.ceil(
    (inputTokens / 1000 * costs.inputPer1k) +
    (outputTokens / 1000 * costs.outputPer1k)
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
    const { userMessage, context, systemPrompt, forceModel } = await req.json()

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'userMessage is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Classify the task to determine model
    const classification = forceModel
      ? { taskType: 'forced', model: forceModel, maxTokens: 4000, reasoning: 'Model forced by caller' }
      : classifyTask(userMessage, context)

    console.log('Task classification:', classification)

    // Build messages array
    const messages = context?.conversationHistory
      ? [...context.conversationHistory, { role: 'user', content: userMessage }]
      : [{ role: 'user', content: userMessage }]

    // Call Claude API
    const response = await callClaudeAPI(
      classification.model,
      classification.maxTokens,
      systemPrompt,
      messages
    )

    const content = response.content[0]?.text || ''
    const usage = response.usage || { input_tokens: 0, output_tokens: 0 }
    const costCents = calculateCost(classification.model, usage.input_tokens, usage.output_tokens)

    return new Response(
      JSON.stringify({
        success: true,
        content,
        model: classification.model,
        taskType: classification.taskType,
        reasoning: classification.reasoning,
        usage: {
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cost_cents: costCents,
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
    console.error('Claude router error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
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
