import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  Medal,
  Star,
  BookOpen,
  Award,
  TrendingUp,
  Loader2,
  CheckCircle,
} from 'lucide-react'

export default function Leaderboard() {
  const { supabaseClient } = useAuth()
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('all')

  useEffect(() => {
    loadLeaderboard()
  }, [supabaseClient, timeframe])

  async function loadLeaderboard() {
    if (!supabaseClient) return
    setLoading(true)

    try {
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          reputation_score,
          guides_count,
          verified_guides_count,
          is_verified_pro,
          certifications,
          specialties
        `)
        .gt('guides_count', 0)
        .order('reputation_score', { ascending: false })
        .limit(50)

      if (error) throw error
      setLeaders(data || [])
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-medium">{index + 1}</span>
  }

  const getRankBg = (index) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
    if (index === 1) return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
    if (index === 2) return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200'
    return 'bg-white'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-500" />
          Community Leaderboard
        </h1>
        <p className="text-gray-600">
          Top contributors in the Sqyros community
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{leaders.length}</div>
            <div className="text-sm text-gray-500">Contributors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {leaders.reduce((sum, l) => sum + (l.guides_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Total Guides</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {leaders.filter(l => l.is_verified_pro).length}
            </div>
            <div className="text-sm text-gray-500">Verified Pros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {leaders.reduce((sum, l) => sum + (l.verified_guides_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Verified Guides</div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Contributors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No contributors yet</p>
              <p className="text-sm">Be the first to share a guide!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${getRankBg(index)}`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                      {user.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {user.username || user.full_name || 'Anonymous'}
                      </span>
                      {user.is_verified_pro && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.specialties?.slice(0, 3).map((spec, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{user.guides_count || 0}</div>
                      <div className="text-xs text-gray-500">Guides</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-yellow-600 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400" />
                        {user.reputation_score || 0}
                      </div>
                      <div className="text-xs text-gray-500">Points</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How Points Work */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Reputation Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Share a Guide</p>
                <p className="text-gray-500">+10 points</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">Receive a 5-star rating</p>
                <p className="text-gray-500">+5 points</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Guide verified by community</p>
                <p className="text-gray-500">+25 points</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Earn a badge</p>
                <p className="text-gray-500">+15 points</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
