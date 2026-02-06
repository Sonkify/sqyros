import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/api/supabaseClient'
import { GuideDisplay } from '@/components/guide/GuideDisplay'
import { Button } from '@/components/ui/button'
import SaveOfflineButton from '@/components/guide/SaveOfflineButton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Share2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  BookOpen,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export default function PublicGuidePage() {
  const { publicId } = useParams()
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchGuide() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(
          `${supabaseUrl}/functions/v1/get-public-guide?id=${publicId}`
        )

        const result = await response.json()

        if (!response.ok || result.error) {
          setError(result.error || 'Guide not found')
        } else {
          setGuide(result.guide)
        }
      } catch (err) {
        console.error('Failed to fetch guide:', err)
        setError('Failed to load guide')
      } finally {
        setLoading(false)
      }
    }

    if (publicId) {
      fetchGuide()
    }
  }, [publicId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: guide?.guide_content?.title || guide?.title || 'AV Integration Guide',
          text: `Check out this AV integration guide: ${guide?.guide_content?.title || guide?.title}`,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        if (err.name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  if (loading) {
    return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading guide...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Guide not found</h1>
        <p className="text-gray-600 text-center max-w-md">
          This guide may have been removed or made private by the owner.
        </p>
        <Link to="/">
          <Button>
            Go to Sqyros <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const guideContent = guide?.guide_content || {}

  return (
    <>
      <Helmet>
        <title>{guide ? `${guide.title || "AV Setup Guide"} | Sqyros` : 'Sqyros - AV Setup Guides'}</title>
        <meta name="description" content={guide ? `AV setup guide: ${guide.title || "Professional guide"}` : 'Professional AV setup guides by Sqyros'} />
        <meta property="og:title" content={guide ? guide.title || 'AV Setup Guide' : 'Sqyros'} />
        <meta property="og:description" content={guide ? "Professional AV setup guide generated with Sqyros" : 'AI-powered AV setup guides'} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Sqyros" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={guide ? guide.title || 'AV Setup Guide' : 'Sqyros'} />
        <meta name="twitter:description" content="Professional AV setup guide generated with Sqyros" />
      </Helmet>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <img
                src="/sqyros-icon.svg"
                alt="Sqyros"
                className="w-5 h-5"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = '<span class="font-bold text-white text-sm">S</span>'
                }}
              />
            </div>
            <span className="font-semibold text-gray-900">Sqyros</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
            <Button size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Share</span>
            </Button>
            <SaveOfflineButton guide={guide} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Guide Meta Info */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
            <Badge variant="secondary">{guide.core_system}</Badge>
            <span>&rarr;</span>
            <Badge variant="secondary">{guide.peripheral_device}</Badge>
            {guide.connection_type && (
              <>
                <span>via</span>
                <Badge variant="outline">{guide.connection_type}</Badge>
              </>
            )}
          </div>
          {guide.view_count > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Eye className="w-4 h-4" />
              <span>{guide.view_count} views</span>
            </div>
          )}
        </div>

        {/* Guide Content */}
        <GuideDisplay guide={guide} showHeader={true} />

        {/* CTA Banner */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Need more AV integration guides?
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Sqyros generates custom setup guides for 50+ AV devices instantly using AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Attribution */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Generated with{' '}
            <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Sqyros
            </Link>
            {' '}by{' '}
            <a
              href="https://avnova.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              AVNova
            </a>
          </p>
          {guide.created_by_username && (
            <p className="mt-2">
              Guide created by{' '}
              <span className="text-gray-700 font-medium">{guide.created_by_username}</span>
            </p>
          )}
          {guide.created_at && (
            <p className="mt-1 text-gray-400">
              {formatDate(guide.created_at)}
            </p>
          )}
          <p className="mt-4 text-xs text-gray-400">
            AVNova is a trading name of Sonak Media Ltd, registered in England and Wales.
          </p>
        </footer>
      </main>
    </div>
    </>
  )
}