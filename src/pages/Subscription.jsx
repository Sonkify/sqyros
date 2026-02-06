import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Calendar, Zap, Star, Crown, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const TIER_INFO = {
  free: { name: 'Free', icon: Zap, color: 'bg-gray-100 text-gray-600', guides: 5, questions: 5 },
  basic: { name: 'Basic', icon: Star, color: 'bg-amber-100 text-amber-600', guides: 50, questions: 50 },
  pro: { name: 'Pro', icon: Crown, color: 'bg-blue-100 text-blue-600', guides: 150, questions: 9999 },
}

export default function Subscription() {
  const { profile, tier } = useAuth()
  const [loading, setLoading] = useState(false)

  const currentTier = TIER_INFO[tier] || TIER_INFO.free
  const TierIcon = currentTier.icon

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      // TODO: Implement Stripe customer portal
      toast.info('Billing portal coming soon')
    } catch (error) {
      toast.error('Failed to open billing portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your plan and billing</p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentTier.color}`}>
                <TierIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentTier.name}</h3>
                <p className="text-gray-500">
                  {tier === 'free' ? 'No active subscription' : 'Active subscription'}
                </p>
              </div>
              {tier !== 'free' && (
                <Badge className="ml-auto" variant="outline">Active</Badge>
              )}
            </div>

            {tier === 'free' ? (
              <Link to="/pricing">
                <Button className="w-full">
                  Upgrade Your Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={handleManageBilling} disabled={loading}>
                Manage Billing
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Usage This Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>Your current usage against your plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Guides Generated</span>
                <span className="text-sm text-gray-500">
                  {profile?.guides_this_month || 0} / {currentTier.guides}
                </span>
              </div>
              <Progress 
                value={((profile?.guides_this_month || 0) / currentTier.guides) * 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Chat Questions (Today)</span>
                <span className="text-sm text-gray-500">
                  {profile?.questions_today || 0} / {currentTier.questions === 9999 ? '∞' : currentTier.questions}
                </span>
              </div>
              <Progress 
                value={currentTier.questions === 9999 ? 5 : ((profile?.questions_today || 0) / currentTier.questions) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        {tier !== 'pro' && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-6">
              <div className="text-center">
                <Crown className="w-10 h-10 mx-auto text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  {tier === 'free' ? 'Unlock More Features' : 'Upgrade to Pro'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {tier === 'free' 
                    ? 'Get 50 guides/month and manufacturer doc research with Basic'
                    : 'Get 150 guides/month and unlimited chat with Pro'}
                </p>
                <Link to="/pricing">
                  <Button>View Plans</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
