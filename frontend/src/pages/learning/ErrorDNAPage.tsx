import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Dna,
  ArrowRight,
  Play,
  AlertCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { ErrorDNASummary } from '../../types/api'

/** Turn machine labels into words a student can understand. */
const ERROR_LABELS: Record<string, string> = {
  CONCEPTUAL_MISUNDERSTANDING: 'Did not understand the basic idea',
  RECALL_FAILURE: 'Could not remember the term',
  FORMULA_RULE_ERROR: 'Used the wrong formula or rule',
  CALCULATION_EXECUTION_ERROR: 'Made a calculation slip',
  REASONING_LOGICAL_ERROR: 'Reasoning skipped a step',
  QUESTION_MISREADING: 'Misread the question',
  PARTIAL_KNOWLEDGE: 'Answer was incomplete',
}

/** Short versions for chart axes. */
const SHORT_LABELS: Record<string, string> = {
  CONCEPTUAL_MISUNDERSTANDING: 'Concept',
  RECALL_FAILURE: 'Memory',
  FORMULA_RULE_ERROR: 'Formula',
  CALCULATION_EXECUTION_ERROR: 'Calculation',
  REASONING_LOGICAL_ERROR: 'Reasoning',
  QUESTION_MISREADING: 'Misread',
  PARTIAL_KNOWLEDGE: 'Incomplete',
}

const CHART_COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#F43F5E', '#6366F1', '#0891B2', '#A855F7']

const plainError = (category: string) =>
  ERROR_LABELS[category] ?? category.replace(/_/g, ' ').toLowerCase()

const shortError = (category: string) => SHORT_LABELS[category] ?? plainError(category)

export const ErrorDNAPage: React.FC = () => {
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.learning.getState()
      .then(setLearnerState)
      .catch(() => setError('Could not load your mistake patterns. Refresh the page to try again.'))
      .finally(() => setIsLoading(false))
  }, [])

  const totalDiagnoses = learnerState?.total_diagnoses || 0
  const recurringErrors = learnerState?.recurring_errors || []
  const topError = recurringErrors.length > 0 ? recurringErrors[0].category : null
  const reviewCount = learnerState?.review_required_count || 0
  const topics = learnerState?.most_affected_topics || []

  const recurrenceRate = totalDiagnoses > 0 && recurringErrors.length > 0
    ? Math.round((recurringErrors.reduce((sum, e) => sum + e.count, 0) / totalDiagnoses) * 100)
    : 0

  const mistakeChartData = recurringErrors.slice(0, 6).map((e, i) => ({
    name: plainError(e.category),
    short: shortError(e.category),
    count: e.count,
    percentage: e.percentage,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const topicChartData = topics.slice(0, 6).map((t) => ({ name: t.topic, mistakes: t.count }))
  const hasCharts = mistakeChartData.length > 0 || topicChartData.length > 0

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Reviewing your answers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">CodeKnot / Learning Patterns</div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Learning Patterns & Mistakes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center gap-1">
              <Dna className="w-3.5 h-3.5" /> Mistake Patterns
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            See which mistakes you keep making and what to practise next.
          </p>
        </div>

        {totalDiagnoses > 0 && (
          <Link to="/practice">
            <Button
              variant="primary"
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-xs py-2.5 px-4 font-semibold"
              leftIcon={<Play className="w-4 h-4 fill-white" />}
            >
              Practice My Main Mistake
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Answers Checked</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalDiagnoses}</div>
          <p className="text-[11px] text-slate-500">Answers reviewed so far</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mistakes Repeated</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{recurrenceRate}%</div>
          <p className="text-[11px] text-slate-500">Mistakes made more than once</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Types of Mistakes</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{recurringErrors.length}</div>
          <p className="text-[11px] text-slate-500">Different mistakes seen more than once</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Most Common Mistake</span>
          <div className="text-sm sm:text-base font-black text-slate-900 truncate" title={topError ? plainError(topError) : ''}>
            {topError ? plainError(topError) : 'None yet'}
          </div>
          <p className="text-[11px] text-slate-500">The mistake you make most often</p>
        </div>
      </div>

      {totalDiagnoses === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
            <Dna className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Mistakes Found Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Take a quiz or answer a practice question. CodeKnot will check your answers and show you which mistakes you repeat.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Practicing
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {topError && (
            <div className="p-6 md:p-8 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-teal-50/60 space-y-3">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#2563EB] text-white shadow-2xs">
                Your Most Common Mistake
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {plainError(topError)}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
                You have made this mistake a few times. Practise this topic to fix it before your exam.
              </p>
              <div className="pt-2">
                <Link to="/practice">
                  <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Practice This Mistake
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {reviewCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>{reviewCount} answer{reviewCount === 1 ? '' : 's'} still need a closer look.</strong> Answer a few more practice questions so we can work out your mistake pattern with more confidence.
              </p>
            </div>
          )}

          {hasCharts ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Mistakes by Type</h3>
                  <p className="text-xs text-slate-500">Based on the answers you have submitted</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mistakeChartData}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {mistakeChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown, _name: unknown, item: unknown) => {
                          const pct = (item as { payload?: { percentage?: number } })?.payload?.percentage ?? 0
                          return [`${Number(value ?? 0)} time(s) (${pct.toFixed(1)}%)`, 'Mistake'] as [string, string]
                        }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                  {mistakeChartData.map((entry) => (
                    <span key={entry.name} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                      {entry.name}
                    </span>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Topics to Work On</h3>
                  <p className="text-xs text-slate-500">Where your mistakes happened most often</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        formatter={(value: unknown) => [`${Number(value ?? 0)} mistake(s)`, 'Count'] as [string, string]}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="mistakes" radius={[0, 6, 6, 0]}>
                        {topicChartData.map((entry, i) => (
                          <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-900">Your Mistakes by Type</h3>
              <p className="text-xs text-slate-500 mt-1">
                Answer a few more practice questions and your mistake chart will appear here.
              </p>
            </Card>
          )}

          {mistakeChartData.length > 0 && (
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mistakes You Keep Making</h3>
                  <p className="text-xs text-slate-500">Based on the answers you have submitted</p>
                </div>
                <span className="text-xs text-slate-400">From your answers</span>
              </div>

              <div className="space-y-3 pt-1">
                {recurringErrors.map((err, i) => (
                  <div key={err.category} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs gap-3">
                      <span className="font-bold text-slate-800">{plainError(err.category)}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0"
                        style={{
                          color: CHART_COLORS[i % CHART_COLORS.length],
                          background: '#f8fafc',
                          borderColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      >
                        {err.percentage.toFixed(1)}% ({err.count} time{err.count === 1 ? '' : 's'})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, err.percentage)}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
