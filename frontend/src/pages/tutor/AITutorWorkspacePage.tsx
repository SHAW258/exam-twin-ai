import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Send,
  BookOpen,
  ShieldCheck,
  Maximize2,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Globe,
  History,
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
  DocumentListItem,
  SourceCitation,
  TutorChatMessageItem,
  AIPracticeRecord,
} from '../../types/api'

type ChatMode = Exclude<TutorMode, 'practice'>

const INITIAL_WELCOME: ChatMessage = {
  id: 'msg-init',
  sender: 'tutor',
  text: 'Hello! I am your CodeKnot AI Tutor. When your study materials are uploaded, I cite exact pages from your course notes.\n\nChoose a mode above to ask a conceptual question or request a Socratic hint.',
  grounded: false,
  citations: [],
  timestamp: 'Just now',
}

const MODE_CONFIG: Record<
  ChatMode,
  {
    title: string
    description: string
    placeholder: string
    buttonText: string
    icon: React.ReactNode
    chips: string[]
  }
> = {
  qa: {
    title: 'Concept Q&A',
    description: 'In-depth conceptual explanations citing verified textbook pages from your syllabus.',
    placeholder: 'Ask any conceptual question (e.g., What is the CIA Triad in security?)...',
    buttonText: 'Ask Tutor',
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-500" />,
    chips: [
      'What is the CIA Triad in cybersecurity?',
      'Explain Virtual Memory and Paging in OS',
      'What are ACID properties in databases?',
      'Explain Big-O Time Complexity',
    ],
  },
  hint: {
    title: 'Socratic Hint',
    description: 'Guiding clues and thought-provoking questions to help you solve problems step by step.',
    placeholder: 'Describe a question or problem you are stuck on (e.g., How to detect deadlock?)...',
    buttonText: 'Get Socratic Hint',
    icon: <HelpCircle className="w-3.5 h-3.5 text-amber-500" />,
    chips: [
      'Hint: How to detect and prevent deadlocks?',
      'Hint: Difference between Process and Thread?',
      'Hint: What are the edge cases in Binary Search?',
      'Hint: When should I choose BFS over DFS?',
    ],
  },
}

