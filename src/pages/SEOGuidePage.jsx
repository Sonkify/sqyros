import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { BookOpen, ArrowLeft, Eye, Share2, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SaveOfflineButton from '@/components/guide/SaveOfflineButton'
import GuideDisplay from '@/components/guide/GuideDisplay'
import GuideRating from '@/components/guide/GuideRating'

export default function SEOGuidePage() {
  const { slug } = useParams()
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchGuide() {
      try {
        const response = await fetch(
          import.meta.env.VITE_SUPABASE_URL + '/functions/v1/get-guide-by-slug?slug=' + slug
        )
        const data = await response.json()
        
        if (data.error) {
          setError(data.error)
        } else {
          setGuide(data.guide)
        }
      } catch (err) {
        setError('Failed to load guide')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchGuide()
    }
  }, [slug])

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

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Guide not found</h1>
        <p className="text-gray-600 text-center max-w-md">
          This guide may have been removed or made private.
        </p>
        <Link to="/">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  const guideTitle = guide.guide_content?.title || 'AV Setup Guide'
  const guideDescription = 'Professional AV setup guide: ' + guideTitle
  const canonicalUrl = 'https://sqyros.com/guides/' + slug

  return (
    <>
      <Helmet>
        <title>{guideTitle} | Sqyros</title>
        <meta name="description" content={guideDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={guideTitle} />
        <meta property="og:description" content={guideDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Sqyros" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={guideTitle} />
        <meta name="twitter:description" content={guideDescription} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": guideTitle,
            "description": guideDescription,
            "step": guide.guide_content?.steps?.map((step, i) => ({
              "@type": "HowToStep",
              "position": i + 1,
              "text": typeof step === 'string' ? step : step.text || step.content || ''
            })) || [],
            "publisher": {
              "@type": "Organization",
              "name": "Sqyros",
              "url": "https://sqyros.com"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white text-sm">S</span>
              </div>
              <span className="font-bold text-gray-900">Sqyros</span>
            </Link>
            <div className="flex items-center gap-4">
              {guide.view_count > 0 && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {guide.view_count} views
                </span>
              )}
              <SaveOfflineButton guide={guide} />
              <Link to="/signup">
                <Button size="sm">Create Your Own Guide</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <article>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{guideTitle}</h1>
            
            {guide.user_profiles && (
              <p className="text-gray-600 mb-6">
                By <span className="font-medium">{guide.user_profiles.display_name || guide.user_profiles.username}</span>
              </p>
            )}

            <GuideDisplay guide={guide.guide_content} />
          </article>

          {guide.id && (
            <div className="mt-8 pt-8 border-t">
              <GuideRating guideId={guide.id} />
            </div>
          )}
        </main>

        <footer className="py-6 px-4 text-center text-sm text-gray-500 border-t bg-white">
          <p>&copy; 2025 Sqyros. All rights reserved.</p>
          <p className="mt-1">
            Sqyros is a product of{' '}
            <a href="https://avnova.ai" className="text-blue-600 hover:underline">AVNova</a>.
          </p>
          <p className="mt-1 text-gray-400">
            AVNova is a trading name of Sonak Media Ltd, registered in England and Wales.
          </p>
        </footer>
      </div>
    </>
  )
}
