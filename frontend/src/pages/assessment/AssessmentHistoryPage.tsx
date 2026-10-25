import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { History, CheckCircle2, ArrowRight, ShieldCheck, Filter, Calendar, FileText, Play } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { AssessmentResponse } from '../../types/api'

export const AssessmentHistoryPage: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAssessments = async () => {
    setIsLoading(true)
    try {
      const data = await api.assessments.list()
      setAssessments(data)
    } catch (err) {
      console.warn('Failed to load assessments:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAssessments()
  }, [])

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading assessment history...</p>
      </div>
    )
  }

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

      {assessments.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Assessments Completed Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              You haven't recorded any assessment attempts yet. Start a targeted diagnostic drill or quiz to evaluate your understanding and log verified assessment records.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/practice">
              <Button variant="primary" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Configure Your First Drill
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-0 bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
            <span className="font-bold text-slate-700">All Logged Assessments ({assessments.length})</span>
          </div>

          <div className="divide-y divide-slate-100">
            {assessments.map((a) => {
              const scorePct = Math.round(a.normalized_score * 100)
              const isPassing = scorePct >= 70

              return (
                <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{a.topic}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.assessment_type === 'PRE_INTERVENTION'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {a.assessment_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {a.evidence && (
                      <p className="text-xs text-slate-500 line-clamp-1">{a.evidence}</p>
                    )}
                    {a.timestamp && (
                      <p className="text-[10px] text-slate-400">
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-lg font-black ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {scorePct}%
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {a.obtained_score} / {a.max_score}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
