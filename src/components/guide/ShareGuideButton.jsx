import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Share2, Copy, Check, Globe, Lock, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function ShareGuideButton({ guideId, isPublic = false, publicId = null, onUpdate, variant = 'outline', size = 'sm' }) {
  const { user, getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState(publicId ? window.location.origin + '/guide/' + publicId : null)
  const [currentlyPublic, setCurrentlyPublic] = useState(isPublic)
  const [copied, setCopied] = useState(false)

  const handleMakePublic = async () => {
    if (!user || !getToken) {
      toast.error('Please sign in to share guides')
      return
    }
    setLoading(true)
    try {
      const clerkToken = await getToken({ template: 'supabase' })
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(supabaseUrl + '/functions/v1/share-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clerkToken },
        body: JSON.stringify({ guideId, makePublic: true }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to share guide')
      setShareUrl(result.shareUrl)
      setCurrentlyPublic(true)
      onUpdate?.({ isPublic: true, publicId: result.publicId })
      toast.success('Guide is now public!')
    } catch (error) {
      console.error('Failed to share guide:', error)
      toast.error(error.message || 'Failed to share guide')
    } finally {
      setLoading(false)
    }
  }

  const handleMakePrivate = async () => {
    if (!user || !getToken) {
      toast.error('Please sign in to manage guides')
      return
    }
    setLoading(true)
    try {
      const clerkToken = await getToken({ template: 'supabase' })
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(supabaseUrl + '/functions/v1/share-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clerkToken },
        body: JSON.stringify({ guideId, makePublic: false }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update guide')
      setShareUrl(null)
      setCurrentlyPublic(false)
      onUpdate?.({ isPublic: false, publicId: null })
      toast.success('Guide is now private')
    } catch (error) {
      console.error('Failed to make guide private:', error)
      toast.error(error.message || 'Failed to update guide')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Guide</DialogTitle>
            <DialogDescription>Share this guide with your team or make it publicly accessible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {!currentlyPublic && !shareUrl ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border">
                  <Lock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">This guide is private</p>
                    <p className="text-sm text-gray-600 mt-1">Make it public to share with others.</p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleMakePublic} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                  {loading ? 'Creating link...' : 'Make Public & Get Link'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Globe className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">This guide is public</p>
                    <p className="text-sm text-green-700 mt-1">Anyone with the link can view this guide.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={shareUrl || ''} readOnly className="flex-1 bg-gray-50" />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
                <p className="text-xs text-gray-500 text-center">Anyone with this link can view the guide</p>
                <div className="pt-4 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-gray-500 hover:text-gray-700" onClick={handleMakePrivate} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                    Make Private
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ShareGuideButton
