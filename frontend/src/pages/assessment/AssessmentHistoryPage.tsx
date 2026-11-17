import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { History, CheckCircle2, Play, GitCompare } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { GainBadge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { AssessmentResponse, MeasurementResponse } from '../../types/api'

export const AssessmentHistoryPage: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([])
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([api.assessments.list(), api.measurements.list()])
      .then(([aRes, mRes]) => {
        if (aRes.status === 'fulfilled') setAssessments(aRes.value)
        if (mRes.status === 'fulfilled') setMeasurements(mRes.value)
        if (aRes.status === 'rejected' || mRes.status === 'rejected') {
          setError('Some assessment records could not be loaded. Refresh the page to try again.')
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading assessment history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">CodeKnot / Assessment History</div>
          <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">
            Assessment History & Performance Records
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-3xl">
            Review your previous assessments, scores, accuracy, topic-wise strengths and weaknesses, and compare performance before and after practice.
          </p>
        </div>

        <Link to="/practice">
          <Button variant="primary" size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] text-xs">
            Start New Practice
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {error}
        </div>
      )}

      {assessments.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No assessments completed yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Start a practice session or quiz to record your scores, accuracy, and progress over time.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Practice
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-0 bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
            <span className="font-bold text-slate-700">All Assessments ({assessments.length})</span>
          </div>
          <div className="divide-y divide-slate-100">
            {assessments.map((a) => {
              const scorePct = Math.round((a.normalized_score || 0) * 100)
              const isPassing = scorePct >= 70
              return (
                <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{a.topic}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.assessment_type === 'PRE_INTERVENTION'
                          ? 'bg-slate-100 text-slate-700'
                          : a.assessment_type === 'POST_INTERVENTION'
                          ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                          : 'bg-teal-50 text-[#0f766e] border border-teal-200'
                      }`}>
                        {String(a.assessment_type || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                    {a.timestamp && (
                      <p className="text-[10px] text-slate-400">{new Date(a.timestamp).toLocaleString()}</p>
                    )}
                    {a.evidence && <p className="text-xs text-slate-500 line-clamp-1">{a.evidence}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-lg font-black ${isPassing ? 'text-[#14B8A6]' : 'text-[#F59E0B]'}`}>
                        {scorePct}%
                      </span>
                      <p className="text-[10px] text-slate-400">{a.obtained_score} / {a.max_score}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Pre/Post Performance Comparison (integrated, no separate page) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-lg font-bold text-[#14213D]">Pre and Post Performance Comparison</h2>
        </div>
        <p className="text-xs text-slate-600">Compare your performance before and after learning or practice on the same topics.</p>

        {measurements.length === 0 ? (
          <Card className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-slate-900">No pre/post comparisons recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              Complete a pre-test and a post-test on the same topic to see how your performance changes over time.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {measurements.map((p) => {
              const prePct = Math.round((p.pre_normalized_score || 0) * 100)
              const postPct = Math.round((p.post_normalized_score || 0) * 100)
              const gainPct = p.absolute_gain !== null ? Math.round(p.absolute_gain * 100) : postPct - prePct
              return (
                <Card key={p.measurement_id} className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-slate-900">{p.topic}</h3>
                      {p.measured_at && <p className="text-[11px] text-slate-400">Measured: {new Date(p.measured_at).toLocaleDateString()}</p>}
                    </div>
                    <GainBadge gain={p.normalized_gain} classification={p.gain_classification} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Before</span>
                      <span className="text-base font-extrabold text-slate-800">{prePct}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">After</span>
                      <span className="text-base font-extrabold text-[#2563EB]">{postPct}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Change</span>
                      <span className="text-base font-extrabold text-[#14B8A6]">{gainPct >= 0 ? `+${gainPct}` : gainPct}%</span>
                    </div>
                  </div>
                  {p.summary_explanation && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">{p.summary_explanation}</p>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
