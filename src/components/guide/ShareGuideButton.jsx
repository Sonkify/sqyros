import { useState } from 'react'
import { supabase } from '@/api/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  Loader2,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * ShareGuideButton - Button component for sharing guides publicly
 *
 * @param {Object} props
 * @param {string} props.guideId - The guide's database ID
 * @param {boolean} props.isPublic - Current public status of the guide
 * @param {string} props.publicId - The guide's public_id (if already public)
 * @param {Function} props.onUpdate - Callback when share status changes
 * @param {string} props.variant - Button variant (default: "outline")
 * @param {string} props.size - Button size (default: "sm")
 */
export function ShareGuideButton({
  guideId,
  isPublic = false,
  publicId = null,
  onUpdate,
  variant = 'outline',
  size = 'sm',
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState(
    publicId ? `${window.location.origin}/guide/${publicId}` : null
  )
  const [currentlyPublic, setCurrentlyPublic] = useState(isPublic)
  const [copied, setCopied] = useState(false)

  const handleMakePublic = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please sign in to share guides')
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/share-guide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ guideId, makePublic: true }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to share guide')
      }

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
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please sign in to manage guides')
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/share-guide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ guideId, makePublic: false }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update guide')
      }

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

  const shareLinks = shareUrl ? {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out this AV integration guide')}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent('AV Integration Guide')}&body=${encodeURIComponent(`I thought you might find this useful: ${shareUrl}`)}`,
  } : null

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
            <DialogDescription>
              Share this guide with your team or make it publicly accessible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {!currentlyPublic && !shareUrl ? (
              /* Not public - show make public option */
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border">
                  <Lock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">This guide is private</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Make it public to share with others. Public guides can be viewed by anyone with the link.
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleMakePublic}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Creating link...' : 'Make Public & Get Link'}
                </Button>
              </div>
            ) : (
              /* Public - show share options */
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Globe className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">This guide is public</p>
                    <p className="text-sm text-green-700 mt-1">
                      Anyone with the link can view this guide.
                    </p>
                  </div>
                </div>

                {/* Share URL input */}
                <div className="flex items-center gap-2">
                  <Input
                    value={shareUrl || ''}
                    readOnly
                    className="flex-1 bg-gray-50"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>

                {/* Social share buttons */}
                <div className="flex justify-center gap-3">
                  <a
                    href={shareLinks?.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Share on Twitter"
                  >
                    <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href={shareLinks?.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Share on LinkedIn"
                  >
                    <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  <a
                    href={shareLinks?.email}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Share via Email"
                  >
                    <Mail className="h-5 w-5 text-gray-600" />
                  </a>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Anyone with this link can view the guide
                </p>

                {/* Make private option */}
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-500 hover:text-gray-700"
                    onClick={handleMakePrivate}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
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
