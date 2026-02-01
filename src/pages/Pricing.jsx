import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { invokeEdgeFunction } from '@/api/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  Zap,
  Sparkles,
  Loader2,
  BookOpen,
  MessageSquare,
  FolderOpen,
  Shield,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    period: '',
    features: [
      { text: '3 integration guides per month', included: true },
      { text: '5 chat questions per day', included: true },
      { text: '5 saved guides', included: true },
      { text: 'Access to 20+ basic devices', included: true },
      { text: 'Compatibility checks', included: false },
      { text: 'PDF export', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professional AV integrators',
    price: 29,
    period: '/month',
    features: [
      { text: 'Unlimited integration guides', included: true },
      { text: 'Unlimited chat questions', included: true },
      { text: 'Unlimited saved guides', included: true },
      { text: 'Access to 50+ devices', included: true },
      { text: 'Compatibility checks', included: true },
      { text: 'PDF export', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
]

export default function Pricing() {
  const { user, isPro, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      navigate('/signup')
      return
    }

    setIsLoading(true)
    try {
      const response = await invokeEdgeFunction('create-checkout', {
        priceId: 'pro_monthly', // This will be mapped in the Edge Function
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
      setIsLoading(false)
    }
  }

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {PLANS.map((plan) => {
            const isCurrentPlan = isPro ? plan.id === 'pro' : plan.id === 'free'

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500">{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          feature.included ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Check className={`w-3 h-3 ${
                            feature.included ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.id === 'pro' ? (
                    <Button
                      className="w-full"
                      onClick={handleUpgrade}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {plan.cta}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/signup">Get Started</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Features Grid */}
        <div className="border-t pt-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            Everything you need for AV integration
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={BookOpen}
              title="Integration Guides"
              description="Step-by-step instructions for connecting any device to any system"
            />
            <FeatureCard
              icon={MessageSquare}
              title="AI Chat Support"
              description="Get instant answers to your AV maintenance questions"
            />
            <FeatureCard
              icon={FolderOpen}
              title="Guide Library"
              description="Save and organize your guides for quick reference"
            />
            <FeatureCard
              icon={Zap}
              title="Smart Routing"
              description="Our AI automatically uses the best model for each task"
            />
            <FeatureCard
              icon={Shield}
              title="50+ Devices"
              description="Support for major brands: Shure, QSC, Crestron, Biamp & more"
            />
            <FeatureCard
              icon={Clock}
              title="Save Hours"
              description="Get detailed setup guides in seconds, not hours"
            />
          </div>
        </div>

        {/* FAQ */}
        <div className="border-t pt-12 mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes! You can cancel your Pro subscription at any time. You'll keep access until the end of your billing period."
            />
            <FaqItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe payment system."
            />
            <FaqItem
              question="Is there a free trial?"
              answer="Yes! New Pro subscribers get a 7-day free trial. You won't be charged until the trial ends."
            />
            <FaqItem
              question="What happens to my guides if I downgrade?"
              answer="Your saved guides remain accessible. You just won't be able to generate new ones beyond the free limit."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  )
}

function FaqItem({ question, answer }) {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-2">{question}</h4>
      <p className="text-sm text-gray-600">{answer}</p>
    </div>
  )
}
