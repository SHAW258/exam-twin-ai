import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Play, Dna, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { InterventionRecommendation } from '../../types/api'

export const AdaptiveInterventionsPage: React.FC = () => {
  const [intervention, setIntervention] = useState<InterventionRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.learning.getInterventions()
      .then(setIntervention)
      .catch((err) => console.warn('Failed to load interventions:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const hasIntervention = intervention && !intervention.is_cold_start && Boolean(intervention.selected_topic)

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Computing adaptive recommendations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Adaptive Engine / Pedagogical Interventions
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Adaptive Learning Recommendations
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Algorithmic prioritization engine selecting optimal remedial strategies based on active Error DNA.
          </p>
        </div>

        <Link to="/analytics">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Analytics Overview
          </Button>
        </Link>
      </div>

      {!hasIntervention || !intervention ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Adaptive Interventions Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              As you take assessments and complete practice sessions, ExamTwin's multi-factor adaptive algorithm computes priority scores based on error recurrence, frequency, and recency to recommend targeted pedagogical interventions.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Initial Practice Drill
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" /> Recommended Intervention
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Strategy: {intervention.selected_strategy.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xl font-black text-indigo-600">{intervention.priority_score.toFixed(1)} / 10</span>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Priority Score</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">{intervention.selected_topic}</h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
              {intervention.student_explanation}
            </p>
          </div>

          {intervention.strategy_rationale && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700">Strategy Rationale:</span>
              <p className="text-slate-600">{intervention.strategy_rationale}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/practice">
              <Button size="md" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-5" rightIcon={<Play className="w-4 h-4" />}>
                Launch Targeted Drill
              </Button>
            </Link>
            <Link to="/tutor">
              <Button size="md" variant="outline" className="border-slate-300 text-slate-700 text-xs font-medium">
                Ask AI Tutor About This Topic
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
