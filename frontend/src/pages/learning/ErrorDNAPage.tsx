import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Dna,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Filter,
  Flame,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { ErrorDNASummary } from '../../types/api'

export const ErrorDNAPage: React.FC = () => {
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.learning.getState()
      .then(setLearnerState)
      .catch((err) => console.warn('Failed to fetch Error DNA:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const totalDiagnoses = learnerState?.total_diagnoses || 0
  const recurringErrors = learnerState?.recurring_errors || []
  const topError = recurringErrors.length > 0 ? recurringErrors[0].category : null

  // Recurrence rate calculation
  const recurrenceRate = totalDiagnoses > 0 && recurringErrors.length > 0
    ? Math.round((recurringErrors.reduce((sum, e) => sum + e.count, 0) / totalDiagnoses) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Synthesizing Error DNA profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Cognitive Diagnostics / Error DNA Profiler
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Error DNA Synthesis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <Dna className="w-3.5 h-3.5" /> Cognitive Profiler
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Algorithmic mapping of recurring reasoning traps, procedurally diagnosed misconceptions, and high-priority retrieval drill recommendations.
          </p>
        </div>

        {totalDiagnoses > 0 && (
          <div className="flex items-center gap-3">
            <Link to="/practice">
              <Button
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-xs py-2.5 px-4 font-semibold"
                leftIcon={<Play className="w-4 h-4 fill-white" />}
              >
                Remediate Top Trap
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Evaluated</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalDiagnoses}</div>
          <p className="text-[11px] text-slate-500">Cognitive evaluations logged</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recurrence Rate</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{recurrenceRate}%</div>
          <p className="text-[11px] text-slate-500">Misconceptions recurring &ge; 2 times</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Identified Traps</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{recurringErrors.length}</div>
          <p className="text-[11px] text-slate-500">Unique recurring error categories</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Trap Category</span>
          <div className="text-base sm:text-lg font-black text-slate-900 truncate">
            {topError || 'None'}
          </div>
          <p className="text-[11px] text-slate-500">Highest frequency pattern</p>
        </div>
      </div>

      {totalDiagnoses === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
            <Dna className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Cognitive Errors Diagnosed Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Complete practice drills, quizzes, or chat with the AI Tutor. ExamTwin's supervised ML error classifier will evaluate your answers, detect recurring reasoning traps, and build your personalized Error DNA profile.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Diagnostic Drill
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top Error Banner */}
          {topError && (
            <div className="p-6 md:p-8 rounded-2xl border-2 border-rose-300/80 bg-gradient-to-r from-rose-50/80 via-white to-indigo-50/60 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white flex items-center gap-1.5 shadow-2xs">
                  <Flame className="w-3.5 h-3.5" /> Primary Identified Reasoning Trap
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {topError}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
                This misconception pattern has recurred across your recent evaluations. Practice targeted retrieval drills to eliminate this cognitive slip before your exam.
              </p>
              <div className="pt-2">
                <Link to="/practice">
                  <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Remediate with Targeted Drill
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Active Error Taxonomy */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Error Taxonomy</h3>
                <p className="text-xs text-slate-500">Supervised machine learning misconception classification from your logged attempts</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Supervised Classifier</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {recurringErrors.map((err, i) => {
                const colors = [
                  { bg: 'bg-rose-500', pill: 'text-rose-700 bg-rose-50 border-rose-200' },
                  { bg: 'bg-amber-500', pill: 'text-amber-700 bg-amber-50 border-amber-200' },
                  { bg: 'bg-indigo-600', pill: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                  { bg: 'bg-blue-500', pill: 'text-blue-700 bg-blue-50 border-blue-200' },
                ]
                const currentTheme = colors[i % colors.length]

                return (
                  <div key={err.category} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{err.category}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${currentTheme.pill}`}>
                        {err.percentage.toFixed(1)}% ({err.count} instance{err.count === 1 ? '' : 's'})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${currentTheme.bg}`}
                        style={{ width: `${Math.min(100, err.percentage)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
