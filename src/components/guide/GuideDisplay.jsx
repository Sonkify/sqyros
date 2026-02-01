import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'

/**
 * GuideDisplay - Reusable component to display guide content
 * Used by PublicGuidePage, SavedGuides dialog, and GuideGenerator
 *
 * @param {Object} props
 * @param {Object} props.guide - The guide data (can be guide_content or full guide object)
 * @param {boolean} props.preview - If true, shows truncated preview with blur
 * @param {boolean} props.showHeader - If true, shows the guide header card (default: true)
 */
export function GuideDisplay({ guide, preview = false, showHeader = true }) {
  if (!guide) return null

  // Support both direct guide_content and wrapped guide object
  const content = guide.guide_content || guide

  return (
    <div className="space-y-6">
      {/* Guide Header */}
      {showHeader && (content.title || content.subtitle) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{content.title}</CardTitle>
                {content.subtitle && (
                  <CardDescription>{content.subtitle}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {content.complexity && (
                  <Badge variant={
                    content.complexity === 'simple' ? 'secondary' :
                    content.complexity === 'medium' ? 'default' : 'destructive'
                  }>
                    {content.complexity}
                  </Badge>
                )}
                {content.estimatedTime && (
                  <Badge variant="outline">{content.estimatedTime}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Prerequisites */}
      {content.prerequisites?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prerequisites</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.prerequisites.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      {content.steps?.length > 0 && (
        <Card className={preview ? 'relative' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">Setup Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {content.steps.slice(0, preview ? 2 : undefined).map((step, i) => (
                <AccordionItem key={i} value={`step-${i}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm flex items-center justify-center font-medium">
                        {step.stepNumber || i + 1}
                      </span>
                      <span>{step.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-9 space-y-4">
                      <p className="text-gray-700">{step.content}</p>

                      {step.code && (
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                          <code>{step.code}</code>
                        </pre>
                      )}

                      {step.tips?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                            <Lightbulb className="w-4 h-4" />
                            Tips
                          </div>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {step.tips.map((tip, j) => (
                              <li key={j}>&bull; {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {step.warnings?.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Warnings
                          </div>
                          <ul className="text-sm text-yellow-800 space-y-1">
                            {step.warnings.map((warning, j) => (
                              <li key={j}>&bull; {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>

          {/* Preview blur overlay */}
          {preview && content.steps?.length > 2 && (
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
          )}
        </Card>
      )}

      {/* Verification */}
      {!preview && content.verification?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.verification.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      {!preview && content.troubleshooting?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {content.troubleshooting.map((item, i) => (
                <div key={i} className="border-l-2 border-gray-200 pl-4">
                  <p className="font-medium text-gray-900">{item.issue}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.solution}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GuideDisplay
