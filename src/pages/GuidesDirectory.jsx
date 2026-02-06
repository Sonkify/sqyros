import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { BookOpen, ArrowRight, Mic, Speaker, Video, Monitor } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const popularCombinations = [
  {
    category: 'QSC Q-SYS Integrations',
    icon: '🎛️',
    combinations: [
      { system: 'QSC Q-SYS', device: 'Shure MXA920', slug: 'qsc-qsys-shure-mxa920' },
      { system: 'QSC Q-SYS', device: 'Sennheiser TeamConnect', slug: 'qsc-qsys-sennheiser-teamconnect' },
      { system: 'QSC Q-SYS', device: 'Poly Studio X70', slug: 'qsc-qsys-poly-studio-x70' },
      { system: 'QSC Q-SYS', device: 'Yealink MeetingBar', slug: 'qsc-qsys-yealink-meetingbar' },
    ]
  },
  {
    category: 'Crestron Integrations',
    icon: '🏢',
    combinations: [
      { system: 'Crestron', device: 'Shure MXA910', slug: 'crestron-shure-mxa910' },
      { system: 'Crestron', device: 'Biamp Parlé', slug: 'crestron-biamp-parle' },
      { system: 'Crestron', device: 'Cisco Room Kit', slug: 'crestron-cisco-room-kit' },
      { system: 'Crestron', device: 'Samsung Display', slug: 'crestron-samsung-display' },
    ]
  },
  {
    category: 'Biamp Tesira Integrations',
    icon: '🔊',
    combinations: [
      { system: 'Biamp Tesira', device: 'Shure MXA710', slug: 'biamp-tesira-shure-mxa710' },
      { system: 'Biamp Tesira', device: 'QSC Speakers', slug: 'biamp-tesira-qsc-speakers' },
      { system: 'Biamp Tesira', device: 'Sennheiser SpeechLine', slug: 'biamp-tesira-sennheiser-speechline' },
    ]
  },
  {
    category: 'Extron Integrations',
    icon: '📡',
    combinations: [
      { system: 'Extron', device: 'Shure MXA310', slug: 'extron-shure-mxa310' },
      { system: 'Extron', device: 'LG Display', slug: 'extron-lg-display' },
      { system: 'Extron', device: 'Epson Projector', slug: 'extron-epson-projector' },
    ]
  },
]

const deviceCategories = [
  { name: 'Microphones', icon: Mic, count: '15+', description: 'Ceiling arrays, table mics, wireless systems' },
  { name: 'Speakers', icon: Speaker, count: '20+', description: 'Ceiling, pendant, and surface mount speakers' },
  { name: 'Video Bars', icon: Video, count: '12+', description: 'All-in-one conferencing solutions' },
  { name: 'Displays', icon: Monitor, count: '10+', description: 'Commercial displays and projectors' },
]

export default function GuidesDirectory() {
  return (
    <>
      <Helmet>
        <title>AV Integration Guides Directory | Sqyros</title>
        <meta name="description" content="Professional AV setup guides for QSC Q-SYS, Crestron, Biamp, Extron and more. Step-by-step integration guides for microphones, speakers, video bars and displays." />
        <link rel="canonical" href="https://sqyros.com/guides" />
        <meta property="og:title" content="AV Integration Guides Directory | Sqyros" />
        <meta property="og:description" content="Professional AV setup guides for enterprise audio-visual systems." />
        <meta property="og:url" content="https://sqyros.com/guides" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white text-sm">S</span>
              </div>
              <span className="font-bold text-gray-900">Sqyros</span>
            </Link>
            <Link to="/signup">
              <Button>Create Your Own Guide</Button>
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AV Integration Guides
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional setup guides for enterprise audio-visual systems. 
              Connect any device to any control system with step-by-step instructions.
            </p>
          </div>

          {/* Device Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {deviceCategories.map((cat) => (
              <Card key={cat.name} className="text-center">
                <CardContent className="pt-6">
                  <cat.icon className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{cat.count} devices</p>
                  <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Popular Combinations */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Integration Guides</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {popularCombinations.map((section) => (
              <Card key={section.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{section.icon}</span>
                    {section.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {section.combinations.map((combo) => (
                      <li key={combo.slug}>
                        <Link
                          to={'/generate-guide?system=' + encodeURIComponent(combo.system) + '&device=' + encodeURIComponent(combo.device)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group"
                        >
                          <span className="text-gray-700 group-hover:text-blue-600">
                            {combo.system} + {combo.device}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardContent className="py-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h2 className="text-2xl font-bold mb-2">Can't find your combination?</h2>
              <p className="text-blue-100 mb-6 max-w-md mx-auto">
                Create a custom guide for any device combination with our AI-powered guide generator.
              </p>
              <Link to="/signup">
                <Button variant="secondary" size="lg">
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>
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
