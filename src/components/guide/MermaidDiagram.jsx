import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

// Initialize mermaid with AV-friendly theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#2563eb',
    lineColor: '#64748b',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    rankSpacing: 50,
    nodeSpacing: 30,
  },
})

/**
 * MermaidDiagram - Renders Mermaid diagrams for AV signal flow
 * @param {string} chart - Mermaid chart definition
 * @param {string} title - Optional title for the diagram
 */
export function MermaidDiagram({ chart, title = 'Connection Diagram' }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)
  const [svgContent, setSvgContent] = useState('')

  useEffect(() => {
    if (!chart || !containerRef.current) return

    const renderDiagram = async () => {
      try {
        setError(null)
        const id = `mermaid-${Math.random().toString(36).substring(7)}`
        const { svg } = await mermaid.render(id, chart)
        setSvgContent(svg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError('Could not render diagram')
      }
    }

    renderDiagram()
  }, [chart])

  if (!chart) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-4 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="overflow-x-auto bg-slate-50 rounded-lg p-4"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default MermaidDiagram
