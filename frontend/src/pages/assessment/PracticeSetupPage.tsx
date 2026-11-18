import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle, Printer, TimerReset, Play, Upload, BookOpen } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { DocumentListItem } from '../../types/api'
import { cleanDocName } from '../../utils/document'

export const PracticeSetupPage: React.FC = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [autoTopic, setAutoTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [activeMode, setActiveMode] = useState<'error' | 'dns_print' | 'adapted_retrieval' | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [recommendedTopic, setRecommendedTopic] = useState<string | null>(null)

  useEffect(() => {
    api.documents.list().then((docs) => {
      setDocuments(docs)
      if (docs.length > 0) {
        setSelectedDocId(docs[0].id)
      }
    }).catch(() => {})

    api.learning.getInterventions().then((rec) => {
      if (rec?.selected_topic && rec.selected_topic !== 'General Foundation') {
        setRecommendedTopic(rec.selected_topic)
      }
    }).catch(() => {})
  }, [])

  const selectedDoc = documents.find(d => d.id === selectedDocId)
  const isAutoSource = !selectedDocId

  const startDrill = (mode: 'error' | 'dns_print' | 'adapted_retrieval') => {
    const docCleanTitle = cleanDocName(selectedDoc?.title)
    const topic = autoTopic.trim() || docCleanTitle || (isAutoSource && mode === 'adapted_retrieval' && recommendedTopic ? recommendedTopic : 'Course Material')

    setActiveMode(mode)
    setStatusMessage(
      mode === 'dns_print'
        ? 'DNS Print mode selected: generating a printable practice set.'
        : mode === 'adapted_retrieval'
        ? `Adapted Retrieval Time Stimulation selected: timed practice focused on ${topic}.`
        : 'Error mode selected: practice will focus on correcting mistakes, diagnostic traps, and reinforcing understanding.'
    )

    navigate('/quiz', {
      state: {
        documentId: selectedDocId || undefined,
        documentIds: selectedDocId ? [selectedDocId] : (documents.length > 0 ? [documents[0].id] : undefined),
        topic,
        questionCount,
        drillMode: mode,
        printMode: mode === 'dns_print',
        timedMode: mode === 'adapted_retrieval',
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">CodeKnot / Practice Setup</div>
        <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">Practice & Diagnostic Drills</h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl">
          Generate 5–20 practice questions. Auto mode checks your PDFs first, then anonymous shared course data, then Gemini practice if no PDF matches.
        </p>
      </div>

      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">PDF Source</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">Auto — my PDFs first, then shared course data</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>{cleanDocName(doc.title)}</option>
            ))}
          </select>
          {documents.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Upload className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">No PDFs in your library yet.</p>
                <p>Auto mode still works with shared course data or Gemini practice. <Link to="/materials" className="underline font-bold">Upload a PDF</Link> for citations from your own notes.</p>
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Choosing a specific PDF limits the quiz to that file. Auto mode hides file names, pages, and uploaders when using shared course data.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Topic / Focus {isAutoSource ? '(recommended for Auto)' : '(optional)'}</label>
          <input
            type="text"
            value={autoTopic}
            onChange={(e) => setAutoTopic(e.target.value)}
            placeholder="e.g., Operating System Deadlocks, Database Normalization"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] placeholder:text-slate-400"
          />
          <p className="text-[11px] text-slate-500">A clear topic improves matching when you have not selected a specific PDF.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Number of Questions</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value={5}>5 Questions (Quick Practice)</option>
              <option value={7}>7 Questions</option>
              <option value={10}>10 Questions (Standard Quiz)</option>
              <option value={15}>15 Questions (Extended Practice)</option>
              <option value={20}>20 Questions (Comprehensive Exam)</option>
            </select>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-[#2563EB] mt-0.5" />
            <span>Practice includes instant feedback, explanations, retry options, and score tracking based on your answers.</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Drill Modes</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => startDrill('error')}

              className={`p-4 rounded-xl border-2 text-left space-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeMode === 'error' ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
            >
              <AlertCircle className="w-5 h-5 text-rose-600 mb-1" />
              <span className="block text-sm font-bold text-slate-900">Error</span>
              <span className="block text-[11px] text-slate-500">Practice focused on correcting mistakes and improving weak understanding.</span>
            </button>

            <button
              type="button"
              onClick={() => startDrill('dns_print')}

              className={`p-4 rounded-xl border-2 text-left space-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeMode === 'dns_print' ? 'border-[#2563EB] bg-blue-50/40' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
            >
              <Printer className="w-5 h-5 text-[#2563EB] mb-1" />
              <span className="block text-sm font-bold text-slate-900">DNS Print</span>
              <span className="block text-[11px] text-slate-500">Generate a practice set you can review and print (Download & Study Print).</span>
            </button>

            <button
              type="button"
              onClick={() => startDrill('adapted_retrieval')}

              className={`p-4 rounded-xl border-2 text-left space-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeMode === 'adapted_retrieval' ? 'border-[#14B8A6] bg-teal-50/40' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
            >
              <TimerReset className="w-5 h-5 text-[#14B8A6] mb-1" />
              <span className="block text-sm font-bold text-slate-900">Adapted Retrieval Time Stimulation</span>
              <span className="block text-[11px] text-slate-500">Timed retrieval practice to strengthen recall under time pressure.</span>
              {recommendedTopic && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
                  Target: {recommendedTopic}
                </span>
              )}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1e3a8a]">{statusMessage}</div>
        )}

        <div className="pt-2 flex flex-wrap gap-3">
          <Button onClick={() => startDrill('adapted_retrieval')} variant="primary" size="md" leftIcon={<Play className="w-4 h-4 fill-white" />} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            Generate Practice
          </Button>
          <Link to="/materials">
            <Button variant="outline" size="md">Manage Study Materials</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
