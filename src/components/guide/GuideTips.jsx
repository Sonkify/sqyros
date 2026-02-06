import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { 
  Lightbulb, AlertTriangle, Wrench, GitBranch, AlertCircle,
  ThumbsUp, ThumbsDown, Plus, Send, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const TIP_TYPES = {
  tip: { label: 'Pro Tip', icon: Lightbulb, color: 'text-amber-600 bg-amber-50' },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  troubleshooting: { label: 'Troubleshooting', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  alternative: { label: 'Alternative Method', icon: GitBranch, color: 'text-purple-600 bg-purple-50' },
  gotcha: { label: 'Common Gotcha', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
}

export default function GuideTips({ guideId }) {
  const { getToken, userId } = useAuth()
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(true)
  
  const [newTip, setNewTip] = useState({
    tip_type: 'tip',
    title: '',
    content: ''
  })

  useEffect(() => {
    if (guideId) fetchTips()
  }, [guideId])

  const fetchTips = async () => {
    try {
      const response = await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/rest/v1/guide_tips?guide_id=eq.' + guideId + '&order=upvotes.desc',
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
        }
      )
      const data = await response.json()
      setTips(data || [])
    } catch (err) {
      console.error('Error fetching tips:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('Please sign in to share tips')
      return
    }
    if (!newTip.title.trim() || !newTip.content.trim()) {
      toast.error('Please fill in both title and content')
      return
    }

    setSubmitting(true)
    try {
      const token = await getToken({ template: 'supabase' })
      const response = await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/rest/v1/guide_tips',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            guide_id: guideId,
            user_id: userId,
            ...newTip
          })
        }
      )

      if (response.ok) {
        toast.success('Tip shared! Thanks for contributing.')
        setNewTip({ tip_type: 'tip', title: '', content: '' })
        setShowForm(false)
        fetchTips()
      } else {
        throw new Error('Failed to submit')
      }
    } catch (err) {
      console.error('Error submitting tip:', err)
      toast.error('Failed to share tip')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (tipId, voteType) => {
    if (!userId) {
      toast.error('Please sign in to vote')
      return
    }

    try {
      const token = await getToken({ template: 'supabase' })
      await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/rest/v1/rpc/vote_on_tip',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tip_uuid: tipId,
            voter_id: userId,
            vote: voteType
          })
        }
      )
      fetchTips()
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  const TipIcon = ({ type }) => {
    const config = TIP_TYPES[type] || TIP_TYPES.tip
    const Icon = config.icon
    return <Icon className={'w-4 h-4 ' + config.color.split(' ')[0]} />
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Field Tips from AV Pros
            <Badge variant="secondary" className="ml-2">{tips.length}</Badge>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
          {userId && !showForm && expanded && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Tip
            </Button>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Add Tip Form */}
          {showForm && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="flex gap-3">
                <Select 
                  value={newTip.tip_type} 
                  onValueChange={(v) => setNewTip({...newTip, tip_type: v})}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIP_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Brief title (e.g., 'Check firmware version first')"
                  value={newTip.title}
                  onChange={(e) => setNewTip({...newTip, title: e.target.value})}
                  className="flex-1"
                />
              </div>
              <Textarea
                placeholder="Share your field experience, workaround, or tip that others would find helpful..."
                value={newTip.content}
                onChange={(e) => setNewTip({...newTip, content: e.target.value})}
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Share Tip
                </Button>
              </div>
            </div>
          )}

          {/* Tips List */}
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading tips...</div>
          ) : tips.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tips yet. Be the first to share your field experience!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tips.map((tip) => {
                const config = TIP_TYPES[tip.tip_type] || TIP_TYPES.tip
                return (
                  <div key={tip.id} className={'border rounded-lg p-3 ' + config.color.split(' ')[1]}>
                    <div className="flex items-start gap-3">
                      <TipIcon type={tip.tip_type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="font-medium text-gray-900">{tip.title}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{tip.content}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => handleVote(tip.id, 'up')}
                          className="p-1 hover:bg-white rounded"
                        >
                          <ThumbsUp className="w-4 h-4 text-gray-400 hover:text-green-600" />
                        </button>
                        <span className="text-xs font-medium text-gray-600">
                          {tip.upvotes - tip.downvotes}
                        </span>
                        <button 
                          onClick={() => handleVote(tip.id, 'down')}
                          className="p-1 hover:bg-white rounded"
                        >
                          <ThumbsDown className="w-4 h-4 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
