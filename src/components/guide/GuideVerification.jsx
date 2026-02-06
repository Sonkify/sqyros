import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Shield, ShieldCheck, ShieldAlert, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function GuideVerification({ guideId, isOwner = false }) {
  const { getToken, userId } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifications, setVerifications] = useState([])
  const [notes, setNotes] = useState('')
  const [userHasVerified, setUserHasVerified] = useState(false)

  useEffect(() => {
    if (guideId) {
      fetchVerifications()
    }
  }, [guideId])

  const fetchVerifications = async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      const response = await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/rest/v1/guide_verifications?guide_id=eq.' + guideId + '&select=*,user_profiles(username,display_name)',
        {
          headers: {
            Authorization: 'Bearer ' + token,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
        }
      )
      const data = await response.json()
      setVerifications(data || [])
      setUserHasVerified(data?.some(v => v.verified_by === userId))
    } catch (err) {
      console.error('Error fetching verifications:', err)
    }
  }

  const handleVerify = async () => {
    if (!userId) {
      toast.error('Please sign in to verify guides')
      return
    }

    setLoading(true)
    try {
      const token = await getToken({ template: 'supabase' })
      const response = await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/rest/v1/guide_verifications',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            guide_id: guideId,
            verified_by: userId,
            status: 'verified',
            notes: notes || null,
          })
        }
      )

      if (response.ok) {
        toast.success('Guide verified! Thank you for helping the community.')
        setOpen(false)
        setNotes('')
        fetchVerifications()
      } else {
        throw new Error('Failed to verify')
      }
    } catch (err) {
      console.error('Error verifying guide:', err)
      toast.error('Failed to verify guide')
    } finally {
      setLoading(false)
    }
  }

  const verifiedCount = verifications.filter(v => v.status === 'verified').length
  const isVerified = verifiedCount >= 2

  return (
    <>
      <div className="flex items-center gap-2">
        {isVerified ? (
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified by {verifiedCount} users</span>
          </div>
        ) : verifiedCount > 0 ? (
          <div className="flex items-center gap-1 text-amber-600 text-sm">
            <Shield className="w-4 h-4" />
            <span>{verifiedCount} verification{verifiedCount > 1 ? 's' : ''}</span>
          </div>
        ) : null}

        {!isOwner && !userHasVerified && userId && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Shield className="w-4 h-4 mr-1" />
            Verify
          </Button>
        )}

        {userHasVerified && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            You verified this
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              Verify This Guide
            </DialogTitle>
            <DialogDescription>
              By verifying, you confirm that you have tested this guide and it works correctly.
              This helps other AV professionals trust community guides.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Notes (optional)
              </label>
              <Textarea
                placeholder="Any additional notes about your verification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Please verify only if:</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                <li>You have actually tested this integration</li>
                <li>The steps work as described</li>
                <li>The information is accurate</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleVerify} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Confirm Verification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default GuideVerification
