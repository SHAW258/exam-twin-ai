import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  TrendingUp,
  GitCompare,
  ArrowRight,
  BookOpen,
  Dna,
  Play,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { GainBadge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { MeasurementResponse, ErrorDNASummary } from '../../types/api'

export const LearningAnalyticsPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([api.measurements.list(), api.learning.getState()])
      .then(([mRes, sRes]) => {
        if (mRes.status === 'fulfilled') setMeasurements(mRes.value)
        if (sRes.status === 'fulfilled') setLearnerState(sRes.value)
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Calculate real metrics from measurements
  const validGains = measurements.filter((m) => m.normalized_gain !== null).map((m) => m.normalized_gain as number)
  const avgGain = validGains.length ? (validGains.reduce((a, b) => a + b, 0) / validGains.length) : null
  const avgPre = measurements.length
    ? Math.round((measurements.reduce((sum, m) => sum + m.pre_normalized_score, 0) / measurements.length) * 100)
    : null
  const avgPost = measurements.length
    ? Math.round((measurements.reduce((sum, m) => sum + m.post_normalized_score, 0) / measurements.length) * 100)
    : null
  const netShift = avgPost !== null && avgPre !== null ? (avgPost - avgPre) : null

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Calculating psychometric learning gains...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Psychometric Analytics / Learning Gains
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Learning Analytics & Gain Engine
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Psychometric evaluation using Hake’s normalized learning gain formula: g = (Post - Pre) / (100 - Pre).
          </p>
        </div>

        {measurements.length > 0 && (
          <Link to="/analytics/comparison">
            <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs">
              Audit Pre/Post Retests &rarr;
            </Button>
          </Link>
        )}
      </div>

      {/* 4 Analytics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hake's Mean Gain (g)</span>
          <div className="text-3xl font-black text-emerald-600">
            {avgGain !== null ? (avgGain >= 0 ? `+${avgGain.toFixed(2)}` : avgGain.toFixed(2)) : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">
            {avgGain !== null ? (avgGain >= 0.7 ? 'High Gain' : avgGain >= 0.3 ? 'Medium Gain' : 'Low Gain') : 'No measurement pairs'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pre-Test Baseline</span>
          <div className="text-3xl font-black text-slate-800">
            {avgPre !== null ? `${avgPre}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">Initial diagnostic average</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Post-Test Mastery</span>
          <div className="text-3xl font-black text-indigo-600">
            {avgPost !== null ? `${avgPost}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">Post-intervention average</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Shift Velocity</span>
          <div className="text-3xl font-black text-slate-900">
            {netShift !== null ? `${netShift >= 0 ? '+' : ''}${netShift}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">Absolute knowledge delta</p>
        </div>
      </div>

      {measurements.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Learning Measurements Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Complete an initial pre-test assessment, review the recommended intervention, and take a post-test retest to calculate your normalized learning gain (Hake's $g$).
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
        <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recorded Learning Gain Pairs</h2>
              <p className="text-xs text-slate-500">
                Gains calculated across verified pre-test and post-test assessments.
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {measurements.length} Record{measurements.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-5">
            {measurements.map((m) => {
              const prePct = Math.round(m.pre_normalized_score * 100)
              const postPct = Math.round(m.post_normalized_score * 100)
              const shift = postPct - prePct

              return (
                <div key={m.measurement_id} className="space-y-2 p-4 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{m.topic}</span>
                    <GainBadge gain={m.normalized_gain} classification={m.gain_classification} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400">Pre-Test: {prePct}%</span>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: `${prePct}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-emerald-600 font-bold">
                        Post-Test: {postPct}% ({shift >= 0 ? `+${shift}` : shift}%)
                      </span>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${postPct}%` }} />
                      </div>
                    </div>
                  </div>
                  {m.summary_explanation && (
                    <p className="text-[11px] text-slate-500 pt-1 italic">{m.summary_explanation}</p>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
