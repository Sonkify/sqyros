import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { getMonthlyUsage, getSavedGuides } from '@/api/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  MessageSquare,
  FolderOpen,
  Sparkles,
  ArrowRight,
  Zap,
  TrendingUp,
  Clock,
  Gift,
  ChevronRight,
} from 'lucide-react'
import { TIER_LIMITS, formatDate } from '@/lib/utils'

export default function Dashboard() {
  const { user, profile, isPro, supabaseClient } = useAuth()
  const [usage, setUsage] = useState(null)
  const [recentGuides, setRecentGuides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user || !supabaseClient) return
      try {
        const [usageData, guidesData] = await Promise.all([
          getMonthlyUsage(supabaseClient, user.id),
          getSavedGuides(supabaseClient, user.id),
        ])
        setUsage(usageData)
        setRecentGuides(guidesData?.slice(0, 3) || [])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const tier = profile?.tier || 'free'
  const limits = TIER_LIMITS[tier]
  const guidesUsed = usage?.guides_generated || 0
  const questionsUsed = usage?.questions_asked || 0

  const guideProgress = isPro ? 0 : (guidesUsed / limits.guidesPerMonth) * 100
  const guidesRemaining = isPro ? 'Unlimited' : `${limits.guidesPerMonth - guidesUsed} of ${limits.guidesPerMonth}`

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-600">
            Here's an overview of your AV integration activity.
          </p>
        </div>
        <Button asChild>
          <Link to="/generate-guide">
            <BookOpen className="w-4 h-4 mr-2" />
            New Integration Guide
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/generate-guide">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Generate Guide</h3>
                  <p className="text-sm text-gray-500">Create integration setup</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/chat">
          <Card className="hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                  <MessageSquare className="w-6 h-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Maintenance Chat</h3>
                  <p className="text-sm text-gray-500">Ask AV questions</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/saved-guides">
          <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <FolderOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Saved Guides</h3>
                  <p className="text-sm text-gray-500">{recentGuides.length} guides saved</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Usage & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Monthly Usage</CardTitle>
              <Badge variant={isPro ? 'default' : 'secondary'}>
                {isPro ? 'Pro' : 'Free'} Plan
              </Badge>
            </div>
            <CardDescription>
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Guides Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Integration Guides</span>
                </div>
                <span className="text-sm text-gray-600">{guidesRemaining}</span>
              </div>
              {!isPro && (
                <Progress value={guideProgress} className="h-2" />
              )}
            </div>

            {/* Questions Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-medium">Questions Today</span>
                </div>
                <span className="text-sm text-gray-600">
                  {isPro ? 'Unlimited' : `${5 - questionsUsed} remaining`}
                </span>
              </div>
              {!isPro && (
                <Progress value={(questionsUsed / 5) * 100} className="h-2" />
              )}
            </div>

            {/* Upgrade CTA for free users */}
            {!isPro && (
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/pricing">
                    <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                    Upgrade to Pro for Unlimited Access
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Guides */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Guides</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/saved-guides">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentGuides.length > 0 ? (
              <div className="space-y-3">
                {recentGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {guide.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {guide.core_system} • {formatDate(guide.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-3">No guides yet</p>
                <Button size="sm" asChild>
                  <Link to="/generate-guide">Create Your First Guide</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral Card */}
      {/* Invite Friends Banner */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-colors" onClick={() => navigate('/referrals')}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Invite Friends</p>
            <p className="text-sm text-blue-100">Share Sqyros and earn rewards</p>
          </div>
          <ChevronRight className="w-5 h-5 text-blue-200" />
        </CardContent>
      </Card>

      {/* Features Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI-Powered</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Intelligent model routing for optimal quality and speed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">50+ Devices</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Support for major AV brands and systems
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Save Time</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get detailed guides in seconds, not hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
