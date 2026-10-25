import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, TrendingUp, AlertTriangle, ArrowRight, ArrowLeft, Play, Dna } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
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

  const masteries: TopicMastery[] = learnerState?.topic_masteries?.length
    ? learnerState.topic_masteries
    : [
        { topic: 'Cardiovascular Hemodynamics & Poiseuille’s Law', mastery_score: 0.58, attempts_count: 14, correct_attempts: 8, incorrect_attempts: 6 },
        { topic: 'Enzyme Kinetics & Michaelis-Menten Steady State', mastery_score: 0.84, attempts_count: 18, correct_attempts: 15, incorrect_attempts: 3 },
        { topic: 'Renal Acid-Base Clearance & Countercurrent', mastery_score: 0.42, attempts_count: 12, correct_attempts: 5, incorrect_attempts: 7 },
        { topic: 'Thermodynamics & Gibbs Free Energy Coupling', mastery_score: 0.91, attempts_count: 22, correct_attempts: 20, incorrect_attempts: 2 },
        { topic: 'Action Potential Kinetics & Axonal Propagation', mastery_score: 0.76, attempts_count: 16, correct_attempts: 12, incorrect_attempts: 4 },
      ]

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
                    {isHigh ? 'Mastered (Tier IV)' : isLow ? 'Immediate Remediation' : 'Developing Proficiency'}
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
                  <span>{tm.incorrect_attempts} trap errors logged</span>
                  <span>{tm.attempts_count} total evaluations</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">
                  {isLow ? 'Reasoning inversion trap active in Error DNA' : 'Cognitive proficiency confirmed'}
                </span>

                <Link to="/practice">
                  <Button size="sm" variant="outline" className="text-xs" rightIcon={<Play className="w-3 h-3" />}>
                    Targeted Drill
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
