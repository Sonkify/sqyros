import { useState } from 'react'
import { Download, Check, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOfflineGuides } from '@/lib/useOfflineGuides'
import { toast } from 'sonner'

export function SaveOfflineButton({ guide, variant = 'outline', size = 'sm' }) {
  const { saveOffline, removeOffline, isOffline } = useOfflineGuides()
  const [loading, setLoading] = useState(false)
  
  const guideId = guide?.id || guide?.public_id
  const isSaved = isOffline(guideId)

  const handleToggle = async () => {
    if (!guide) return
    
    setLoading(true)
    try {
      if (isSaved) {
        const success = await removeOffline(guideId)
        if (success) {
          toast.success('Removed from offline guides')
        } else {
          toast.error('Failed to remove guide')
        }
      } else {
        const success = await saveOffline(guide)
        if (success) {
          toast.success('Saved for offline access')
        } else {
          toast.error('Failed to save guide')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (!guide) return null

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={loading}
      title={isSaved ? 'Remove from offline' : 'Save for offline'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSaved ? (
        <>
          <Check className="h-4 w-4 mr-2 text-green-600" />
          Saved Offline
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Save Offline
        </>
      )}
    </Button>
  )
}

export default SaveOfflineButton
