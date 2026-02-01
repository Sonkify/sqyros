import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { invokeEdgeFunction, saveGuide } from '@/api/supabaseClient'
import { CORE_SYSTEMS } from '@/data/coreSystems'
import { PERIPHERALS, DEVICE_CATEGORIES, CONNECTION_TYPES } from '@/data/peripherals'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Loader2,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  Save,
  Download,
  Sparkles,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'system', title: 'Select Core System', description: 'Choose your main AV system' },
  { id: 'category', title: 'Device Category', description: 'What type of device?' },
  { id: 'device', title: 'Select Device', description: 'Choose the peripheral device' },
  { id: 'connection', title: 'Connection Type', description: 'How should they connect?' },
  { id: 'generate', title: 'Generate Guide', description: 'Review and generate' },
]

export default function GuideGenerator() {
  const { user, isPro } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedGuide, setGeneratedGuide] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Get devices for selected category
  const categoryDevices = selectedCategory
    ? PERIPHERALS[selectedCategory]?.filter(d => isPro || d.tier === 'basic') || []
    : []

  // Filter devices by search
  const filteredDevices = categoryDevices.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get compatible connections
  const getCompatibleConnections = () => {
    if (!selectedSystem || !selectedDevice) return []
    const system = CORE_SYSTEMS.find(s => s.id === selectedSystem)
    const device = PERIPHERALS[selectedCategory]?.find(d => d.id === selectedDevice)
    if (!system || !device) return []

    const compatible = system.protocols.filter(p => device.protocols.includes(p))
    return CONNECTION_TYPES.filter(c => compatible.includes(c.id))
  }

  const compatibleConnections = getCompatibleConnections()

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedSystem
      case 1: return !!selectedCategory
      case 2: return !!selectedDevice
      case 3: return !!selectedConnection
      default: return true
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const system = CORE_SYSTEMS.find(s => s.id === selectedSystem)
      const device = PERIPHERALS[selectedCategory]?.find(d => d.id === selectedDevice)
      const connection = CONNECTION_TYPES.find(c => c.id === selectedConnection)

      const response = await invokeEdgeFunction('generate-guide', {
        system: system?.name,
        device: device?.name,
        connection: connection?.name,
        category: DEVICE_CATEGORIES.find(c => c.id === selectedCategory)?.name,
      })

      if (response.error) {
        if (response.error === 'limit_exceeded') {
          toast.error(response.message)
          return
        }
        throw new Error(response.error)
      }

      setGeneratedGuide(response.guide)
      toast.success('Guide generated successfully!')
    } catch (error) {
      console.error('Generate error:', error)
      toast.error(error.message || 'Failed to generate guide')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveGuide = async () => {
    if (!generatedGuide) return
    setIsSaving(true)
    try {
      const system = CORE_SYSTEMS.find(s => s.id === selectedSystem)
      const device = PERIPHERALS[selectedCategory]?.find(d => d.id === selectedDevice)
      const connection = CONNECTION_TYPES.find(c => c.id === selectedConnection)

      await saveGuide(user.id, {
        title: generatedGuide.title || `${device?.name} → ${system?.name}`,
        coreSystem: system?.name,
        peripheralDevice: device?.name,
        connectionType: connection?.name,
        content: generatedGuide,
      })
      toast.success('Guide saved!')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save guide')
    } finally {
      setIsSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_SYSTEMS.map((system) => (
              <Card
                key={system.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-blue-300',
                  selectedSystem === system.id && 'border-blue-500 bg-blue-50'
                )}
                onClick={() => setSelectedSystem(system.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{system.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{system.name}</h3>
                      <p className="text-sm text-gray-500">{system.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {system.protocols.slice(0, 4).map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedSystem === system.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 1:
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DEVICE_CATEGORIES.map((category) => (
              <Card
                key={category.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-blue-300 text-center',
                  selectedCategory === category.id && 'border-blue-500 bg-blue-50'
                )}
                onClick={() => {
                  setSelectedCategory(category.id)
                  setSelectedDevice(null)
                }}
              >
                <CardContent className="pt-6">
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {PERIPHERALS[category.id]?.length || 0} devices
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDevices.map((device) => (
                  <Card
                    key={device.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      device.tier === 'pro' && !isPro && 'opacity-60',
                      selectedDevice === device.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-blue-300'
                    )}
                    onClick={() => {
                      if (device.tier === 'pro' && !isPro) {
                        toast.error('This device requires a Pro subscription')
                        return
                      }
                      setSelectedDevice(device.id)
                    }}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{device.name}</h4>
                            {device.tier === 'pro' && !isPro && (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{device.brand}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {device.protocols.map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {selectedDevice === device.id && (
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            {compatibleConnections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compatibleConnections.map((conn) => (
                  <Card
                    key={conn.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-blue-300',
                      selectedConnection === conn.id && 'border-blue-500 bg-blue-50'
                    )}
                    onClick={() => setSelectedConnection(conn.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{conn.name}</h4>
                          <p className="text-sm text-gray-500">{conn.description}</p>
                        </div>
                        {selectedConnection === conn.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">No Compatible Connections</h4>
                      <p className="text-sm text-yellow-700">
                        These devices don't share a common connection protocol. Try selecting a different device or system.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 4:
        const system = CORE_SYSTEMS.find(s => s.id === selectedSystem)
        const device = PERIPHERALS[selectedCategory]?.find(d => d.id === selectedDevice)
        const connection = CONNECTION_TYPES.find(c => c.id === selectedConnection)

        if (generatedGuide) {
          return (
            <div className="space-y-6">
              {/* Guide Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{generatedGuide.title}</CardTitle>
                      <CardDescription>{generatedGuide.subtitle}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        generatedGuide.complexity === 'simple' ? 'secondary' :
                        generatedGuide.complexity === 'medium' ? 'default' : 'destructive'
                      }>
                        {generatedGuide.complexity}
                      </Badge>
                      <Badge variant="outline">{generatedGuide.estimatedTime}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveGuide} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Guide
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Prerequisites */}
              {generatedGuide.prerequisites?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Prerequisites</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {generatedGuide.prerequisites.map((item, i) => (
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Setup Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {generatedGuide.steps?.map((step, i) => (
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
                                    <li key={j}>• {tip}</li>
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
                </CardContent>
              </Card>

              {/* Troubleshooting */}
              {generatedGuide.troubleshooting?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Troubleshooting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {generatedGuide.troubleshooting.map((item, i) => (
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

        return (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Selection</CardTitle>
              <CardDescription>
                Confirm the details below and generate your integration guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Core System</p>
                  <p className="font-medium">{system?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Peripheral Device</p>
                  <p className="font-medium">{device?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Connection Type</p>
                  <p className="font-medium">{connection?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">
                    {DEVICE_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Guide...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Integration Guide
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  This will use Claude Opus for the best quality guide
                </p>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Integration Guide</h1>
        <p className="text-gray-600">
          Create step-by-step setup instructions for connecting AV devices
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{STEPS[currentStep].title}</span>
          <span className="text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      {!generatedGuide && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < STEPS.length - 1 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
