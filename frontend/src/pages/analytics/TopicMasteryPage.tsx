import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Play, BookOpen } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { ErrorDNASummary, TopicMastery } from '../../types/api'

export const TopicMasteryPage: React.FC = () => {
  const navigate = useNavigate()
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.learning.getState()
      .then(setLearnerState)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const masteries: TopicMastery[] = learnerState?.topic_masteries || []

  const recommendationFor = (tm: TopicMastery) => {
    const pct = Math.round(tm.mastery_score * 100)
    if (tm.attempts_count === 0) return 'Start with a short practice set to build understanding.'
    if (pct < 50) return 'Review the topic in your PDF materials, then retry practice questions with explanations.'
    if (pct < 80) return 'Do a focused practice drill and review incorrect answers to improve accuracy.'
    return 'Great progress. Try a mixed or timed drill to maintain mastery.'
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading topic mastery...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">CodeKnot / Topic Mastery</div>
        <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">Topic Mastery</h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl">
          Track mastery for each topic based on your actual quiz and assessment results, and start topic-specific practice.
        </p>
      </div>

      {masteries.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No topic mastery data yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Complete practice or assessments to see your mastery percentage, correct/incorrect answers, and topic-specific recommendations.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>Start Practice</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {masteries.map((tm) => {
            const pct = Math.round((tm.mastery_score || 0) * 100)
            const status = pct >= 80 ? 'Strong' : pct >= 50 ? 'Developing' : 'Needs attention'
            const barColor = pct >= 80 ? 'bg-[#14B8A6]' : pct >= 50 ? 'bg-[#2563EB]' : 'bg-[#F59E0B]'
            return (
              <Card key={tm.topic} className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{tm.topic}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${pct >= 80 ? 'bg-teal-50 text-teal-800 border-teal-200' : pct >= 50 ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{status}</span>
                    </div>
                    <p className="text-xs text-slate-600">{recommendationFor(tm)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#14213D]">{pct}%</span>
                    <p className="text-[10px] text-slate-400">Mastery</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-between text-[11px] text-slate-500 pt-1">
                    <span>{tm.attempts_count || 0} questions attempted</span>
                    <span>{tm.correct_attempts || 0} correct</span>
                    <span>{tm.incorrect_attempts || 0} incorrect</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Play className="w-4 h-4 fill-white" />} onClick={() => navigate('/quiz', { state: { topic: tm.topic, questionCount: 5, drillMode: 'error' } })}>
                    Practice This Topic
                  </Button>
                  <Link to="/tutor"><Button size="sm" variant="outline" leftIcon={<BookOpen className="w-4 h-4" />}>Ask Tutor</Button></Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}