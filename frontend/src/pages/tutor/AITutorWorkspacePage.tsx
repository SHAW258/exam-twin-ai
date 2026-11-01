import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Send,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Maximize2,
  AlertCircle,
  Trash2,
  Wifi,
  WifiOff,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { CitationBadge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api, getAuthToken, getWsBaseUrl } from '../../api/client'
import type { TutorAskResponse, TutorMode, DocumentListItem, SourceCitation, TutorChatMessageItem } from '../../types/api'

interface ChatMessage {
  id: string
  sender: 'student' | 'tutor'
  text: string
  citations?: SourceCitation[]
  grounded?: boolean
  timestamp: string
}

const INITIAL_WELCOME: ChatMessage = {
  id: 'msg-init',
  sender: 'tutor',
  text: 'Hello! I am your ExamTwin AI Study Twin. Every answer I provide is grounded in your uploaded course materials.\n\nAsk any conceptual question, request a Socratic hint, or practice with targeted drill questions.',
  grounded: true,
  citations: [],
  timestamp: 'Just now',
}

export const AITutorWorkspacePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME])
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<TutorMode>('qa')
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // 1. Initial Load: Documents & Persistent Chat History from Database
  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => {})

    // Load past chat messages from DB so previous chat is preserved across refreshes
    api.tutor
      .getHistory(50)
      .then((history: TutorChatMessageItem[]) => {
        if (history && history.length > 0) {
          const formatted: ChatMessage[] = history.map((item) => ({
            id: item.id,
            sender: item.sender,
            text: item.text,
            citations: item.citations || [],
            grounded: item.grounded ?? true,
            timestamp: item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Earlier',
          }))
          setMessages(formatted)
          // Pre-select first citation from latest tutor answer if available
          const latestTutorWithCitations = [...formatted].reverse().find((m) => m.sender === 'tutor' && m.citations?.length)
          if (latestTutorWithCitations?.citations?.length) {
            setSelectedCitation(latestTutorWithCitations.citations[0])
          }
        }
      })
      .catch((err) => {
        console.warn('Could not pre-fetch tutor chat history via HTTP:', err)
      })
  }, [])

  // 2. Real-Time WebSocket Connection to Hold and Stream Chat
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
          console.log('[Tutor WS] Connected to ExamTwin AI live stream')

          // Start heartbeat ping every 25s to prevent Cloudflare/Render idle timeouts
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
                const formatted: ChatMessage[] = data.messages.map((item: TutorChatMessageItem) => ({
                  id: item.id,
                  sender: item.sender,
                  text: item.text,
                  citations: item.citations || [],
                  grounded: item.grounded ?? true,
                  timestamp: item.timestamp
                    ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Earlier',
                }))
                setMessages(formatted)
                const latestWithCits = [...formatted].reverse().find((m) => m.sender === 'tutor' && m.citations?.length)
                if (latestWithCits?.citations?.length) {
                  setSelectedCitation(latestWithCits.citations[0])
                }
              }
            } else if (data.type === 'status') {
              setStatusMessage(data.message || 'Consulting verified course documents and synthesizing grounded proof...')
            } else if (data.type === 'answer') {
              setIsLoading(false)
              setStatusMessage('')
              const tutorMsg: ChatMessage = {
                id: data.id || `tut-${Date.now()}`,
                sender: 'tutor',
                text: data.text,
                citations: data.citations || [],
                grounded: data.grounded ?? true,
                timestamp: data.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
              setMessages((prev) => [...prev, tutorMsg])
              if (data.citations?.length) {
                setSelectedCitation(data.citations[0])
              }
            } else if (data.type === 'history_cleared') {
              setMessages([INITIAL_WELCOME])
              setSelectedCitation(null)
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
            console.error('[Tutor WS] Error parsing incoming packet:', parseErr)
          }
        }

        ws.onclose = (event) => {
          if (!isMounted) return
          setWsStatus('disconnected')
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)

          // Auto-reconnect if not intentionally closed
          if (event.code !== 1000 && event.code !== 1008) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (isMounted) connectWebSocket()
            }, 4000)
          }
        }

        ws.onerror = (err) => {
          console.warn('[Tutor WS] Connection notice:', err)
          setWsStatus('disconnected')
        }
      } catch (err) {
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

  // 3. Send Question (over WebSocket if OPEN, else HTTP fallback)
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!question.trim() || isLoading) return

    const userText = question.trim()
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'student',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    setIsLoading(true)
    setStatusMessage('Consulting verified course documents and synthesizing grounded proof...')

    // Attempt WebSocket transmission if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'question',
          question: userText,
          mode,
          topic: topic.trim() || undefined,
        })
      )
      return
    }

    // HTTP Fallback if WebSocket is not open
    try {
      const res: TutorAskResponse = await api.tutor.ask({
        question: userText,
        mode,
        topic: topic.trim() || undefined,
      })

      const tutorMsg: ChatMessage = {
        id: `tut-${Date.now()}`,
        sender: 'tutor',
        text: res.answer,
        citations: res.citations || [],
        grounded: res.grounded,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, tutorMsg])
      if (res.citations?.length) {
        setSelectedCitation(res.citations[0])
      }
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

  // 4. Clear Chat History
  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your AI Tutor chat history?')) return

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'clear_history' }))
      } else {
        await api.tutor.clearHistory()
        setMessages([INITIAL_WELCOME])
        setSelectedCitation(null)
      }
    } catch (err) {
      console.warn('Error clearing chat history:', err)
      setMessages([INITIAL_WELCOME])
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-5 font-sans overflow-hidden">
      {/* Left / Main: Chat Stream */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Workspace Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {topic.trim() || 'General Course Study'}
                </h2>
                {/* Real-time Connection Status Indicator */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    wsStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : wsStatus === 'connecting'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title={
                    wsStatus === 'connected'
                      ? 'Connected to real-time WebSocket. Chat history is preserved automatically.'
                      : 'WebSocket reconnecting. Messages will fall back to HTTP seamlessly.'
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      wsStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : wsStatus === 'connecting'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  {wsStatus === 'connected' ? 'Live WebSocket' : wsStatus === 'connecting' ? 'Connecting...' : 'HTTP Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {documents.length > 0
                  ? `Grounding Engine Active • ${documents.length} Indexed Course PDF${documents.length === 1 ? '' : 's'}`
                  : 'No course materials uploaded yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Selector */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('qa')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === 'qa' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grounded Q&A
              </button>
              <button
                type="button"
                onClick={() => setMode('hint')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === 'hint' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Socratic Hint
              </button>
              <button
                type="button"
                onClick={() => setMode('practice')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === 'practice' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Practice Drill
              </button>
            </div>

            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Distraction-Free Mode */}
            <Link
              to="/tutor/focus"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Enter Distraction-Free Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Warning Banner if No Documents */}
        {documents.length === 0 && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No course documents uploaded. Upload your syllabus or notes to enable citation-grounded tutoring.</span>
            </div>
            <Link to="/materials" className="font-bold text-amber-900 hover:underline shrink-0">
              Upload PDF &rarr;
            </Link>
          </div>
        )}

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FDFDFE]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'student'
                    ? 'bg-indigo-600 text-white shadow-xs rounded-br-xs'
                    : 'bg-white border border-slate-200 shadow-2xs text-slate-800 rounded-bl-xs'
                }`}
              >
                {msg.sender === 'tutor' && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <CitationBadge
                      grounded={msg.grounded ?? false}
                      citationsCount={msg.citations?.length || 0}
                    />
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Inline Citation Pills if tutor message */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {msg.citations.map((c, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSelectedCitation(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                          selectedCitation === c
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                        }`}
                      >
                        <BookOpen className={`w-3 h-3 ${selectedCitation === c ? 'text-white' : 'text-indigo-500'}`} />
                        <span>Source: p.{c.page_number} ({Math.round(c.similarity_score * 100)}% match)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-4 text-xs text-slate-500 italic">
              <LoadingSpinner size="sm" />
              <span>{statusMessage || 'Consulting verified course documents and synthesizing grounded proof...'}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200 bg-white">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a conceptual question grounded in your course materials..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <Button
              type="submit"
              variant="primary"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs"
              isLoading={isLoading}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Ask Twin
            </Button>
          </form>
        </div>
      </div>

      {/* Right / Citation Inspector Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Citation Verification
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Evidence Grounded
          </span>
        </div>

        {selectedCitation ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 truncate">
                  {selectedCitation.source_path.split('/').pop()}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  Page {selectedCitation.page_number}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Vector Cosine Similarity: <strong>{Math.round(selectedCitation.similarity_score * 100)}%</strong>
              </div>
              {selectedCitation.snippet && (
                <div className="pt-2 text-slate-700 italic border-l-2 border-indigo-500 pl-3 leading-relaxed bg-white/70 p-2 rounded">
                  "{selectedCitation.snippet}"
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <p className="font-bold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mathematically Bound Evidence
              </p>
              <p className="text-[11px] text-emerald-700">
                This excerpt was extracted directly from your verified course PDF index in PostgreSQL.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <BookOpen className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No Citation Selected</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Ask a question or click any citation badge to inspect the quoted passage and page number.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
