import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, TrendingUp, Dna, ArrowRight, RotateCcw, BookOpen, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export const AssessmentResultsPage: React.FC = () => {
  const location = useLocation()
  const state = location.state as {
    topic?: string
    score?: number
    total?: number
    correct?: number
    diagnosedTrap?: string
    studentAnswer?: string
  } | undefined

  const topic = state?.topic
  const score = state?.score !== undefined ? Math.round(state.score) : null
  const diagnosedTrap = state?.diagnosedTrap

  if (!state || score === null) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center">
        <Card className="p-8 bg-white border border-slate-200 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-slate-900">No Recent Assessment Result Found</h2>
          <p className="text-xs text-slate-500">
            You can take a new practice drill or review your logged assessment history.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/practice">
              <Button variant="primary">Start Practice Drill</Button>
            </Link>
            <Link to="/assessments">
              <Button variant="outline">View Assessment History</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">ExamTwin / Student Suite / Assessments / Results</div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Assessment Performance Summary
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Cognitive evaluation recorded to your persistent learner state in MySQL.
        </p>
      </div>

      <Card className="p-8 bg-white border border-slate-200 shadow-md rounded-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
            Drill Complete • Logged to Database
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">{score}% Score</h2>
          <p className="text-sm font-semibold text-slate-700">{topic}</p>
        </div>

        {diagnosedTrap && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-left space-y-1 max-w-lg mx-auto">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <Dna className="w-4 h-4 text-rose-600" />
              <span>Cognitive Trap Diagnosed by ML Classifier:</span>
            </div>
            <p className="text-rose-700">{diagnosedTrap}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
          <Link to="/assessments">
            <Button
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2.5 px-5 font-semibold shadow-md shadow-indigo-200"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View Assessment History
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
