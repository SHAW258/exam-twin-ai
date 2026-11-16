import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, Sparkles, Play } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { MeasurementResponse, ErrorDNASummary, InterventionRecommendation } from '../../types/api'

export const LearningAnalyticsPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [intervention, setIntervention] = useState<InterventionRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([api.measurements.list(), api.learning.getState(), api.learning.getInterventions()])
      .then(([mRes, sRes, iRes]) => {
        if (mRes.status === 'fulfilled') setMeasurements(mRes.value)
        if (sRes.status === 'fulfilled') setLearnerState(sRes.value)
        if (iRes.status === 'fulfilled') setIntervention(iRes.value)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const validGains = measurements.filter((m) => m.normalized_gain !== null).map((m) => m.normalized_gain as number)
  const avgGain = validGains.length ? (validGains.reduce((a, b) => a + b, 0) / validGains.length) : null
  const avgPre = measurements.length ? Math.round((measurements.reduce((sum, m) => sum + m.pre_normalized_score, 0) / measurements.length) * 100) : null
  const avgPost = measurements.length ? Math.round((measurements.reduce((sum, m) => sum + m.post_normalized_score, 0) / measurements.length) * 100) : null
  const netShift = avgPre !== null && avgPost !== null ? avgPost - avgPre : null

  const weakTopics = [...(learnerState?.topic_masteries || [])]
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 3)

  const tips: string[] = []
  if (weakTopics.length > 0) {
    tips.push(`Focus more on: ${weakTopics.map(t => t.topic).join(', ')}.`)
  }
  if (avgGain !== null) {
    tips.push(avgGain >= 0.3 ? 'Your recent progress is improving. Keep practicing regularly.' : 'Try shorter, focused practice sessions and review explanations for incorrect answers.')
  }
  if (learnerState?.revision_recommendations?.length) {
    tips.push(`Revise: ${learnerState.revision_recommendations.slice(0, 2).map(r => r.topic).join(', ')}.`)
  }
  if (tips.length === 0) {
    tips.push('Complete quizzes and practice sessions to receive personalized improvement tips based on your performance.')
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">CodeKnot / Analytics Overview</div>
        <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">Learning Analytics & Progress</h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl">
          See your overall performance trends and personalized improvement tips based on your actual assessment and practice data.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Improvement</span>
          <div className="text-3xl font-black text-[#14B8A6]">{avgGain !== null ? `${avgGain >= 0 ? '+' : ''}${avgGain.toFixed(2)}` : 'N/A'}</div>
          <p className="text-[11px] text-slate-500">Based on measured learning gains</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Before</span>
          <div className="text-3xl font-black text-slate-800">{avgPre !== null ? `${avgPre}%` : 'N/A'}</div>
          <p className="text-[11px] text-slate-500">Pre-test average</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average After</span>
          <div className="text-3xl font-black text-[#2563EB]">{avgPost !== null ? `${avgPost}%` : 'N/A'}</div>
          <p className="text-[11px] text-slate-500">Post-test average</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Change</span>
          <div className="text-3xl font-black text-slate-900">{netShift !== null ? `${netShift >= 0 ? '+' : ''}${netShift}%` : 'N/A'}</div>
          <p className="text-[11px] text-slate-500">Score change over time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#14213D]">Personalized Improvement Tips</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {tips.map((tip, i) => (
              <li key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">{tip}</li>
            ))}
          </ul>
          {weakTopics.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-600 mb-2">Topics needing more attention:</p>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map(t => (
                  <span key={t.topic} className="px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-200">
                    {t.topic} ({Math.round(t.mastery_score * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#14213D]">Adaptive Learning Recommendation</h2>
          </div>
          {intervention && !intervention.is_cold_start && intervention.selected_topic ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wide">Recommended next focus</p>
                <p className="text-sm font-bold text-slate-900">{intervention.selected_topic}</p>
                <p className="text-xs text-slate-600">Strategy: {String(intervention.selected_strategy || '').replace(/_/g, ' ')}</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{intervention.student_explanation}</p>
              {intervention.strategy_rationale && <p className="text-xs text-slate-500">{intervention.strategy_rationale}</p>}
              <div className="flex gap-2 pt-1">
                <Link to="/practice"><Button size="sm" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Play className="w-4 h-4 fill-white" />}>Practice This Topic</Button></Link>
                <Link to="/tutor"><Button size="sm" variant="outline">Ask AI Tutor</Button></Link>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600 space-y-2">
              <p>No personalized recommendation yet. Complete some practice or assessments so CodeKnot can suggest what to study next.</p>
              <Link to="/practice"><Button size="sm" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]">Start Practice</Button></Link>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-base font-bold text-[#14213D]">Performance Trend Records</h2>
        </div>
        {measurements.length === 0 ? (
          <p className="text-sm text-slate-500">No learning measurement records yet. Complete pre- and post-assessments to track improvement over time.</p>
        ) : (
          <div className="space-y-3">
            {measurements.slice(0, 8).map((m) => {
              const prePct = Math.round(m.pre_normalized_score * 100)
              const postPct = Math.round(m.post_normalized_score * 100)
              return (
                <div key={m.measurement_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{m.topic}</span>
                    <span className="text-[#14B8A6]">{postPct - prePct >= 0 ? `+${postPct - prePct}%` : `${postPct - prePct}%`}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Before: {prePct}%</div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-slate-400 h-full" style={{ width: `${prePct}%` }} /></div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">After: {postPct}%</div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-[#2563EB] h-full" style={{ width: `${postPct}%` }} /></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}