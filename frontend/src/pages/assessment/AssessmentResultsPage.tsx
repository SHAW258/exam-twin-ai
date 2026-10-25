import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, TrendingUp, Dna, ArrowRight, RotateCcw, BookOpen, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { GainBadge } from '../../components/ui/Badge'

export const AssessmentResultsPage: React.FC = () => {
  const location = useLocation()
  const state = location.state as {
    topic?: string
    score?: number
    total?: number
    correct?: number
  } | undefined

  const topic = state?.topic || 'Cardiovascular Hemodynamics & Poiseuille’s Law'
  const score = state?.score !== undefined ? Math.round(state.score) : 85
  const correct = state?.correct !== undefined ? state.correct : 8
  const total = state?.total !== undefined ? state.total : 10

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">ExamTwin / Student Suite / Assessments / Results</div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Assessment Performance Summary
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Cognitive evaluation scored against verified curriculum benchmarks.
        </p>
      </div>

      <Card className="p-8 bg-white border border-slate-200 shadow-md rounded-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
            Drill Complete • Verified Grading
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">{score}% Score</h2>
          <p className="text-sm font-semibold text-slate-700">{topic}</p>
          <p className="text-xs text-slate-500">
            You answered {correct} out of {total} questions correctly.
          </p>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Normalized Gain</span>
            <span className="text-base font-extrabold text-emerald-600">+48.2%</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Error Remediated</span>
            <span className="text-base font-extrabold text-indigo-600">-32% Gap</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cosine Grounding</span>
            <span className="text-base font-extrabold text-slate-800">0.961</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
          <Link to="/assessments/review">
            <Button
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2.5 px-5 font-semibold shadow-md shadow-indigo-200"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review Answers & Citations
            </Button>
          </Link>
          <Link to="/practice">
            <Button variant="outline" className="text-xs py-2.5 px-5 font-semibold" leftIcon={<RotateCcw className="w-4 h-4" />}>
              Take Another Drill
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" className="text-xs py-2.5 px-4 font-semibold">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
