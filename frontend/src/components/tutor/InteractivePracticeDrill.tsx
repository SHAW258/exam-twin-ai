import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Lightbulb, AlertCircle, BookOpen, ArrowRight, RotateCcw } from 'lucide-react'

export interface PracticeQuestion {
  question: string
  options: string[]
  correct_option_index: number
  explanation?: string
  source_page?: number
}

export interface PracticeDrillData {
  questions: PracticeQuestion[]
  insufficient?: boolean
  message?: string
}

export function parsePracticeDrillJson(text: string): PracticeDrillData | null {
  if (!text || typeof text !== 'string') return null
  const trimmed = text.trim()
  // Quick pre-check before JSON.parse
  if (!trimmed.startsWith('{') && !trimmed.includes('"questions"')) {
    return null
  }

  try {
    // Strip markdown code fences if present
    let cleaned = trimmed
    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n')
      if (lines[0].startsWith('```')) lines.shift()
      if (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) lines.pop()
      cleaned = lines.join('\n').trim()
    }

    const parsed = JSON.parse(cleaned)
    if (parsed && (Array.isArray(parsed.questions) || parsed.insufficient !== undefined)) {
      const questions: PracticeQuestion[] = Array.isArray(parsed.questions)
        ? parsed.questions
            .filter((q: any) => q && typeof q.question === 'string' && Array.isArray(q.options))
            .map((q: any) => ({
              question: String(q.question),
              options: q.options.map((o: any) => String(o)),
              correct_option_index: Number.isInteger(q.correct_option_index) ? q.correct_option_index : 0,
              explanation: q.explanation ? String(q.explanation) : '',
              source_page: q.source_page ? Number(q.source_page) : undefined,
            }))
        : []
      return {
        questions,
        insufficient: !!parsed.insufficient,
        message: parsed.message || '',
      }
    }
  } catch {
    // Not valid JSON
  }
  return null
}

interface InteractivePracticeDrillProps {
  data: PracticeDrillData
}

export const InteractivePracticeDrill: React.FC<InteractivePracticeDrillProps> = ({ data }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})

  if (data.insufficient) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-900 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900">Course PDF Not Found for Practice Drill</h4>
            <p className="text-amber-800 leading-relaxed">
              {data.message ||
                'I could not find enough relevant information in your uploaded materials to generate questions on this topic. Please upload notes covering this topic in Study Materials.'}
            </p>
          </div>
        </div>
        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-end">
          <Link
            to="/materials"
            className="inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:text-indigo-900 hover:underline text-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Upload Notes in Study Materials &rarr;</span>
          </Link>
        </div>
      </div>
    )
  }

  if (!data.questions || data.questions.length === 0) {
    return (
      <div className="p-3 text-xs text-slate-500 italic">
        No practice questions were returned. Please try another topic.
      </div>
    )
  }

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
  }

  const handleReset = (qIdx: number) => {
    setSelectedAnswers((prev) => {
      const next = { ...prev }
      delete next[qIdx]
      return next
    })
  }

  return (
    <div className="space-y-5 my-1">
      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>Interactive Practice Drill ({data.questions.length} Question{data.questions.length === 1 ? '' : 's'})</span>
        </div>
        <Link
          to="/practice"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          <span>Full Timed Exam Mode</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {data.questions.map((q, qIdx) => {
        const selected = selectedAnswers[qIdx]
        const isAnswered = selected !== undefined
        const isCorrect = isAnswered && selected === q.correct_option_index

        return (
          <div
            key={qIdx}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 transition-all"
          >
            {/* Question Header */}
            <div className="flex items-start justify-between gap-2">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Question {qIdx + 1}
              </span>
              {isAnswered && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Correct!
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Incorrect
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReset(qIdx)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                    title="Retry question"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Question Text */}
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
              {q.question}
            </h4>

            {/* Options List */}
            <div className="space-y-1.5 pt-1">
              {q.options.map((opt, optIdx) => {
                const isThisSelected = selected === optIdx
                const isThisTheCorrectAnswer = optIdx === q.correct_option_index

                let buttonStyle = 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-300'

                if (isAnswered) {
                  if (isThisSelected) {
                    buttonStyle = isCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-400/40'
                      : 'border-rose-400 bg-rose-50 text-rose-900 font-semibold ring-2 ring-rose-400/40'
                  } else if (isThisTheCorrectAnswer) {
                    buttonStyle = 'border-emerald-400 bg-emerald-50/70 text-emerald-800 font-medium'
                  } else {
                    buttonStyle = 'border-slate-200 bg-slate-100/50 text-slate-500 opacity-60'
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(qIdx, optIdx)}
                    disabled={isAnswered}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm transition-all flex items-start gap-2.5 ${buttonStyle}`}
                  >
                    <span className="font-bold shrink-0 text-slate-500">
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    <span className="flex-1">{opt.replace(/^[A-D]\)\s*/i, '')}</span>
                    {isAnswered && isThisSelected && (
                      <span className="shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </span>
                    )}
                    {isAnswered && !isThisSelected && isThisTheCorrectAnswer && (
                      <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                        Correct Answer
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explanation & Source Page (revealed once answered) */}
            {isAnswered && (
              <div className="mt-3 p-3 rounded-lg bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-950 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Explanation:</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  {q.explanation || 'Review the core definitions and course notes to master this topic.'}
                </p>
                {q.source_page !== undefined && (
                  <p className="text-[11px] font-semibold text-indigo-700 pt-1">
                    Verified in notes on Page {q.source_page}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
