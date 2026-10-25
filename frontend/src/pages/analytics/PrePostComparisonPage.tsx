import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GitCompare, CheckCircle2, TrendingUp, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { GainBadge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { MeasurementResponse } from '../../types/api'

export const PrePostComparisonPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Demo Fallback matching Figma
  const demoPairs = [
    {
      measurement_id: 'meas-001',
      student_id: 'std_01',
      topic: 'Cardiovascular Hemodynamics & Poiseuille’s Law',
      learning_objective_id: 'LO-RENAL-409',
      pre_assessment_id: 'asmt-002',
      post_assessment_id: 'asmt-001',
      pre_normalized_score: 0.45,
      post_normalized_score: 0.88,
      normalized_gain: 0.78,
      absolute_gain: 0.43,
      gain_classification: 'POSITIVE' as const,
      is_verified: true,
      summary_explanation: 'Strong normalized gain following Socratic textbook revision of efferent arteriolar resistance.',
      measured_at: 'Today, 14:35',
    },
    {
      measurement_id: 'meas-002',
      student_id: 'std_01',
      topic: 'Renal Acid-Base Clearance & Countercurrent',
      learning_objective_id: 'LO-RENAL-202',
      pre_assessment_id: 'asmt-005',
      post_assessment_id: 'asmt-003',
      pre_normalized_score: 0.38,
      post_normalized_score: 0.90,
      normalized_gain: 0.84,
      absolute_gain: 0.52,
      gain_classification: 'POSITIVE' as const,
      is_verified: true,
      summary_explanation: 'Exceptional gain (+0.84 g) remediating causal direction inversions in loop of Henle.',
      measured_at: 'Yesterday, 17:00',
    },
    {
      measurement_id: 'meas-003',
      student_id: 'std_01',
      topic: 'Thermodynamics & Gibbs Free Energy Coupling',
      learning_objective_id: 'LO-CHEM-301',
      pre_assessment_id: 'asmt-008',
      post_assessment_id: 'asmt-009',
      pre_normalized_score: 1.0,
      post_normalized_score: 1.0,
      normalized_gain: null,
      absolute_gain: 0.0,
      gain_classification: 'PERFECT_PRETEST' as const,
      is_verified: true,
      summary_explanation: 'Mastered prior to intervention (Ceiling Effect: 100% Pre-Test score).',
      measured_at: 'Oct 22, 2026',
    },
  ]

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

      <div className="space-y-4">
        {demoPairs.map((p) => (
          <Card key={p.measurement_id} className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-500">{p.learning_objective_id}</span>
                <h3 className="text-base font-bold text-slate-900">{p.topic}</h3>
              </div>
              <div className="flex items-center gap-2">
                <GainBadge gain={p.normalized_gain} classification={p.gain_classification} />
                <span className="text-[11px] text-slate-400 font-medium">{p.measured_at}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Pre-Intervention Score</span>
                <span className="text-xl font-black text-slate-800">{(p.pre_normalized_score * 100).toFixed(0)}%</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Ref: {p.pre_assessment_id}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-semibold block uppercase">Post-Intervention Score</span>
                <span className="text-xl font-black text-emerald-800">{(p.post_normalized_score * 100).toFixed(0)}%</span>
                <p className="text-[10px] text-emerald-600 mt-0.5">Ref: {p.post_assessment_id}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[11px] text-indigo-700 font-semibold block uppercase">Hake's Normalized Gain</span>
                <span className="text-xl font-black text-indigo-900">
                  {p.normalized_gain !== null ? `+${(p.normalized_gain * 100).toFixed(1)}%` : 'Ceiling'}
                </span>
                <p className="text-[10px] text-indigo-600 mt-0.5">Absolute Shift: +{(p.absolute_gain * 100).toFixed(0)}%</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
              <strong>Audit Summary: </strong> {p.summary_explanation}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
