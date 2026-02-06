// Create Stripe Checkout Session Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@14.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Decode Clerk JWT
    const token = authHeader.replace('Bearer ', '')
    const payload = decodeJwtPayload(token)
    if (!payload?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId = payload.sub as string
    const userEmail = (payload.email as string) || ''

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Get requested plan from body
    const { priceId: requestedPriceId } = await req.json()

    // Map price IDs to Stripe
    const priceIdMap: Record<string, string | undefined> = {
      'basic_monthly': Deno.env.get('STRIPE_PRICE_ID_BASIC_MONTHLY'),
      'pro_monthly': Deno.env.get('STRIPE_PRICE_ID_PRO_MONTHLY'),
    }

    const stripePriceId = priceIdMap[requestedPriceId]
    if (!stripePriceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid price ID: ' + requestedPriceId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
      } catch {
        console.log('Customer not found, creating new one...')
        customerId = null
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || profile?.email,
        metadata: { user_id: userId },
      })
      customerId = customer.id

      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create checkout session
    const appUrl = Deno.env.get('APP_URL') || 'https://sqyros.com'
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          user_id: userId,
          plan: requestedPriceId,
        },
      },
      success_url: appUrl + '/dashboard?upgrade=success',
      cancel_url: appUrl + '/pricing?canceled=true',
      allow_promotion_codes: true,
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
