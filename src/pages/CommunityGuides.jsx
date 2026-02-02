import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  Search,
  Eye,
  Filter,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react'

export default function CommunityGuides() {
  const { supabaseClient } = useAuth()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [filterSystem, setFilterSystem] = useState('all')
  const [systems, setSystems] = useState([])

  useEffect(() => {
    loadGuides()
    loadSystems()
  }, [supabaseClient, sortBy, filterSystem])

  async function loadGuides() {
    if (!supabaseClient) return
    setLoading(true)
    try {
      let query = supabaseClient
        .from('saved_guides')
        .select('id, title, core_system, peripheral_device, connection_type, public_id, view_count, created_at, user_id')
        .eq('is_public', true)

      if (filterSystem !== 'all') {
        query = query.eq('core_system', filterSystem)
      }

      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'popular') {
        query = query.order('view_count', { ascending: false })
      }

      const { data, error } = await query.limit(50)
      if (error) throw error
      setGuides(data || [])
    } catch (error) {
      console.error('Error loading guides:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSystems() {
    if (!supabaseClient) return
    try {
      const { data } = await supabaseClient
        .from('saved_guides')
        .select('core_system')
        .eq('is_public', true)
      const uniqueSystems = [...new Set(data?.map(g => g.core_system).filter(Boolean))]
      setSystems(uniqueSystems)
    } catch (error) {
      console.error('Error loading systems:', error)
    }
  }

  const filteredGuides = guides.filter(guide => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      guide.title?.toLowerCase().includes(search) ||
      guide.core_system?.toLowerCase().includes(search) ||
      guide.peripheral_device?.toLowerCase().includes(search)
    )
  })

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Guides</h1>
          <p className="text-gray-600">Browse integration guides shared by the community</p>
        </div>
        <Button asChild>
          <Link to="/generate-guide">
            <BookOpen className="w-4 h-4 mr-2" />
            Create Guide
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSystem} onValueChange={setFilterSystem}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {systems.map(system => (
                  <SelectItem key={system} value={system}>{system}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredGuides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No guides found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterSystem !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to share a guide with the community'}
            </p>
            <Button asChild>
              <Link to="/generate-guide">Create a Guide</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuides.map((guide) => (
            <Link key={guide.id} to={"/guide/" + guide.public_id}>
              <Card className="h-full hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-2">{guide.title}</CardTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">{guide.core_system}</Badge>
                    {guide.connection_type && (
                      <Badge variant="outline" className="text-xs">{guide.connection_type}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {guide.view_count || 0} views
                    </span>
                    <span>{formatDate(guide.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
