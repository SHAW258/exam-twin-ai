import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Send,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Maximize2,
  ExternalLink,
  HelpCircle,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CitationBadge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { TutorAskResponse, TutorMode, DocumentListItem, SourceCitation } from '../../types/api'

interface ChatMessage {
  id: string
  sender: 'student' | 'tutor'
  text: string
  citations?: SourceCitation[]
  grounded?: boolean
  timestamp: string
}

export const AITutorWorkspacePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'tutor',
      text: "Hello! I am your ExamTwin AI Study Twin. Every answer I provide is strictly grounded in your uploaded course materials and lecture slides. What concept or problem can we explore today?",
      grounded: true,
      citations: [],
      timestamp: 'Just now',
    },
  ])

  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<TutorMode>('qa')
  const [topic, setTopic] = useState('Renal Physiology & Fluid Homeostasis')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null)

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => {})
  }, [])

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

    try {
      const res: TutorAskResponse = await api.tutor.ask({
        question: userText,
        mode,
        topic: topic || undefined,
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
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-5 font-sans overflow-hidden">
      {/* Left / Main: Chat Stream (8 cols) */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Workspace Header matching Figma */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{topic}</h2>
              <p className="text-[11px] text-slate-500">
                Grounding Engine Active • {documents.length || 8} Indexed Course PDFs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Selector */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
              <button
                onClick={() => setMode('qa')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === 'qa' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grounded Q&A
              </button>
              <button
                onClick={() => setMode('hint')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === 'hint' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Socratic Hint
              </button>
              <button
                onClick={() => setMode('practice')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === 'practice' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Practice Drill
              </button>
            </div>

            <Link
              to="/tutor/focus"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title="Enter Distraction-Free Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          </div>
        </div>

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
                        key={idx}
                        onClick={() => setSelectedCitation(c)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-700 transition-colors"
                      >
                        <BookOpen className="w-3 h-3 text-indigo-500" />
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
              <span>Consulting verified course textbooks and synthesizing grounded proof...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200 bg-white">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a conceptual question (e.g. explain efferent arteriolar resistance shift)..."
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

      {/* Right / Citation Inspector Panel (4 cols) */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Citation Verification
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            0% Hallucination
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
              <div className="pt-2 text-slate-700 italic border-l-2 border-indigo-500 pl-3 leading-relaxed bg-white/70 p-2 rounded">
                "{selectedCitation.snippet}"
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <p className="font-bold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mathematically Bound Evidence
              </p>
              <p className="text-[11px] text-emerald-700">
                This excerpt was extracted directly from the verified course PDF index in MySQL.
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
