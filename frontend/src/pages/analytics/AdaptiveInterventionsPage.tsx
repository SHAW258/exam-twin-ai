import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Play, Dna, BookOpen, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
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

  const current = intervention || {
    selected_topic: 'Cardiovascular Hemodynamics & Poiseuille’s Law',
    priority_score: 9.4,
    selected_strategy: 'SOCRATIC_ERROR_EXPLORATION',
    strategy_rationale: 'High recurrence of inverse-radius misconceptions in fluid dynamics.',
    student_explanation: 'In your recent assessments, you missed 4 questions involving fluid resistance and vessel radius calculations (R ~ 1/r^4). Mastering this single concept will prevent an estimated -3 percentile points drop.',
    grounded_content: 'Guyton and Hall Textbook of Medical Physiology (14th Ed) • Chapter 28: Renal Circulation, Page 342.',
    is_uncertain: false,
    review_required: false,
    is_cold_start: false,
    student_id: 'std_01',
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Adaptive Engine / Pedagogical Interventions
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Adaptive Learning Recommendations & Intervention Details
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

      {/* Main Intervention Card matching Figma */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" /> Rank #1 Priority Intervention
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Strategy: {current.selected_strategy.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xl font-black text-indigo-600">{current.priority_score.toFixed(1)} / 10</span>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Priority Score</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">{current.selected_topic}</h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
            {current.student_explanation}
          </p>
        </div>

        {/* Multi-Factor Prioritization Metrics Breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Error Recurrence</span>
            <span className="text-base font-extrabold text-rose-600">High (64%)</span>
            <p className="text-[10px] text-slate-500">Repeated across 3 quizzes</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Exam Weighting</span>
            <span className="text-base font-extrabold text-slate-900">High-Yield</span>
            <p className="text-[10px] text-slate-500">Core MCAT Section 2 concept</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Projected Velocity</span>
            <span className="text-base font-extrabold text-emerald-600">+4.2 Percentile</span>
            <p className="text-[10px] text-slate-500">Score upside after mastery</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Pedagogical Mode</span>
            <span className="text-base font-extrabold text-indigo-600">Socratic</span>
            <p className="text-[10px] text-slate-500">Heuristic scaffolding</p>
          </div>
        </div>

        {/* Grounded Citation */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Recommended Grounding Source: </strong>{current.grounded_content}</span>
          </div>
          <Link to="/materials" className="font-bold text-indigo-700 hover:underline shrink-0">
            Open PDF &rarr;
          </Link>
        </div>

        {/* Launch Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link to="/tutor">
            <Button variant="outline" size="sm" className="text-xs">
              Open Socratic Tutor on this Topic
            </Button>
          </Link>

          <Link to="/quiz">
            <Button
              variant="primary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 font-semibold text-xs"
              rightIcon={<Play className="w-3.5 h-3.5 fill-white" />}
            >
              Start Targeted Intervention Drill
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
