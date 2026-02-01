import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { getSavedGuides, deleteGuide, toggleGuideFavorite } from '@/api/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Search,
  BookOpen,
  Star,
  Trash2,
  Download,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Check,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, cn } from '@/lib/utils'
import { ShareGuideButton } from '@/components/guide/ShareGuideButton'

export default function SavedGuides() {
  const { user } = useAuth()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGuide, setSelectedGuide] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadGuides()
  }, [user])

  async function loadGuides() {
    if (!user) return
    try {
      const data = await getSavedGuides(user.id)
      setGuides(data || [])
    } catch (error) {
      console.error('Error loading guides:', error)
      toast.error('Failed to load guides')
    } finally {
      setLoading(false)
    }
  }

  const filteredGuides = guides.filter(guide =>
    guide.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.core_system?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.peripheral_device?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleFavorite = async (guide) => {
    try {
      await toggleGuideFavorite(guide.id, !guide.is_favorite)
      setGuides(guides.map(g =>
        g.id === guide.id ? { ...g, is_favorite: !g.is_favorite } : g
      ))
    } catch (error) {
      toast.error('Failed to update favorite')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteGuide(deleteConfirm.id)
      setGuides(guides.filter(g => g.id !== deleteConfirm.id))
      toast.success('Guide deleted')
    } catch (error) {
      toast.error('Failed to delete guide')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleExportPDF = (guide) => {
    // TODO: Implement PDF export
    toast.info('PDF export coming soon!')
  }

  const handleShareUpdate = (guideId, shareData) => {
    setGuides(guides.map(g =>
      g.id === guideId
        ? { ...g, is_public: shareData.isPublic, public_id: shareData.publicId }
        : g
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Guides</h1>
          <p className="text-gray-600">
            {guides.length} guide{guides.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredGuides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No guides found' : 'No saved guides yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? 'Try a different search term'
                : 'Generate your first integration guide to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Favorites section */}
          {filteredGuides.some(g => g.is_favorite) && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Favorites
              </h2>
              {filteredGuides
                .filter(g => g.is_favorite)
                .map(guide => (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    onView={() => setSelectedGuide(guide)}
                    onToggleFavorite={() => handleToggleFavorite(guide)}
                    onDelete={() => setDeleteConfirm(guide)}
                    onExport={() => handleExportPDF(guide)}
                    onShareUpdate={(data) => handleShareUpdate(guide.id, data)}
                  />
                ))}
            </div>
          )}

          {/* All guides */}
          <div className="space-y-3">
            {filteredGuides.some(g => g.is_favorite) && (
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mt-6">
                All Guides
              </h2>
            )}
            {filteredGuides
              .filter(g => !g.is_favorite)
              .map(guide => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  onView={() => setSelectedGuide(guide)}
                  onToggleFavorite={() => handleToggleFavorite(guide)}
                  onDelete={() => setDeleteConfirm(guide)}
                  onExport={() => handleExportPDF(guide)}
                  onShareUpdate={(data) => handleShareUpdate(guide.id, data)}
                />
              ))}
          </div>
        </div>
      )}

      {/* View Guide Dialog */}
      <Dialog open={!!selectedGuide} onOpenChange={() => setSelectedGuide(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedGuide.guide_content?.title || selectedGuide.title}</DialogTitle>
                <DialogDescription>
                  {selectedGuide.guide_content?.subtitle}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Prerequisites */}
                {selectedGuide.guide_content?.prerequisites?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Prerequisites</h4>
                    <ul className="space-y-1">
                      {selectedGuide.guide_content.prerequisites.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-600 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps */}
                {selectedGuide.guide_content?.steps?.length > 0 && (
                  <Accordion type="single" collapsible>
                    {selectedGuide.guide_content.steps.map((step, i) => (
                      <AccordionItem key={i} value={`step-${i}`}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm flex items-center justify-center">
                              {step.stepNumber || i + 1}
                            </span>
                            {step.title}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-8 space-y-3">
                            <p className="text-gray-700">{step.content}</p>
                            {step.code && (
                              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                                <code>{step.code}</code>
                              </pre>
                            )}
                            {step.tips?.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <div className="flex items-center gap-2 text-blue-700 font-medium text-sm mb-1">
                                  <Lightbulb className="w-4 h-4" />
                                  Tips
                                </div>
                                <ul className="text-sm text-blue-800">
                                  {step.tips.map((tip, j) => (
                                    <li key={j}>• {tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {step.warnings?.length > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm mb-1">
                                  <AlertTriangle className="w-4 h-4" />
                                  Warnings
                                </div>
                                <ul className="text-sm text-yellow-800">
                                  {step.warnings.map((warning, j) => (
                                    <li key={j}>• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                {/* Troubleshooting */}
                {selectedGuide.guide_content?.troubleshooting?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Troubleshooting</h4>
                    <div className="space-y-2">
                      {selectedGuide.guide_content.troubleshooting.map((item, i) => (
                        <div key={i} className="border-l-2 border-gray-200 pl-3">
                          <p className="font-medium text-sm">{item.issue}</p>
                          <p className="text-sm text-gray-600">{item.solution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <ShareGuideButton
                  guideId={selectedGuide.id}
                  isPublic={selectedGuide.is_public}
                  publicId={selectedGuide.public_id}
                  onUpdate={(data) => handleShareUpdate(selectedGuide.id, data)}
                />
                <Button variant="outline" onClick={() => handleExportPDF(selectedGuide)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guide</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GuideCard({ guide, onView, onToggleFavorite, onDelete, onExport, onShareUpdate }) {
  return (
    <Card className="hover:border-gray-300 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{guide.title}</h3>
                  {guide.is_public && (
                    <Globe className="w-4 h-4 text-green-600 flex-shrink-0" title="Public guide" />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {guide.core_system} • {guide.peripheral_device}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleFavorite}
                >
                  <Star className={cn('w-4 h-4', guide.is_favorite && 'fill-yellow-400 text-yellow-400')} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onExport}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{guide.connection_type}</Badge>
                <span className="text-xs text-gray-400">{formatDate(guide.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShareGuideButton
                  guideId={guide.id}
                  isPublic={guide.is_public}
                  publicId={guide.public_id}
                  onUpdate={onShareUpdate}
                  variant="ghost"
                  size="sm"
                />
                <Button variant="ghost" size="sm" onClick={onView}>
                  View Guide
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
