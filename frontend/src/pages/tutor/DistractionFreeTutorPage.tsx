import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Minimize2,
  Bot,
  Send,
  Trash2,
  Sparkles,
  HelpCircle,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { CitationBadge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { parsePracticeDrillJson } from '../../components/tutor/InteractivePracticeDrill'
import { MarkdownMessage } from '../../components/tutor/MarkdownMessage'
import {
  type ChatMessage,
  deriveSourceKind,
  formatHistoryItems,
  mergeServerHistory,
  applyStudentAck,
  insertAnchoredAnswer,
} from '../../components/tutor/chatState'
import { api, getAuthToken, getWsBaseUrl } from '../../api/client'
import type {
  TutorAskResponse,
  TutorMode,
  TutorChatMessageItem,
} from '../../types/api'

type ChatMode = Exclude<TutorMode, 'practice'>

const INITIAL_WELCOME: ChatMessage = {
  id: 'focus-init',
  sender: 'tutor',
  text: 'Welcome to Focus Mode. Distractions are minimized so you can concentrate deeply on your course concepts and step-by-step problem hints.',
  grounded: false,
  citations: [],
  timestamp: 'Just now',
}

export const DistractionFreeTutorPage: React.FC = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME])
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<ChatMode>('qa')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedMsgId(id)
    setTimeout(() => setCopiedMsgId((prev) => (prev === id ? null : prev)), 1800)
  }

  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Handle Esc key to exit focus mode back to standard tutor workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/tutor')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  // 1. Initial Load: Fetch Persistent Chat History from Database
  useEffect(() => {
    api.tutor
      .getHistory(50)
      .then((history: TutorChatMessageItem[]) => {
        if (history && history.length > 0) {
          const formatted = formatHistoryItems(history)
          setMessages((prev) => mergeServerHistory(prev, formatted))
        }
      })
      .catch((err) => {
        console.warn('Could not pre-fetch tutor chat history in focus mode:', err)
      })
  }, [])

  // 2. Real-Time WebSocket Connection to Synchronize Chat History
  useEffect(() => {
    let isMounted = true

    const connectWebSocket = () => {
      const token = getAuthToken()
      if (!token) {
        setWsStatus('disconnected')
        return
      }

      const wsBase = getWsBaseUrl()
      const wsUrl = `${wsBase}/api/v1/tutor/ws?token=${encodeURIComponent(token)}`

      try {
        setWsStatus('connecting')
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!isMounted) return
          setWsStatus('connected')

          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
          heartbeatTimerRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }))
            }
          }, 25000)
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)

            if (data.type === 'history' && Array.isArray(data.messages)) {
              if (data.messages.length > 0) {
                const formatted = formatHistoryItems(data.messages as TutorChatMessageItem[])
                setMessages((prev) => mergeServerHistory(prev, formatted))
              }
            } else if (data.type === 'student_ack') {
              setMessages((prev) =>
                applyStudentAck(prev, {
                  client_msg_id: data.client_msg_id,
                  id: data.id,
                  seq: data.seq,
                  timestamp: data.timestamp,
                })
              )
            } else if (data.type === 'status') {
              setStatusMessage(data.message || 'Consulting verified course material...')
            } else if (data.type === 'answer') {
              setIsLoading(false)
              setStatusMessage('')
              const tutorMsg: ChatMessage = {
                id: data.id || `tut-${Date.now()}`,
                seq: typeof data.seq === 'number' ? data.seq : undefined,
                inReplyTo: data.in_reply_to,
                sender: 'tutor',
                text: data.text,
                citations: data.citations || [],
                grounded: data.grounded ?? true,
                mode: data.mode,
                sourceKind: data.source_kind || deriveSourceKind(data),
                timestamp: data.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
              setMessages((prev) =>
                insertAnchoredAnswer(prev, tutorMsg, data.in_reply_to, data.client_msg_id)
              )
            } else if (data.type === 'history_cleared') {
              setMessages([INITIAL_WELCOME])
              setIsLoading(false)
            } else if (data.type === 'error') {
              setIsLoading(false)
              setStatusMessage('')
              const errorMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                sender: 'tutor',
                text: `Tutor error: ${data.message || 'Could not process question.'}`,
                grounded: false,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
              setMessages((prev) => [...prev, errorMsg])
            }
          } catch (parseErr) {
            console.error('[Focus Tutor WS] Error parsing message:', parseErr)
          }
        }

        ws.onclose = (event) => {
          if (!isMounted) return
          setWsStatus('disconnected')
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)

          if (event.code !== 1000 && event.code !== 1008) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (isMounted) connectWebSocket()
            }, 4000)
          }
        }

        ws.onerror = () => {
          setWsStatus('disconnected')
        }
      } catch {
        setWsStatus('disconnected')
      }
    }

    connectWebSocket()

    return () => {
      isMounted = false
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close(1000, 'Page unmounted')
        wsRef.current = null
      }
    }
  }, [])

  // 3. Send Question in Focus Mode
  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanText = question.trim()
    if (!cleanText || isLoading) return

    const clientMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const userMsg: ChatMessage = {
      id: clientMsgId,
      clientMsgId,
      pending: true,
      sender: 'student',
      text: cleanText,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    setIsLoading(true)

    const loadingLabel =
      mode === 'hint'
        ? 'Synthesizing Socratic hint without spoiling the answer...'
        : 'Consulting course documents and finding citations...'

    setStatusMessage(loadingLabel)

    // Attempt WebSocket transmission if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'question',
          client_msg_id: clientMsgId,
          question: cleanText,
          mode,
        })
      )
      return
    }

    // HTTP Fallback
    try {
      const res: TutorAskResponse = await api.tutor.ask({
        question: cleanText,
        mode,
      })

      const tutorMsg: ChatMessage = {
        id: `tut-${Date.now()}`,
        inReplyTo: clientMsgId,
        sender: 'tutor',
        text: res.answer,
        citations: res.citations || [],
        grounded: res.grounded,
        mode: res.mode,
        sourceKind: res.source_kind || deriveSourceKind(res),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => insertAnchoredAnswer(prev, tutorMsg, clientMsgId, clientMsgId))
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'tutor',
        text: `Error contacting tutor service: ${err instanceof Error ? err.message : 'Unknown error'}. Please ensure documents are uploaded.`,
        grounded: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      setStatusMessage('')
    }
  }

  // Handle Enter to submit, Shift+Enter for new line
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  // Clear Chat History
  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history in Focus Mode?')) return

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'clear_history' }))
      }
      await api.tutor.clearHistory().catch(() => {})
      setMessages([INITIAL_WELCOME])
    } catch (err) {
      console.warn('Error clearing chat history:', err)
      setMessages([INITIAL_WELCOME])
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Minimal Bar */}
      <div className="h-16 px-6 border-b border-slate-200/90 flex items-center justify-between bg-white sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">Distraction-Free AI Tutor</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Focus Mode
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                wsStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {wsStatus === 'connected' ? 'Live' : 'HTTP'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Mode Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('qa')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'qa' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Concept Q&A</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('hint')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'hint' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Socratic Hint</span>
            </button>
          </div>

          {/* Clear Chat */}
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
            title="Clear all chat messages"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>

          {/* Exit Focus Mode */}
          <Link to="/tutor">
            <Button variant="outline" size="sm" leftIcon={<Minimize2 className="w-4 h-4" />}>
              Exit Focus View (Esc)
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Focus Canvas: Full Conversation History */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-between space-y-6">
        {/* Tutor Response Scrollable History */}
        <div className="flex-1 overflow-y-auto space-y-5">
          {messages.map((msg) => {
            const parsedDrill = msg.sender === 'tutor' ? parsePracticeDrillJson(msg.text) : null

            if (msg.sender === 'student') {
              return (
                <div key={msg.clientMsgId || msg.id} className="flex justify-end w-full">
                  <div className="max-w-[82%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-indigo-600 text-white px-5 py-3.5 text-sm sm:text-base shadow-xs break-words">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-[10px] text-indigo-200 text-right mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className="flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-6 py-3.5 bg-slate-50/60 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">CodeKnot AI</span>
                      <CitationBadge
                        grounded={msg.grounded ?? false}
                        citationsCount={msg.citations?.length || 0}
                        sourceKind={msg.sourceKind}
                        mode={msg.mode}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    {parsedDrill ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-800">Older practice record hidden</p>
                        <p>Quizzes are no longer shown in AI Tutor chat. Use the Practice Setup page to generate a quiz.</p>
                      </div>
                    ) : (
                      <MarkdownMessage content={msg.text} />
                    )}

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          Verified Source Textbooks:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                            >
                              <div className="font-bold text-indigo-700">
                                Page {c.page_number} ({Math.round(c.similarity_score * 100)}% Match)
                              </div>
                              <p className="text-slate-600 line-clamp-2 italic">"{c.snippet}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!parsedDrill && (
                    <div className="px-6 py-2 bg-slate-50/40 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Copy response"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <LoadingSpinner
                message={statusMessage || 'Consulting verified course material and synthesizing strict evidence...'}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="sticky bottom-4 z-20">
          <form
            onSubmit={handleAsk}
            className="relative shadow-lg rounded-2xl bg-white border border-slate-300 overflow-hidden"
          >
            <textarea
              rows={2}
              placeholder={
                mode === 'hint'
                  ? 'Describe a problem or question you need a Socratic hint on... (Shift + Enter for newline)'
                  : 'Ask any conceptual question without distractions... (Shift + Enter for newline)'
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              className="w-full px-5 py-3.5 text-sm sm:text-base text-slate-900 focus:outline-none placeholder-slate-400 resize-none"
            />
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Sources: <strong>Course Library PDFs</strong></span>
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                {mode === 'hint' ? 'Get Hint' : 'Submit Question'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
