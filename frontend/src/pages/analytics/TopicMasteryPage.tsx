import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, TrendingUp, ArrowLeft, Play } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { ErrorDNASummary, TopicMastery } from '../../types/api'

export const TopicMasteryPage: React.FC = () => {
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.learning.getState()
      .then(setLearnerState)
      .catch((err) => console.warn('Failed to fetch mastery:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const masteries: TopicMastery[] = learnerState?.topic_masteries || []

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading topic masteries...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Analytics / Topic Mastery Breakdown
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Curricular Topic Mastery Details
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Weighted psychometric proficiency scores across all tested syllabus learning objectives.
          </p>
        </div>

        <Link to="/analytics">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Analytics Overview
          </Button>
        </Link>
      </div>

      {masteries.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Topic Masteries Recorded Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Complete practice drills, quizzes, or assessments. As questions are evaluated, ExamTwin calculates your topic proficiency and updates your mastery matrix.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Practice Session
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {masteries.map((tm) => {
            const pct = Math.round(tm.mastery_score * 100)
            const isHigh = pct >= 80
            const isLow = pct < 50

            return (
              <Card key={tm.topic} className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isHigh
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isLow
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}>
                      {isHigh ? 'Mastered' : isLow ? 'Needs Attention' : 'Proficient'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{tm.topic}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{pct}%</span>
                    <p className="text-[10px] text-slate-400">Mastery Calibration Score</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? 'bg-emerald-500' : isLow ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                    <span>{tm.correct_attempts} correct attempts</span>
                    <span>{tm.incorrect_attempts} incorrect attempts</span>
                    <span>{tm.attempts_count} total evaluations</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
