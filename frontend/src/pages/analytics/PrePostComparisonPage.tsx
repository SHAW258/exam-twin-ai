import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GitCompare, CheckCircle2, TrendingUp, ShieldCheck, ArrowLeft, Play } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { GainBadge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { MeasurementResponse } from '../../types/api'

export const PrePostComparisonPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.measurements.list()
      .then(setMeasurements)
      .catch((err) => console.warn('Failed to load measurements:', err))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading pre/post comparison audits...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Psychometrics / Pre-Post Comparison
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pre-Test and Post-Test Gain Comparison
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Empirical verification audit showing verified student knowledge shift post-pedagogical intervention.
          </p>
        </div>

        <Link to="/analytics">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Analytics Overview
          </Button>
        </Link>
      </div>

      {measurements.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
            <GitCompare className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Pre/Post Comparisons Recorded Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              To measure empirical learning gain, submit a baseline pre-test before studying, review the recommended intervention, and submit a post-intervention test on the same topic.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Baseline Assessment
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {measurements.map((p) => {
            const prePct = Math.round(p.pre_normalized_score * 100)
            const postPct = Math.round(p.post_normalized_score * 100)
            const gainPct = p.absolute_gain !== null ? Math.round(p.absolute_gain * 100) : postPct - prePct

            return (
              <Card key={p.measurement_id} className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    {p.learning_objective_id && (
                      <span className="text-xs font-bold text-slate-500">{p.learning_objective_id}</span>
                    )}
                    <h3 className="text-base font-bold text-slate-900">{p.topic}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <GainBadge gain={p.normalized_gain} classification={p.gain_classification} />
                    {p.measured_at && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(p.measured_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pre-Test Baseline</span>
                    <span className="text-base font-extrabold text-slate-800">{prePct}%</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Post-Test Mastery</span>
                    <span className="text-base font-extrabold text-indigo-600">{postPct}%</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Absolute Gain</span>
                    <span className="text-base font-extrabold text-emerald-600">
                      {gainPct >= 0 ? `+${gainPct}` : gainPct}%
                    </span>
                  </div>
                </div>

                {p.summary_explanation && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    {p.summary_explanation}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
