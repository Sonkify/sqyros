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
import { GuideDisplay } from '@/components/guide/GuideDisplay'
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Loader2,
  BookOpen,
  Save,
  Download,
  Sparkles,
  Lock,
  RotateCcw,
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
  const { user, isPro, supabaseClient, getToken } = useAuth()
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

      const response = await invokeEdgeFunction(getToken, 'generate-guide', {
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

      await saveGuide(supabaseClient, user.id, {
        title: generatedGuide.title || `${device?.name} → ${system?.name}`,
        coreSystem: system?.name,
        peripheralDevice: device?.name,
        connectionType: connection?.name,
        content: generatedGuide,
      })

      toast.success('Guide saved!')
      navigate('/saved-guides')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save guide')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartOver = () => {
    setGeneratedGuide(null)
    setCurrentStep(0)
    setSelectedSystem(null)
    setSelectedCategory(null)
    setSelectedDevice(null)
    setSelectedConnection(null)
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
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedSystem === system.id && 'ring-2 ring-blue-500 bg-blue-50'
                )}
                onClick={() => setSelectedSystem(system.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{system.name}</CardTitle>
                    {selectedSystem === system.id && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <CardDescription>{system.brand}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {system.protocols.slice(0, 4).map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {system.protocols.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{system.protocols.length - 4}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 1:
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {DEVICE_CATEGORIES.map((category) => (
              <Card
                key={category.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedCategory === category.id && 'ring-2 ring-blue-500 bg-blue-50'
                )}
                onClick={() => {
                  setSelectedCategory(category.id)
                  setSelectedDevice(null)
                }}
              >
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-gray-500">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                {filteredDevices.map((device) => (
                  <Card
                    key={device.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      selectedDevice === device.id && 'ring-2 ring-blue-500 bg-blue-50',
                      device.tier === 'pro' && !isPro && 'opacity-60'
                    )}
                    onClick={() => {
                      if (device.tier === 'pro' && !isPro) {
                        toast.error('Upgrade to Pro to access this device')
                        return
                      }
                      setSelectedDevice(device.id)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-gray-500">{device.brand}</p>
                        </div>
                        {device.tier === 'pro' && !isPro ? (
                          <Lock className="w-4 h-4 text-gray-400" />
                        ) : selectedDevice === device.id ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {device.protocols.slice(0, 3).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
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
            {compatibleConnections.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-6 text-center">
                  <p className="text-yellow-800">
                    No compatible connections found between these devices.
                    Try selecting a different device or system.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compatibleConnections.map((conn) => (
                  <Card
                    key={conn.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      selectedConnection === conn.id && 'ring-2 ring-blue-500 bg-blue-50'
                    )}
                    onClick={() => setSelectedConnection(conn.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{conn.name}</p>
                          <p className="text-sm text-gray-500 mt-1">{conn.description}</p>
                        </div>
                        {selectedConnection === conn.id && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
              {/* Action buttons */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSaveGuide} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Guide
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="ghost" onClick={handleStartOver}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Use GuideDisplay component */}
              <GuideDisplay guide={generatedGuide} />
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
