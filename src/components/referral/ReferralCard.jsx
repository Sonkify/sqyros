import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Copy, Check, Share2, Users, Gift } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ReferralCard() {
  const { getToken, userId } = useAuth()
  const [referralCode, setReferralCode] = useState(null)
  const [referralCount, setReferralCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const referralLink = referralCode 
    ? 'https://sqyros.com/signup?ref=' + referralCode
    : null

  useEffect(() => {
    async function fetchReferralData() {
      try {
        const token = await getToken({ template: 'supabase' })
        
        const codeRes = await fetch(
          import.meta.env.VITE_SUPABASE_URL + '/functions/v1/get-referral-code',
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          }
        )
        const codeData = await codeRes.json()
        if (codeData.code) {
          setReferralCode(codeData.code)
        }

        const countRes = await fetch(
          import.meta.env.VITE_SUPABASE_URL + '/functions/v1/get-referral-stats',
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          }
        )
        const countData = await countRes.json()
        if (countData.count !== undefined) {
          setReferralCount(countData.count)
        }
      } catch (err) {
        console.error('Error fetching referral data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchReferralData()
    }
  }, [userId, getToken])

  const copyToClipboard = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareLink = async () => {
    if (!referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Sqyros',
          text: 'Create professional AV setup guides with AI. Sign up with my link!',
          url: referralLink
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    } else {
      copyToClipboard()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-blue-600" />
          Invite Friends
        </CardTitle>
        <CardDescription>
          Share Sqyros and earn rewards when friends sign up
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-2xl font-bold text-blue-600">{referralCount}</p>
            <p className="text-sm text-gray-600">Friends invited</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-semibold text-green-600">+{referralCount * 25}</p>
            <p className="text-sm text-gray-600">Bonus points</p>
          </div>
        </div>

        {referralLink && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Your referral link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                onClick={shareLink}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>Earn 25 reputation points for each friend who signs up</p>
          <p>Unlock special badges at 1 and 10 referrals</p>
        </div>
      </CardContent>
    </Card>
  )
}
