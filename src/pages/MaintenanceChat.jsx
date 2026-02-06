import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { invokeEdgeFunction, getChatSession, saveChatSession } from '@/api/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Trash2,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, getModelDisplayName, getModelColor } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

const SUGGESTED_QUESTIONS = [
  'How do I factory reset a Shure MXA920?',
  'What is the default IP address for QSC Q-SYS Core?',
  'How to update firmware on Crestron DM-NVX?',
  'Biamp Tesira LED status meanings?',
  'How to enable Dante on a Shure P300?',
]

export default function MaintenanceChat() {
  const { user, isPro, getToken } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastMeta, setLastMeta] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Load chat history on mount
  useEffect(() => {
    async function loadChat() {
      if (!user) return
      try {
        const token = await getToken({ template: 'supabase' })
        const session = await getChatSession(user.id, token)
        if (session?.messages) {
          setMessages(session.messages)
        }
      } catch (error) {
        console.error('Error loading chat:', error)
      }
    }
    loadChat()
  }, [user])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0 && user) {
      getToken({ template: 'supabase' }).then(token => {
        saveChatSession(user.id, messages, token)
      }).catch(console.error)
    }
  }, [messages, user])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await invokeEdgeFunction(getToken, 'chat', {
        message: userMessage,
        conversationHistory: messages.slice(-10), // Keep last 10 for context
      })

      if (response.error) {
        if (response.error === 'limit_exceeded') {
          toast.error(response.message)
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Sorry, you've reached your daily question limit. ${isPro ? '' : 'Upgrade to Pro for unlimited questions.'}`,
              isError: true,
            },
          ])
          return
        }
        throw new Error(response.error)
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          meta: response.meta,
        },
      ])
      setLastMeta(response.meta)
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to get response')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedQuestion = (question) => {
    setInput(question)
    inputRef.current?.focus()
  }

  const handleClearChat = () => {
    setMessages([])
    setLastMeta(null)
    if (user) {
      getToken({ template: 'supabase' }).then(token => {
        saveChatSession(user.id, [], token)
      }).catch(console.error)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Chat</h1>
          <p className="text-gray-600">
            Ask questions about AV equipment maintenance and troubleshooting
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearChat}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Maloney
                </h3>
                <p className="text-gray-600 max-w-md mb-6">
                  Ask me anything about firmware updates, factory resets, network configuration,
                  troubleshooting, and more.
                </p>

                {/* Suggested Questions */}
                <div className="w-full max-w-lg space-y-2">
                  <p className="text-sm text-gray-500 mb-3">Try asking:</p>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3 px-4"
                      onClick={() => handleSuggestedQuestion(q)}
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
                      <span className="truncate">{q}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-cyan-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-3',
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : msg.isError
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}

                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                placeholder="Ask about AV maintenance..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </p>
              {lastMeta && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Info className="w-3 h-3" />
                  Last response: {lastMeta.usage?.output_tokens} tokens
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
