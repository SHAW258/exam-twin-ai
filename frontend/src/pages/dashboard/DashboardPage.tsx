import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  BookOpen,
  Dna,
  TrendingUp,
  FileText,
  Bot,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Upload,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'
import type { ErrorDNASummary, InterventionRecommendation, DocumentListItem, MeasurementResponse } from '../../types/api'

export const DashboardPage: React.FC = () => {
  const { student } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [intervention, setIntervention] = useState<InterventionRecommendation | null>(null)
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])

  const studentName = student?.full_name || student?.external_student_id || 'Student'

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [stateRes, interRes, docsRes, measRes] = await Promise.allSettled([
        api.learning.getState(),
        api.learning.getInterventions(),
        api.documents.list(),
        api.measurements.list(),
      ])

      if (stateRes.status === 'fulfilled') setLearnerState(stateRes.value)
      if (interRes.status === 'fulfilled') setIntervention(interRes.value)
      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value)
      if (measRes.status === 'fulfilled') setMeasurements(measRes.value)
    } catch (err) {
      console.warn('Dashboard fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const displayDocsCount = documents.length
  const displayTestsCount = learnerState?.total_diagnoses || measurements.length || 0
  const displayAttentionCount = learnerState?.recurring_errors?.length || 0

  const hasIntervention = intervention && !intervention.is_cold_start && Boolean(intervention.selected_topic)
  const topicMasteries = learnerState?.topic_masteries || []

  // Calculate real average learning gain if measurements exist
  const validGains = measurements.filter((m) => m.normalized_gain !== null).map((m) => m.normalized_gain as number)
  const avgGain = validGains.length ? (validGains.reduce((a, b) => a + b, 0) / validGains.length) : null
  const avgPre = measurements.length
    ? Math.round((measurements.reduce((sum, m) => sum + m.pre_normalized_score, 0) / measurements.length) * 100)
    : null
  const avgPost = measurements.length
    ? Math.round((measurements.reduce((sum, m) => sum + m.post_normalized_score, 0) / measurements.length) * 100)
    : null

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading active student telemetry...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Profile Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">
            Active Profile: {studentName} • Diagnostic Engine Connected
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>{displayDocsCount} Course Material{displayDocsCount === 1 ? '' : 's'} Indexed</span>
          <button
            onClick={loadDashboardData}
            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <RotateCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Welcome Banner Card */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {studentName}!
            </h1>
            {displayDocsCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {displayDocsCount} Grounded PDF{displayDocsCount === 1 ? '' : 's'} Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                No Study Materials Uploaded Yet
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {displayDocsCount > 0
              ? 'Your uploaded course materials are indexed and ready for grounded AI tutoring, error diagnosis, and adaptive retrieval drills.'
              : 'To get started, upload your course syllabus, lecture slides, or textbook PDFs in Study Materials. ExamTwin will extract text, generate vector embeddings, and ground your AI Study Twin.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/materials">
              <Button size="sm" variant="primary" className="text-xs" leftIcon={<Upload className="w-3.5 h-3.5" />}>
                {displayDocsCount > 0 ? 'Manage Study Materials' : 'Upload First Material'}
              </Button>
            </Link>
            <Link to="/tutor">
              <Button size="sm" variant="outline" className="text-xs" leftIcon={<Bot className="w-3.5 h-3.5" />}>
                Ask AI Tutor
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Recommended Next Step / Intervention Hero Banner */}
      {hasIntervention && intervention ? (
        <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-2xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Recommended Next Step • Priority Intervention
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/60 px-2.5 py-0.5 rounded-md">
                Strategy: {intervention.selected_strategy.replace(/_/g, ' ')}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Priority Score: {intervention.priority_score.toFixed(1)} / 10
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {intervention.selected_topic}
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
              <strong className="text-indigo-950 font-semibold">Why this is recommended: </strong>
              {intervention.student_explanation}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/practice">
              <Button size="md" className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 font-semibold px-5" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                Start Remedial Drill
              </Button>
            </Link>
            <Link to="/tutor">
              <Button size="md" variant="outline" className="border-slate-300 text-slate-700 font-medium">
                Ask AI Tutor About This Topic
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <Card className="p-6 md:p-8 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Diagnostic Engine Status
            </span>
            <span className="text-xs text-slate-500 font-medium">Ready for Initial Activity</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {displayDocsCount === 0
              ? 'Step 1: Upload Your Course Materials'
              : 'Step 2: Start a Diagnostic Practice Session or Ask the AI Tutor'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            {displayDocsCount === 0
              ? 'ExamTwin requires your course notes or syllabus documents to ground responses and diagnose conceptual misconceptions without hallucinations.'
              : 'As you complete practice questions or ask questions in the tutor, the machine learning error classifier tracks your recurring misconceptions and generates personalized interventions.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {displayDocsCount === 0 ? (
              <Link to="/materials">
                <Button size="sm" variant="primary" leftIcon={<Upload className="w-3.5 h-3.5" />}>
                  Upload Study Materials
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/practice">
                  <Button size="sm" variant="primary" leftIcon={<Play className="w-3.5 h-3.5" />}>
                    Configure Practice Drill
                  </Button>
                </Link>
                <Link to="/tutor">
                  <Button size="sm" variant="outline" leftIcon={<Bot className="w-3.5 h-3.5" />}>
                    Open AI Tutor
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Quick Action Tiles (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card hoverEffect className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Ask AI Tutor</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ask conceptual questions strictly grounded in your uploaded lecture notes and textbook excerpts.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link to="/tutor" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
              Open Tutor Prompt <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        <Card hoverEffect className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Upload Study Material</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ingest new syllabus PDFs or lecture slides for automated text extraction, sanitization, and vector chunking.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link to="/materials" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              Upload PDF Materials <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        <Card hoverEffect className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
              <Dna className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Error DNA Profiler</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect recurring cognitive slip patterns, temporal trends, and mastery scores across tracked subjects.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link to="/error-dna" className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1">
              View Error DNA Report <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Study Materials Indexed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{displayDocsCount} Docs</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {displayDocsCount > 0 ? `${documents.reduce((acc, d) => acc + (d.chunks_count || 0), 0)} vector chunks` : 'No materials indexed'}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Assessments Completed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{displayTestsCount} Tests</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {displayTestsCount > 0 ? 'Verified test records' : 'No tests recorded'}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Topics Needing Attention</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{displayAttentionCount} Topics</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {displayAttentionCount > 0 ? 'Recurring error traps detected' : 'No active error traps'}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Active Study Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {displayTestsCount > 0 ? '1 Day' : '0 Days'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {displayTestsCount > 0 ? 'Active session recorded' : 'Start learning today'}
          </p>
        </div>
      </div>

      {/* Two-Column Grid: Topic Mastery Matrix & Score Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Topic Mastery Matrix (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-900">Topic Mastery Matrix</h3>
              <p className="text-xs text-slate-500">Mastery scores calculated from weighted assessment history</p>
            </div>
            {topicMasteries.length > 0 && (
              <Link to="/analytics/mastery" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All Topics
              </Link>
            )}
          </div>

          {topicMasteries.length > 0 ? (
            <div className="space-y-3.5 pt-2">
              {topicMasteries.map((tm) => {
                const pct = Math.round(tm.mastery_score * 100)
                const colorClass = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
                return (
                  <div key={tm.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{tm.topic}</span>
                      <span className="font-bold text-slate-900">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{tm.correct_attempts} correct / {tm.attempts_count} total</span>
                      <span>{pct < 50 ? 'Intervention Recommended' : 'Mastery Confirmed'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-500">
                No topic masteries recorded yet. Complete assessments or practice drills to calibrate your mastery scores.
              </p>
              <Link to="/practice">
                <Button size="sm" variant="outline" className="text-xs">
                  Start Practice Drill
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Empirical Learning Gain Velocity (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Gain Velocity</h3>
              {avgGain !== null && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Hake's Gain: {avgGain >= 0 ? `+${avgGain.toFixed(2)}` : avgGain.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Normalized learning gain ($g$) across pre-test and post-test assessment pairs.
            </p>

            {measurements.length > 0 ? (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Average Pre-Test Score:</span>
                  <span className="font-bold text-slate-800">{avgPre}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Average Post-Test Score:</span>
                  <span className="font-bold text-emerald-600">{avgPost}%</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Absolute Score Shift:</span>
                  <span className="font-extrabold text-indigo-600">
                    {avgPost && avgPre ? `${avgPost >= avgPre ? '+' : ''}${avgPost - avgPre}% Velocity` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  No pre/post assessment pairs recorded yet. Complete an initial diagnostic and retest to track learning gains.
                </p>
              </div>
            )}
          </div>

          {measurements.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <Link to="/analytics/comparison">
                <Button variant="outline" className="w-full text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View Pre/Post Assessment Audit
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
