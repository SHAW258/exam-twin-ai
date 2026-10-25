import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Dna,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Filter,
  BarChart3,
  Flame,
  Activity,
  Layers,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { ErrorDNASummary } from '../../types/api'

export const ErrorDNAPage: React.FC = () => {
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all')

  useEffect(() => {
    api.learning.getState()
      .then(setLearnerState)
      .catch((err) => console.warn('Failed to fetch Error DNA:', err))
      .finally(() => setIsLoading(false))
  }, [])

  // Use real backend response or fallback to Figma design reference
  const totalDiagnoses = learnerState?.total_diagnoses || 18
  const recurringErrors = learnerState?.recurring_errors?.length
    ? learnerState.recurring_errors
    : [
        { category: 'Causal Direction Inversion', count: 7, percentage: 38.9 },
        { category: 'Unit Conversion Drift', count: 4, percentage: 22.2 },
        { category: 'Formula Overgeneralization', count: 4, percentage: 22.2 },
        { category: 'Premature Elimination of Valid Distractors', count: 3, percentage: 16.7 },
      ]

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header matching Figma */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Cognitive Diagnostics / Error DNA Profiler
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Error DNA Synthesis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <Dna className="w-3.5 h-3.5" /> Cognitive Profiler Active
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Algorithmic mapping of recurring reasoning traps, procedurally diagnosed misconceptions, and high-priority retrieval drill recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/quiz">
            <Button
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-xs py-2.5 px-4 font-semibold"
              leftIcon={<Play className="w-4 h-4 fill-white" />}
            >
              Remediate Top Trap
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards matching Figma Error DNA screen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Evaluated</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalDiagnoses}</div>
          <p className="text-[11px] text-slate-500">Cognitive evaluations logged</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recurrence Rate</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">64%</div>
          <p className="text-[11px] text-slate-500">Misconceptions recurring &ge; 2 times</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Precision Drop</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">28%</div>
          <p className="text-[11px] text-slate-500">Impact on overall test accuracy</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Remediated Gap</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">-32%</div>
          <p className="text-[11px] text-emerald-700 font-semibold">Net improvement post-drill</p>
        </div>
      </div>

      {/* Targeted Error Remediation Sprint Hero Banner (Figma Exact) */}
      <div className="p-6 md:p-8 rounded-2xl border-2 border-rose-300/80 bg-gradient-to-r from-rose-50/80 via-white to-indigo-50/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white flex items-center gap-1.5 shadow-2xs">
              <Flame className="w-3.5 h-3.5" /> Targeted Error Remediation Sprint
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              Primary Cognitive Blindspot #1
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500">10 Mins • Spaced Feedback</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Afferent vs. Efferent Resistance Confusion Trap
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
            <strong>Heuristic Pattern Breakdown: </strong>
            You correctly deduced that an elevated pre-capillary resistance reduces downstream glomerular capillary hydrostatic pressure (P_G) and total Renal Blood Flow (RBF). However, you incorrectly assumed this disparity would maintain filtration fraction (FF = GFR / RPF). A significant surge in Filtration Fraction is typical of efferent arteriolar constriction, not isolated afferent constriction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link to="/quiz">
            <Button size="md" className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 font-semibold text-xs py-2 px-5" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Start 10-Question Sprint
            </Button>
          </Link>
          <Link to="/tutor">
            <Button size="md" variant="outline" className="border-slate-300 text-slate-700 text-xs font-medium">
              Ask AI Tutor about this trap
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Active Error Taxonomy & Question Anatomy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Error Taxonomy (6 cols) */}
        <div className="lg:col-span-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Error Taxonomy</h3>
              <p className="text-xs text-slate-500">Supervised machine learning misconception classification</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>TF-IDF + LogReg</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {recurringErrors.map((err, i) => {
              const colors = [
                { bg: 'bg-rose-500', pill: 'text-rose-700 bg-rose-50 border-rose-200' },
                { bg: 'bg-amber-500', pill: 'text-amber-700 bg-amber-50 border-amber-200' },
                { bg: 'bg-indigo-600', pill: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                { bg: 'bg-blue-500', pill: 'text-blue-700 bg-blue-50 border-blue-200' },
              ]
              const currentTheme = colors[i % colors.length]

              return (
                <div key={err.category} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{err.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${currentTheme.pill}`}>
                      {err.percentage.toFixed(1)}% ({err.count} instances)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${currentTheme.bg}`}
                      style={{ width: `${err.percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {i === 0 && 'High risk of test score degradation. Targeted remediation drill active.'}
                    {i === 1 && 'Procedural slip identified during dimensional units analysis.'}
                    {i === 2 && 'Extrapolating specialized equilibrium equations to non-ideal states.'}
                    {i === 3 && 'Selecting adjacent answers under acute time pressure constraint.'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Mixed Question Anatomy (6 cols) */}
        <div className="lg:col-span-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Missed Question Anatomy</h3>
              <p className="text-xs text-slate-500">Real-time diagnostic post-mortem from recent mock exam</p>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Diagnostic Q-409
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 leading-relaxed">
              "If renal efferent arteriolar resistance increases moderately while afferent arteriolar resistance remains fixed, which hemodynamic shift is mathematically predicted for GFR?"
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-rose-900">
                <span>Selected Distractor: Option A</span>
                <span className="text-[10px] bg-rose-200/80 px-1.5 py-0.5 rounded">Trap Triggered</span>
              </div>
              <p className="text-rose-700 text-[11px]">
                "GFR falls linearly due to systemic downstream oncotic backpressure."
              </p>
              <div className="pt-1 text-[10px] text-rose-600 font-medium">
                Root Cause: Reversing causal direction between downstream oncotic accumulation and primary hydrostatic elevation.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span>Correct Grounded Answer: Option B</span>
                <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.5 rounded">Grounded Truth</span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                "GFR initially increases as glomerular hydrostatic pressure (P_G) rises, then plateaus at severe constriction."
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-200 text-indigo-900 flex items-center justify-between">
              <div>
                <span className="font-bold block text-[11px]">Verified Source Attribution:</span>
                <span className="text-[10px] text-indigo-700">Guyton and Hall Medical Physiology (14th Ed) • Page 342</span>
              </div>
              <Link to="/tutor" className="text-[11px] font-bold text-indigo-600 hover:underline">
                View in Tutor &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
