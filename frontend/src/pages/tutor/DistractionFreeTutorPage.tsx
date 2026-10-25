import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minimize2, Bot, Send, Sparkles, BookOpen, ShieldCheck, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { CitationBadge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { TutorAskResponse } from '../../types/api'

export const DistractionFreeTutorPage: React.FC = () => {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<TutorAskResponse | null>(null)

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    setIsLoading(true)
    try {
      const res = await api.tutor.ask({
        question: question.trim(),
        mode: 'qa',
      })
      setResponse(res)
    } catch (err) {
      console.warn('Tutor error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFE] text-slate-900 flex flex-col font-sans">
      {/* Top Minimal Bar */}
      <div className="h-16 px-6 border-b border-slate-200/80 flex items-center justify-between bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900">Distraction-Free AI Tutor</span>
            <span className="ml-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Focus Mode
            </span>
          </div>
        </div>

        <Link to="/tutor">
          <Button variant="outline" size="sm" leftIcon={<Minimize2 className="w-4 h-4" />}>
            Exit Focus View (Esc)
          </Button>
        </Link>
      </div>

      {/* Main Focus Canvas */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col justify-between space-y-8">
        {/* Tutor Response Area */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {response ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <CitationBadge grounded={response.grounded} citationsCount={response.citations?.length} />
                <span className="text-xs text-slate-400">Strictly Grounded Synthesis</span>
              </div>

              <div className="text-sm font-semibold text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                {response.question}
              </div>

              <div className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap font-serif">
                {response.answer}
              </div>

              {response.citations && response.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Verified Source Textbooks:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {response.citations.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="font-bold text-indigo-700">Page {c.page_number} ({Math.round(c.similarity_score * 100)}% Match)</div>
                        <p className="text-slate-600 line-clamp-2 italic">"{c.snippet}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Clear Mind • Deep Focus</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Enter any challenging concept or past exam question. The AI Tutor analyzes textbook evidence in real time.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <LoadingSpinner message="Consulting verified course material and synthesizing strict evidence..." />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="sticky bottom-6">
          <form onSubmit={handleAsk} className="relative shadow-lg rounded-2xl bg-white border border-slate-300 overflow-hidden">
            <textarea
              rows={2}
              placeholder="Ask a question without distractions... (Shift + Enter for newline)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-5 py-3.5 text-sm sm:text-base text-slate-900 focus:outline-none placeholder-slate-400 resize-none"
            />
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Grounding: <strong>Course PDFs</strong></span>
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading} rightIcon={<Send className="w-3.5 h-3.5" />}>
                Submit Question
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
