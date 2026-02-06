import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Loader2, Zap, Star, Crown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/AuthContext'
import { invokeEdgeFunction } from '@/api/supabaseClient'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    description: 'Try Sqyros and see if it fits your workflow',
    price: 0,
    period: '',
    features: [
      { text: '5 guides per month', included: true },
      { text: '5 chat questions per day', included: true },
      { text: '5 saved guides', included: true },
      { text: 'Basic device library', included: true },
      { text: 'Community tips access', included: true },
      { text: 'Manufacturer doc research', included: false },
      { text: 'PDF export', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    icon: Star,
    description: 'For individual AV technicians',
    price: 19,
    period: '/month',
    priceId: 'basic_monthly',
    features: [
      { text: '50 guides per month', included: true },
      { text: '50 chat questions per day', included: true },
      { text: 'Unlimited saved guides', included: true },
      { text: 'Full device library (50+)', included: true },
      { text: 'Community tips access', included: true },
      { text: 'Manufacturer doc research', included: true },
      { text: 'PDF export', included: true },
      { text: 'Email support', included: true },
    ],
    cta: 'Start Basic',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Crown,
    description: 'For busy integrators and teams',
    price: 39,
    period: '/month',
    priceId: 'pro_monthly',
    features: [
      { text: '150 guides per month', included: true },
      { text: 'Unlimited chat questions', included: true },
      { text: 'Unlimited saved guides', included: true },
      { text: 'Full device library (50+)', included: true },
      { text: 'Community tips access', included: true },
      { text: 'Manufacturer doc research', included: true },
      { text: 'PDF export', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Go Pro',
    popular: true,
  },
]

export default function Pricing() {
  const { user, tier, isAuthenticated, getToken } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(null)

  const handleSubscribe = async (plan) => {
    if (!isAuthenticated) {
      navigate('/signup')
      return
    }

    if (plan.id === 'free') return

    setIsLoading(plan.id)
    try {
      const response = await invokeEdgeFunction(getToken, 'create-checkout', {
        priceId: plan.priceId,
      })

      if (response.url) {
        window.location.href = response.url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const currentTier = tier || 'free'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Predictable Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your workload. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = currentTier === plan.id
            const isDowngrade = (currentTier === 'pro' && plan.id !== 'pro') ||
                               (currentTier === 'basic' && plan.id === 'free')

            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-blue-500 border-2 shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    plan.id === 'free' ? 'bg-gray-100' :
                    plan.id === 'basic' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.id === 'free' ? 'text-gray-600' :
                      plan.id === 'basic' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Free' : '$' + plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full mt-6"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || isDowngrade || isLoading === plan.id}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isLoading === plan.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {isCurrentPlan ? 'Current Plan' : 
                     isDowngrade ? 'Current Plan' : 
                     plan.cta}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* FAQ / Notes */}
        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">
            All plans include access to our AI-powered guide generation and maintenance chat.
          </p>
          <p className="text-sm">
            Need more than 150 guides/month? <a href="mailto:support@avnova.ai" className="text-blue-600 hover:underline">Contact us</a> for enterprise pricing.
          </p>
        </div>

        {/* Cost Transparency */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg max-w-2xl mx-auto">
          <h3 className="font-semibold text-gray-900 mb-2">Why we have limits</h3>
          <p className="text-sm text-gray-600">
            Each guide uses AI to research official manufacturer documentation and generate accurate setup instructions. 
            This costs us real money per guide. Our pricing ensures we can keep improving Sqyros while keeping it affordable for AV professionals.
          </p>
        </div>
      </div>
    </div>
  )
}
