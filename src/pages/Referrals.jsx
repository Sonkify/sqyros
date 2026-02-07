import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { 
  Copy, Check, Users, Gift, Sparkles,
  MessageCircle, Mail, Link2, Smartphone
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function Referrals() {
  const { getToken, userId } = useAuth()
  const [referralCode, setReferralCode] = useState(null)
  const [referralCount, setReferralCount] = useState(0)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [loading, setLoading] = useState(true)

  const referralLink = referralCode 
    ? 'https://sqyros.com/signup?ref=' + referralCode
    : ''

  const shortMessage = referralLink 
    ? `Hey! Check out Sqyros - it generates AV setup guides by researching manufacturer docs. Saves a ton of time on integrations. Free to try: ${referralLink}`
    : ''

  const fullMessage = referralLink ? `Hey! I've been using this app called Sqyros for AV integration work.

It generates setup guides for connecting devices to control systems (Q-SYS, Crestron, Biamp, Extron, etc.) by researching official manufacturer documentation. You get step-by-step guides with IP configs, connection diagrams, and control commands.

What I like:
- Pulls from actual manufacturer specs (not just AI guessing)
- Community can add field tips and verify guides
- Maintenance chatbot for quick factory resets, default IPs, etc.

It's a great starting point — just double-check IP addresses and credentials against the actual device before going live.

Free tier available: ${referralLink}

Let me know if you try it!` : ''

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

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage)
      setCopiedMessage(true)
      toast.success('Message copied!')
      setTimeout(() => setCopiedMessage(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      toast.success('Link copied!')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareVia = (platform) => {
    const encodedMessage = encodeURIComponent(shortMessage)
    const encodedLink = encodeURIComponent(referralLink)
    
    const urls = {
      whatsapp: 'https://wa.me/?text=' + encodedMessage,
      sms: 'sms:?body=' + encodedMessage,
      email: 'mailto:?subject=' + encodeURIComponent('Check out Sqyros for AV integrations') + '&body=' + encodeURIComponent(fullMessage),
    }

    if (urls[platform]) {
      window.open(urls[platform], '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Share Sqyros</h1>
          <p className="text-gray-600 mt-1">
            Share Sqyros with fellow AV professionals and earn rewards.
          </p>
        </div>

        {/* Stats Card */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-3xl font-bold">{referralCount}</p>
                <p className="text-blue-100">Friends invited</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-bold">+{referralCount * 25}</p>
                <p className="text-blue-100">Bonus points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Founder Invite Card */}
        <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Invite Message</span>
            </div>
            <h2 className="text-xl font-bold mb-4">
              Share your invite message with colleagues
            </h2>
            <div className="bg-white/20 rounded-lg p-3 flex items-center gap-3">
              <span className="text-sm truncate flex-1 opacity-90">
                {referralLink ? referralLink.substring(0, 30) + '...' : 'Loading...'}
              </span>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={copyMessage}
                className="bg-white text-orange-600 hover:bg-gray-100 shrink-0"
              >
                {copiedMessage ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                Copy Message
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message Preview */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Message to share
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {fullMessage}
            </div>
          </CardContent>
        </Card>

        {/* Share Via */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Share via</h3>
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => shareVia('whatsapp')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-gray-600">WhatsApp</span>
              </button>
              
              <button
                onClick={() => shareVia('sms')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-gray-600">SMS</span>
              </button>
              
              <button
                onClick={() => shareVia('email')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-gray-600">Email</span>
              </button>
              
              <button
                onClick={copyLink}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                  {copiedLink ? <Check className="w-6 h-6 text-white" /> : <Link2 className="w-6 h-6 text-white" />}
                </div>
                <span className="text-xs text-gray-600">Copy Link</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Share Tips */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Share Tips</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  1
                </div>
                <p className="text-sm text-gray-600">
                  Click "Copy Message" to copy your personalized invite
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  2
                </div>
                <p className="text-sm text-gray-600">
                  Share via WhatsApp, SMS, or email to AV technicians
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  3
                </div>
                <p className="text-sm text-gray-600">
                  Earn 25 points and badges for each signup!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Link */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-2">Or just share your link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rewards Info */}
        <div className="text-center text-sm text-gray-500 pb-4">
          <p>Earn 25 reputation points for each friend who signs up</p>
          <p>Unlock special badges at 1 and 10 referrals</p>
        </div>
      </div>
    </div>
  )
}
