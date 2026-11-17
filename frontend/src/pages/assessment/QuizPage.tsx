import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, Printer, RefreshCw, Upload, AlertTriangle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import { recordQuizAttempt } from '../../utils/assessmentFlow'

type MCQ = {
  question: string
  options: string[]
  correct_option_index: number
  explanation?: string
  source_page?: number
}

function tryParseQuestions(answer: string): { questions: MCQ[]; insufficient: boolean; message?: string } {
  try {
    const parsed = JSON.parse(answer)
    if (parsed && Array.isArray(parsed.questions)) {
      const qs = parsed.questions
        .filter((q: any) => q && typeof q.question === 'string' && Array.isArray(q.options))
        .map((q: any) => ({
          question: String(q.question),
          options: q.options.map((o: any) => String(o)),
          correct_option_index: Number.isInteger(q.correct_option_index) ? q.correct_option_index : 0,
          explanation: q.explanation ? String(q.explanation) : '',
          source_page: q.source_page ? Number(q.source_page) : undefined,
        }))
      return { questions: qs, insufficient: !!parsed.insufficient, message: parsed.message }
    }
  } catch {}
  return { questions: [], insufficient: false }
}

export const QuizPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state || {}) as {
    topic?: string
    questionCount?: number
    documentId?: string
    documentIds?: string[]
    drillMode?: string
    printMode?: boolean
    timedMode?: boolean
  }

  const topic = state.topic || 'Course Material'
  const questionCount = Math.min(25, Math.max(1, state.questionCount || 5))
  const documentIds = state.documentIds || (state.documentId ? [state.documentId] : undefined)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<MCQ[]>([])
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [diagnoses, setDiagnoses] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [progressNote, setProgressNote] = useState<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const timeLimitSec = state.timedMode ? Math.max(60, questionCount * 45) : 0
  const [timeLeft, setTimeLeft] = useState(timeLimitSec)

  useEffect(() => { setTimeLeft(timeLimitSec) }, [timeLimitSec, retryKey])

  useEffect(() => {
    if (!state.timedMode || !timeLeft || submitted || isLoading) return
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [state.timedMode, timeLeft, submitted, isLoading])

  useEffect(() => {
    if (state.timedMode && timeLeft === 0 && !submitted && questions.length > 0) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const loadQuestions = async () => {
    setIsLoading(true)
    setError(null)
    setInsufficientMessage(null)
    setQuestions([])
    setSelected({})
    setDiagnoses({})
    setSubmitted(false)
    setShowResults(false)
    try {
      // generate in batches (3 per call) until we reach requested count or run out
      const collected: MCQ[] = []
      const calls = Math.ceil(questionCount / 3)
      const promptFocus = state.drillMode === 'error'
        ? 'Focus heavily on common misconceptions, tricky edge cases, and high-frequency conceptual traps.'
        : 'Focus on key concepts, definitions, facts, and explanations.'
      for (let i = 0; i < calls; i++) {
        const res = await api.tutor.ask({
          question: `Generate practice MCQs from the uploaded PDF for ${topic}. ${promptFocus} Session variation ${retryKey + 1}-${i + 1}.`,
          mode: 'practice',
          topic,
          document_ids: documentIds,
        })
        const parsed = tryParseQuestions(res.answer)
        if (parsed.insufficient && collected.length === 0) {
          setInsufficientMessage(parsed.message || res.answer || 'Not enough information in the selected PDF to generate questions.')
          break
        }
        if (parsed.questions.length > 0) {
          collected.push(...parsed.questions)
        } else if (res.answer && collected.length === 0) {
          // fallback: create a single question-like card from text
          collected.push({ question: res.answer, options: [], correct_option_index: -1, explanation: 'Review the material and try again for MCQ format.' })
        }
        if (collected.length >= questionCount) break
      }
      // de-dup by question text
      const uniq: MCQ[] = []
      const seen = new Set<string>()
      for (const q of collected) {
        const k = q.question.trim().toLowerCase()
        if (!seen.has(k)) { seen.add(k); uniq.push(q) }
      }
      setQuestions(uniq.slice(0, questionCount))
      if (uniq.length === 0 && !insufficientMessage) setInsufficientMessage('Could not generate questions from the selected PDF. Please try another PDF or upload material with more content.')
    } catch (e: any) {
      setError(e?.message || 'Failed to generate questions from the PDF.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadQuestions() /* eslint-disable-next-line */ }, [retryKey])

  const answerableQuestions = useMemo(() => questions.filter(q => q.options && q.options.length >= 2), [questions])

  const score = useMemo(() => {
    let correct = 0
    answerableQuestions.forEach((q, idx) => { if (selected[idx] === q.correct_option_index) correct++ })
    return { correct, total: answerableQuestions.length, pct: answerableQuestions.length ? Math.round((correct / answerableQuestions.length) * 100) : 0 }
  }, [answerableQuestions, selected])

  const handleSubmit = async () => {
    if (submitted) return
    setSubmitted(true)
    setShowResults(true)
    try {
      if (answerableQuestions.length > 0) {
        const learningObjectiveId = `LO-${topic.substring(0, 8).toUpperCase().replace(/\W/g, '') || 'GEN'}`
        const result = await recordQuizAttempt({
          topic,
          learning_objective_id: learningObjectiveId,
          obtained_score: score.pct,
          max_score: 100,
          evidence: `Quiz/Practice completed on ${topic}. Score ${score.correct}/${score.total} (${score.pct}%). Mode: ${state.drillMode || 'standard'}.`,
        })

        if (result.phase === 'baseline') {
          setProgressNote('Baseline saved. Take another quiz on this topic to measure your progress.')
        } else if (result.measurement) {
          const before = Math.round(result.measurement.pre_normalized_score * 100)
          const after = Math.round(result.measurement.post_normalized_score * 100)
          setProgressNote(`Progress measured: ${before}% before → ${after}% after. Check Analytics and Topic Mastery for details.`)
        }
        if (result.measurementError) {
          setProgressError(`Your score was saved, but progress could not be measured: ${result.measurementError}`)
        }

        // Run automated error diagnosis on incorrect answers to feed Learning DNA
        const diagEntries: Record<number, string> = {}
        for (let idx = 0; idx < answerableQuestions.length; idx++) {
          const q = answerableQuestions[idx]
          const chosen = selected[idx]
          if (chosen !== undefined && chosen !== q.correct_option_index) {
            try {
              const diag = await api.diagnosis.diagnose({
                question: q.question,
                student_answer: q.options[chosen] || 'Incorrect option chosen',
                expected_answer: q.options[q.correct_option_index] || '',
                topic,
                context: q.explanation || '',
              })
              if (diag?.error_category) {
                diagEntries[idx] = `Identified error pattern: ${diag.error_category} (Confidence: ${Math.round((diag.confidence_score || 0) * 100)}%)`
              }
            } catch {}
          }
        }
        if (Object.keys(diagEntries).length > 0) {
          setDiagnoses(diagEntries)
        }
      }
    } catch (e) {
      setProgressError(e instanceof Error ? e.message : 'Could not save your results.')
    }
  }

  const retry = () => {
    setSelected({})
    setDiagnoses({})
    setSubmitted(false)
    setShowResults(false)
    setProgressNote(null)
    setProgressError(null)
  }

  const newSet = () => setRetryKey(k => k + 1)

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Generating questions from your uploaded PDF...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/practice" className="text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4" /></Link>
          <span className="font-bold text-sm text-slate-800">PDF-Based Practice • {topic}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {state.timedMode && <span className={`font-bold px-2 py-1 rounded ${timeLeft < 30 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>Time: {formatTime(timeLeft)}</span>}
          {state.printMode && <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>}
        </div>
      </div>

      {error && (
        <Card className="p-6 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-900">Could not generate practice questions</p>
          <p className="text-xs text-slate-500">{error}</p>
          <Button variant="outline" onClick={loadQuestions}>Try Again</Button>
        </Card>
      )}

      {insufficientMessage && !error && (
        <Card className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-4">
          <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Not enough information in the PDF</h2>
          <p className="text-xs text-slate-600 max-w-xl mx-auto">{insufficientMessage}</p>
          <div className="flex justify-center gap-3 pt-1">
            <Link to="/materials"><Button variant="primary" leftIcon={<Upload className="w-4 h-4" />}>Upload/Select Material</Button></Link>
            <Link to="/practice"><Button variant="outline">Back to Practice Setup</Button></Link>
          </div>
        </Card>
      )}

      {!error && !insufficientMessage && questions.length > 0 && (
        <>
          {showResults && (
            <Card className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#14213D]">Your Score: {score.pct}%</p>
                <p className="text-xs text-slate-500">{score.correct} correct out of {score.total} answered MCQ(s)</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={retry}>Retry Same Questions</Button>
                <Button variant="primary" size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={newSet}>New Questions</Button>
              </div>
            </Card>
          )}

          {(progressNote || progressError) && (
            <div className="space-y-2">
              {progressNote && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                  {progressNote}
                </div>
              )}
              {progressError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {progressError}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, qi) => {
              const hasOptions = q.options && q.options.length >= 2
              const chosen = selected[qi]
              const correct = q.correct_option_index
              const isCorrect = submitted && chosen === correct
              return (
                <Card key={qi} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900"><span className="text-[#2563EB] mr-1">Q{qi + 1}.</span> {q.question}</p>
                    {q.source_page ? <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">p.{q.source_page}</span> : null}
                  </div>
                  {hasOptions ? (
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        let cls = 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        if (submitted) {
                          if (oi === correct) cls = 'border-teal-300 bg-teal-50'
                          else if (oi === chosen) cls = 'border-rose-300 bg-rose-50'
                          else cls = 'border-slate-200 bg-slate-50 opacity-70'
                        } else if (chosen === oi) {
                          cls = 'border-[#2563EB] bg-blue-50'
                        }
                        return (
                          <label key={oi} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer text-xs text-slate-800 ${cls}`}>
                            <input type="radio" name={`q-${qi}`} disabled={submitted} checked={chosen === oi} onChange={() => setSelected(s => ({ ...s, [qi]: oi }))} className="mt-0.5" />
                            <span>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">This question could not be formatted as MCQ. Try generating a new set.</p>
                  )}
                  {submitted && (
                    <div className={`p-3 rounded-xl text-xs ${isCorrect ? 'bg-teal-50 border border-teal-200 text-teal-900' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
                      <p className="font-bold flex items-center gap-1">{isCorrect ? <><CheckCircle2 className="w-4 h-4" /> Correct</> : 'Incorrect / Unanswered'}</p>
                      {hasOptions && correct >= 0 && <p className="mt-1"><strong>Correct answer:</strong> {q.options[correct]}</p>}
                      {q.explanation && <p className="mt-1"><strong>Explanation:</strong> {q.explanation}</p>}
                      {diagnoses[qi] && (
                        <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
                          <p className="font-semibold text-[10px] text-rose-700 uppercase tracking-wide">Error Pattern Diagnosis</p>
                          <p className="mt-0.5">{diagnoses[qi]}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">Answer all questions, then submit to see your score and explanations.</div>
            <div className="flex gap-2">
              {!submitted ? (
                <Button variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={handleSubmit}>Submit Answers</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate('/assessments')}>View Assessment History</Button>
                  <Button variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={newSet}>Generate New Set</Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}