import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Dna, BookOpen, Clock, Play, ShieldCheck, Upload } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { DocumentListItem } from '../../types/api'

export const PracticeSetupPage: React.FC = () => {
  const navigate = useNavigate()

  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [topic, setTopic] = useState('')
  const [drillMode, setDrillMode] = useState<'adaptive' | 'error_dna' | 'mock'>('adaptive')
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState('Adaptive')

  useEffect(() => {
    api.documents.list().then((docs) => {
      setDocuments(docs)
      if (docs.length > 0 && !topic) {
        setTopic(docs[0].title.replace(/\.pdf$/i, ''))
      }
    }).catch(() => {})
  }, [])

  const handleStart = () => {
    const selectedTopic = topic.trim() || (documents.length > 0 ? documents[0].title.replace(/\.pdf$/i, '') : 'General Study')
    navigate('/quiz', {
      state: {
        topic: selectedTopic,
        drillMode,
        questionCount,
      },
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">ExamTwin / Student Suite / Practice & Retrieval Drills / Setup</div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Practice & Diagnostic Drill Configuration
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Configure adaptive test sessions grounded directly in your uploaded syllabus materials.
        </p>
      </div>

      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
        {/* Mode Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Practice Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setDrillMode('error_dna')}
              className={`p-4 rounded-xl border cursor-pointer text-xs space-y-1.5 transition-all ${
                drillMode === 'error_dna'
                  ? 'border-2 border-rose-600 bg-rose-50/50 text-rose-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Dna className="w-4 h-4 text-rose-600" />
                Error DNA Sprint
              </div>
              <p className="text-[11px] text-slate-500">Targets active misconceptions and recurring reasoning traps.</p>
            </div>

            <div
              onClick={() => setDrillMode('adaptive')}
              className={`p-4 rounded-xl border cursor-pointer text-xs space-y-1.5 transition-all ${
                drillMode === 'adaptive'
                  ? 'border-2 border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Adaptive Retrieval
              </div>
              <p className="text-[11px] text-slate-500">Dynamic scaling based on your topic proficiency.</p>
            </div>

            <div
              onClick={() => setDrillMode('mock')}
              className={`p-4 rounded-xl border cursor-pointer text-xs space-y-1.5 transition-all ${
                drillMode === 'mock'
                  ? 'border-2 border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Timed Simulation
              </div>
              <p className="text-[11px] text-slate-500">Timed session for realistic exam preparation.</p>
            </div>
          </div>
        </div>

        {/* Topic Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Target Curricular Topic or Study Document
          </label>
          {documents.length > 0 ? (
            <div className="space-y-2">
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.title.replace(/\.pdf$/i, '')}>
                    {d.title} ({d.chunks_count} chunks)
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or type a specific subtopic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter topic name (e.g. Data Structures & Algorithms, Renal Clearance)..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <span>Tip: Upload your course syllabus or notes in <Link to="/materials" className="underline font-bold">Study Materials</Link> to enable grounded questions with page citations.</span>
              </p>
            </div>
          )}
        </div>

        {/* Question Count & Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Question Count
            </label>
            <div className="flex gap-2">
              {[3, 5, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    questionCount === count
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Difficulty Baseline
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Foundational">Foundational Concept Check</option>
              <option value="Adaptive">Adaptive (Scales to Performance)</option>
              <option value="Challenging">Challenging / Board Exam Level</option>
            </select>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {documents.length > 0 ? `${documents.length} Grounded course document(s) active` : 'Ungrounded practice session'}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={handleStart}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 font-semibold px-6 py-2.5 text-xs"
            rightIcon={<Play className="w-4 h-4 fill-white" />}
          >
            Launch Practice Drill
          </Button>
        </div>
      </Card>
    </div>
  )
}