export const AITutorWorkspacePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME])
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<ChatMode>('qa')
  const [topic, _setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [aiPracticeRecords, setAiPracticeRecords] = useState<AIPracticeRecord[]>([])
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null)
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

  // 1. Initial Load: Documents & Persistent Chat History from Database
  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => {})
    api.tutor.getAiPractice(10).then(setAiPracticeRecords).catch(() => {})

    api.tutor
      .getHistory(50)
      .then((history: TutorChatMessageItem[]) => {
        if (history && history.length > 0) {
          const formatted = formatHistoryItems(history)
          setMessages((prev) => mergeServerHistory(prev, formatted))
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
          console.log('[Tutor WS] Connected to CodeKnot live stream')

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
                const latestWithCits = [...formatted].reverse().find((m) => m.sender === 'tutor' && m.citations?.length)
                if (latestWithCits?.citations?.length) {
                  setSelectedCitation(latestWithCits.citations[0])
                }
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
              setStatusMessage(data.message || 'Consulting verified course documents and finding citations...')
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
                practiceRecordId: data.practice_record_id,
                timestamp: data.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
              setMessages((prev) =>
                insertAnchoredAnswer(prev, tutorMsg, data.in_reply_to, data.client_msg_id)
              )
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

  // 3. Send Question Core Helper
  const sendQuestionDirect = async (textToSend: string, explicitMode?: ChatMode) => {
    const activeMode = explicitMode || mode
    const cleanText = textToSend.trim()
    if (!cleanText || isLoading) return

    const clientMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const userMsg: ChatMessage = {
      id: clientMsgId,
      clientMsgId,
      pending: true,
      sender: 'student',
      text: cleanText,
      mode: activeMode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    setIsLoading(true)

    const loadingLabel =
      activeMode === 'hint'
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
          mode: activeMode,
          topic: topic.trim() || undefined,
        })
      )
      return
    }

    // HTTP Fallback if WebSocket is not open
    try {
      const res: TutorAskResponse = await api.tutor.ask({
        question: cleanText,
        mode: activeMode,
        topic: topic.trim() || undefined,
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
        practiceRecordId: res.practice_record_id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => insertAnchoredAnswer(prev, tutorMsg, clientMsgId, clientMsgId))
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

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    sendQuestionDirect(question)
  }

  // 4. Clear Chat History via WebSocket and HTTP
  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history with the AI Tutor?')) return

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'clear_history' }))
      }
      await api.tutor.clearHistory().catch(() => {})
      setMessages([INITIAL_WELCOME])
      setSelectedCitation(null)
    } catch (err) {
      console.warn('Error clearing chat history:', err)
      setMessages([INITIAL_WELCOME])
    }
  }

  const currentConfig = MODE_CONFIG[mode]
  const latestTutorSource = [...messages]
    .reverse()
    .find((m) => m.sender === 'tutor' && m.id !== INITIAL_WELCOME.id && m.sourceKind)
    ?.sourceKind

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
                  ? `Your Library • ${documents.length} Indexed PDF${documents.length === 1 ? '' : 's'}`
                  : 'No course materials uploaded yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 3-Mode Selector */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setMode('qa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  mode === 'qa'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Concept Q&A: Thorough explanations with verified citations"
              >
                <Sparkles className={`w-3.5 h-3.5 ${mode === 'qa' ? 'text-white' : 'text-indigo-600'}`} />
                <span>Concept Q&A</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('hint')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  mode === 'hint'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Socratic Hint: Clues and guiding questions without spoiling the answer"
              >
                <HelpCircle className={`w-3.5 h-3.5 ${mode === 'hint' ? 'text-white' : 'text-amber-500'}`} />
                <span>Socratic Hint</span>
              </button>
            </div>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold shadow-2xs transition-all"
              title="Clear all chat messages and reset conversation"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
              <span>Clear Chat</span>
            </button>

            {/* Distraction-Free Mode */}
            <Link
              to="/tutor/focus"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Enter Distraction-Free Focus Mode (Preserves Chat)"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Active Mode Notice Strip */}
        <div className="px-5 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-950">
          <div className="flex items-center gap-2">
            {currentConfig.icon}
            <span className="font-semibold text-indigo-900">{currentConfig.title}:</span>
            <span className="text-slate-600">{currentConfig.description}</span>
          </div>
        </div>

        {/* Warning Banner if No Documents */}
        {documents.length === 0 && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No PDFs in your library yet. You can still use shared course data or general academic guidance.</span>
            </div>
            <Link to="/materials" className="font-bold text-amber-900 hover:underline shrink-0">
              Upload PDF &rarr;
            </Link>
          </div>
        )}

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="max-w-3xl mx-auto w-full space-y-5">
            {messages.map((msg) => {
              const parsedDrill = msg.sender === 'tutor' ? parsePracticeDrillJson(msg.text) : null

              if (msg.sender === 'student') {
                return (
                  <div key={msg.clientMsgId || msg.id} className="flex justify-end w-full">
                    <div className="max-w-[82%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-indigo-600 text-white px-4 py-3 text-sm leading-relaxed shadow-xs break-words">
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      <span className="block text-[10px] text-indigo-200/90 text-right mt-1.5">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex items-start gap-3 w-full">
                  {/* Sleek AI Avatar */}
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>

                  {/* ChatGPT / Gemini style AI Response Card */}
                  <div className="flex-1 min-w-0 max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 shadow-xs overflow-hidden">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">CodeKnot AI</span>
                      <CitationBadge
                        grounded={msg.grounded ?? false}
                        citationsCount={msg.citations?.length || 0}
                        sourceKind={msg.sourceKind}
                        mode={msg.mode}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{msg.timestamp}</span>
                  </div>

                  {/* Formatted Response Body */}
                  <div className="px-5 py-4">
                    {parsedDrill ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-800">Older practice record hidden</p>
                        <p>Quizzes are no longer shown in AI Tutor chat. Use the Practice Setup page to generate a quiz.</p>
                      </div>
                    ) : (
                      <MarkdownMessage content={msg.text} />
                    )}

                    {/* Inline Citation Pills */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-2">
                        {msg.citations.map((c, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setSelectedCitation(c)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                              selectedCitation === c
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                            }`}
                          >
                            <BookOpen className={`w-3 h-3 ${selectedCitation === c ? 'text-white' : 'text-indigo-500'}`} />
                            <span>Source: p.{c.page_number} ({Math.round(c.similarity_score * 100)}% match)</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subtle Footer Action Bar (Copy response like ChatGPT / Gemini) */}
                  {!parsedDrill && (
                    <div className="px-5 py-2 bg-slate-50/40 border-t border-slate-100 flex items-center justify-end">
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
            <div className="flex items-start gap-3 w-full">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3 text-xs sm:text-sm text-slate-600 bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm shadow-2xs">
                <LoadingSpinner size="sm" />
                <span>{statusMessage || 'Thinking and synthesizing your answer...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar with Dynamic Mode Chips */}
        <div className="p-3.5 border-t border-slate-200 bg-white space-y-2">
          {/* Quick Suggestion Chips based on selected mode */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
              Suggestions:
            </span>
            {currentConfig.chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendQuestionDirect(chip)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 border border-slate-200 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={currentConfig.placeholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <Button
              type="submit"
              variant="primary"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs shrink-0"
              isLoading={isLoading}
              rightIcon={<Send className="w-4 h-4" />}
            >
              {currentConfig.buttonText}
            </Button>
          </form>
        </div>
      </div>

      {/* Right / Source & Citation Inspector Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 overflow-y-auto">
        {latestTutorSource && latestTutorSource !== 'own_document' && latestTutorSource !== 'none' && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1 ${
              latestTutorSource === 'global_document'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <p className="font-bold flex items-center gap-1.5">
              {latestTutorSource === 'global_document' ? (
                <Globe className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              )}
              {latestTutorSource === 'global_document' ? 'Shared Course Data' : 'General Academic Guidance'}
            </p>
            <p className="text-[11px] leading-relaxed opacity-90">
              {latestTutorSource === 'global_document'
                ? 'This answer used the anonymous shared course database. File names, page numbers, uploaders, and similarity scores are hidden.'
                : 'This answer did not use a PDF. No-PDF drills are recorded in your AI practice log below.'}
            </p>
          </div>
        )}

        {aiPracticeRecords.length > 0 && (
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              <History className="w-3.5 h-3.5 text-slate-500" />
              AI Practice Log
            </p>
            <p className="text-[11px] text-slate-500">Topics practised when no PDF matched.</p>
            <ul className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {aiPracticeRecords.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-2 text-[11px] rounded-lg bg-white border border-slate-200 px-2.5 py-1.5"
                >
                  <span className="font-semibold text-slate-800 truncate">{record.topic}</span>
                  <span className="text-slate-500 shrink-0">
                    {record.question_count} Q{record.created_at ? ` · ${new Date(record.created_at).toLocaleDateString()}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Citation Verification
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {latestTutorSource === 'global_document'
              ? 'Shared Data'
              : latestTutorSource === 'general_ai'
              ? 'General Answer'
              : 'Verified Source'}
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
                This excerpt was extracted directly from your verified course PDF index in the database.
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
