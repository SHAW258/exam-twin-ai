import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { History, CheckCircle2, ArrowRight, ShieldCheck, Filter, Calendar, FileText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { AssessmentResponse } from '../../types/api'

export const AssessmentHistoryPage: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Demo Fallback matching Figma history table
  const demoAssessments = [
    {
      id: 'asmt-001',
      student_id: 'std_01',
      topic: 'Cardiovascular Hemodynamics & Poiseuille’s Law',
      learning_objective_id: 'LO-RENAL-409',
      assessment_type: 'POST_INTERVENTION' as const,
      obtained_score: 85.0,
      max_score: 100.0,
      normalized_score: 0.85,
      verification_status: 'VERIFIED' as const,
      evidence: 'Targeted 10-Question drill with direct vector grounding.',
      timestamp: 'Today, 14:32',
    },
    {
      id: 'asmt-002',
      student_id: 'std_01',
      topic: 'Cardiovascular Hemodynamics & Poiseuille’s Law',
      learning_objective_id: 'LO-RENAL-409',
      assessment_type: 'PRE_INTERVENTION' as const,
      obtained_score: 45.0,
      max_score: 100.0,
      normalized_score: 0.45,
      verification_status: 'VERIFIED' as const,
      evidence: 'Initial diagnostic baseline pre-intervention.',
      timestamp: 'Today, 10:15',
    },
    {
      id: 'asmt-003',
      student_id: 'std_01',
      topic: 'Renal Acid-Base Clearance & Countercurrent',
      learning_objective_id: 'LO-RENAL-202',
      assessment_type: 'POST_INTERVENTION' as const,
      obtained_score: 90.0,
      max_score: 100.0,
      normalized_score: 0.90,
      verification_status: 'VERIFIED' as const,
      evidence: 'Post-intervention evaluation after textbook revision.',
      timestamp: 'Yesterday, 16:40',
    },
    {
      id: 'asmt-004',
      student_id: 'std_01',
      topic: 'Enzyme Kinetics & Michaelis-Menten Steady State',
      learning_objective_id: 'LO-BIO-101',
      assessment_type: 'FORMATIVE' as const,
      obtained_score: 80.0,
      max_score: 100.0,
      normalized_score: 0.80,
      verification_status: 'VERIFIED' as const,
      evidence: 'Formative diagnostic evaluation.',
      timestamp: 'Oct 23, 2026',
    },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Assessment History & Telemetry Audit
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Assessment History & Audit Records
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Immutable log of all pre-intervention baselines, post-intervention retests, and adaptive retrieval sessions.
          </p>
        </div>

        <Link to="/practice">
          <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs">
            + Start New Practice Drill
          </Button>
        </Link>
      </div>

      <Card className="p-0 bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
          <span className="font-bold text-slate-700">All Logged Assessments ({demoAssessments.length})</span>
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by Type</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Curricular Topic</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoAssessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                    {a.timestamp}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                    {a.topic}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        a.assessment_type === 'POST_INTERVENTION'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : a.assessment_type === 'PRE_INTERVENTION'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {a.assessment_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    {a.obtained_score.toFixed(0)}%
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Verified
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to="/assessments/review"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Review Post-Mortem &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
