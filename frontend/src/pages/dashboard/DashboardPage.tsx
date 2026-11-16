import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, BookOpen, FileText, Bot, ArrowRight, Play, Upload, BarChart3 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      const [stateRes, intRes, docsRes, measRes] = await Promise.allSettled([
        api.learning.getState(),
        api.learning.getInterventions(),
        api.documents.list(),
        api.measurements.list(),
      ])
      if (stateRes.status === 'fulfilled') setLearnerState(stateRes.value)
      if (intRes.status === 'fulfilled') setIntervention(intRes.value)
      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value)
      if (measRes.status === 'fulfilled') setMeasurements(measRes.value)
      setIsLoading(false)
    }
    fetchDashboardData()
  }, [])

  const studentName = student?.full_name || student?.external_student_id || 'Student'
  const hasDocuments = documents.length > 0
  const hasActivity = (learnerState?.total_diagnoses || 0) > 0

  const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null
  const latestGain = lastMeasurement?.normalized_gain
  const gainText = latestGain != null ? `${latestGain >= 0 ? '+' : ''}${latestGain.toFixed(2)}` : 'N/A'

  if (isLoading) {
    return <div className="py-20 flex flex-col items-center justify-center space-y-4"><LoadingSpinner size="lg" /><p className="text-xs text-slate-500 font-medium">Loading your dashboard...</p></div>
  }

  return (
    <div className="space-y-6 font-sans">
      <section className="rounded-3xl bg-gradient-to-r from-blue-50/80 via-white to-teal-50/60 border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Welcome back, {studentName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#2563EB] border border-blue-200">Student Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213D] leading-tight">
              Learn from your materials, practice smarter, and track your progress
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Upload your PDFs, ask the AI Tutor questions, generate quizzes and practice drills, and see how your performance improves over time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to={hasDocuments ? '/practice' : '/materials'}>
              <Button size="md" className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-200 font-semibold text-xs sm:text-sm py-2.5 px-5"
                rightIcon={<Play className="w-4 h-4 fill-white" />}>
                {hasDocuments ? 'Start Practice' : 'Upload Study Material'}
              </Button>
            </Link>
            <Link to="/tutor">
              <Button size="md" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-medium py-2.5 px-5" leftIcon={<Bot className="w-4 h-4" />}>
                Ask AI Tutor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Study Materials</span>
          <div className="text-2xl font-black text-slate-900">{documents.length}</div>
          <p className="text-[11px] text-slate-500">Uploaded PDF{documents.length === 1 ? '' : 's'}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Learning Activity</span>
          <div className="text-2xl font-black text-slate-900">{learnerState?.total_diagnoses || 0}</div>
          <p className="text-[11px] text-slate-500">Recorded answers & evaluations</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Topics Tracked</span>
          <div className="text-2xl font-black text-slate-900">{learnerState?.topic_masteries?.length || 0}</div>
          <p className="text-[11px] text-slate-500">Topics with mastery data</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Latest Improvement</span>
          <div className="text-2xl font-black text-[#14B8A6]">{gainText}</div>
          <p className="text-[11px] text-slate-500">From recent pre/post comparison</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <Card className="p-6 border border-slate-200 bg-white shadow-xs rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#14213D] flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#2563EB]" /> What to do next</h2>
              <Link to="/analytics" className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1">View analytics <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            {!hasDocuments ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-2">
                <p className="font-semibold">Start by uploading your study material</p>
                <p className="text-xs text-amber-800">Upload a syllabus or PDF so CodeKnot can answer questions, generate quizzes, and create practice drills from it.</p>
                <Link to="/materials"><Button size="sm" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Upload className="w-4 h-4" />}>Upload PDF</Button></Link>
              </div>
            ) : intervention && !intervention.is_cold_start && intervention.selected_topic ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wide">Recommended focus</p>
                <p className="text-sm font-bold text-slate-900">{intervention.selected_topic}</p>
                <p className="text-xs text-slate-700 leading-relaxed">{intervention.student_explanation}</p>
                <div className="flex gap-2 pt-1">
                  <Link to="/practice"><Button size="sm" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Play className="w-4 h-4 fill-white" />}>Practice Now</Button></Link>
                  <Link to="/tutor"><Button size="sm" variant="outline">Ask Tutor</Button></Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 space-y-2">
                <p className="font-semibold">You're ready to begin</p>
                <p className="text-xs text-slate-600">Try a practice drill or ask the AI Tutor a question from your uploaded materials to start tracking progress.</p>
              </div>
            )}
          </Card>

          <Card className="p-6 border border-slate-200 bg-white shadow-xs rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-[#14213D] flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#2563EB]" /> Study materials</h2>
            {hasDocuments ? (
              <div className="space-y-2">
                {documents.slice(0, 4).map(doc => (
                  <div key={doc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 truncate max-w-[420px]">{doc.title}</p>
                      <p className="text-[11px] text-slate-500">{doc.pages_count} pages • {doc.chunks_count > 0 ? 'Ready for AI' : 'Processing/check needed'}</p>
                    </div>
                    <Link to="/materials" className="text-xs font-semibold text-[#2563EB] hover:underline">Open</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No PDFs uploaded yet.</p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <Card className="p-6 border border-slate-200 bg-white shadow-xs rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-[#14213D] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#2563EB]" /> Quick progress</h2>
            {hasActivity || measurements.length > 0 ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-slate-600">Assessments/practice records</span><span className="font-bold text-slate-900">{learnerState?.total_diagnoses || 0}</span></div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-slate-600">Weak areas to review</span><span className="font-bold text-slate-900">{learnerState?.recurring_errors?.length || 0}</span></div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-slate-600">Topics tracked</span><span className="font-bold text-slate-900">{learnerState?.topic_masteries?.length || 0}</span></div>
                <Link to="/analytics" className="inline-flex items-center gap-1 text-[#2563EB] font-semibold hover:underline">Go to Analytics <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
            ) : (
              <div className="text-xs text-slate-500 space-y-2">
                <p>Complete a quiz or practice session to see your progress here.</p>
                <Link to="/practice"><Button size="sm" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]">Start Practice</Button></Link>
              </div>
            )}
          </Card>

          <Card className="p-6 border border-slate-200 bg-white shadow-xs rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-[#14213D] flex items-center gap-2"><FileText className="w-4 h-4 text-[#2563EB]" /> How to get started</h2>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
              <li>Upload your PDF in <strong>Study Materials</strong>.</li>
              <li>Ask questions in <strong>AI Tutor</strong> or generate a quiz/practice.</li>
              <li>Review scores, explanations, and progress in <strong>Assessment History</strong> and <strong>Analytics</strong>.</li>
            </ol>
          </Card>
        </div>
      </section>
    </div>
  )
}