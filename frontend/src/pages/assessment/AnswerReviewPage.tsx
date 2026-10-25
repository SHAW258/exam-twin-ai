import React from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  History,
  Play,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export const AnswerReviewPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Assessment Audit / Answer Review
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Cognitive Post-Mortem & Grounded Citations
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Algorithmic breakdown of student choices, distractor traps, and authoritative textbook proofs.
          </p>
        </div>

        <Link to="/assessments">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Assessment History
          </Button>
        </Link>
      </div>

      <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
          <History className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Select an Assessment to Review</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Answer reviews and citations are generated directly from your completed assessment attempts. View your assessment history to inspect past evaluations.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/assessments">
            <Button variant="primary">View Assessment History</Button>
          </Link>
          <Link to="/practice">
            <Button variant="outline" leftIcon={<Play className="w-4 h-4" />}>
              Start Practice Session
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
