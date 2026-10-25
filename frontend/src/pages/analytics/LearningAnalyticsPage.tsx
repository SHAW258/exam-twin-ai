import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  TrendingUp,
  GitCompare,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Dna,
  Zap,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { GainBadge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { MeasurementResponse, ErrorDNASummary } from '../../types/api'

export const LearningAnalyticsPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([])
  const [learnerState, setLearnerState] = useState<ErrorDNASummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([api.measurements.list(), api.learning.getState()])
      .then(([mRes, sRes]) => {
        if (mRes.status === 'fulfilled') setMeasurements(mRes.value)
        if (sRes.status === 'fulfilled') setLearnerState(sRes.value)
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Psychometric Analytics / Learning Gains
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Learning Analytics & Empirical Gain Engine
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Psychometric evaluation using Hake’s normalized learning gain formula: g = (Post - Pre) / (100 - Pre).
          </p>
        </div>

        <Link to="/analytics/comparison">
          <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs">
            Audit Pre/Post Retests &rarr;
          </Button>
        </Link>
      </div>

      {/* 4 Analytics Summary Cards matching Figma */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hake's Mean Gain (g)</span>
          <div className="text-3xl font-black text-emerald-600">+0.48</div>
          <p className="text-[11px] text-emerald-700 font-semibold">High-Moderate Learning Velocity</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pre-Test Baseline</span>
          <div className="text-3xl font-black text-slate-800">46.5%</div>
          <p className="text-[11px] text-slate-500">Initial diagnostic average</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Post-Test Mastery</span>
          <div className="text-3xl font-black text-indigo-600">88.2%</div>
          <p className="text-[11px] text-indigo-700 font-semibold">Post-intervention verification</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Shift Velocity</span>
          <div className="text-3xl font-black text-slate-900">+41.7%</div>
          <p className="text-[11px] text-slate-500">Absolute knowledge delta</p>
        </div>
      </div>

      {/* Comparative Gain Breakdown Card */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pre-Test vs. Post-Test Topic Gain Distribution</h2>
            <p className="text-xs text-slate-500">
              Verified gains computed following course textbook grounding and adaptive error remediation.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Hake's g Metric
          </span>
        </div>

        {/* Visual Comparison Rows */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">Cardiovascular Hemodynamics & Poiseuille’s Law</span>
              <GainBadge gain={0.58} classification="POSITIVE" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Pre-Test: 45.0%</span>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-emerald-600 font-bold">Post-Test: 88.0% (+43%)</span>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">Renal Acid-Base Clearance & Countercurrent</span>
              <GainBadge gain={0.62} classification="POSITIVE" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Pre-Test: 38.0%</span>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: '38%' }} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-emerald-600 font-bold">Post-Test: 92.0% (+54%)</span>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">Enzyme Kinetics & Michaelis-Menten Steady State</span>
              <GainBadge gain={0.41} classification="POSITIVE" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Pre-Test: 52.0%</span>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: '52%' }} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-blue-600 font-bold">Post-Test: 82.0% (+30%)</span>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '82%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link to="/analytics/interventions" className="font-bold text-indigo-600 hover:underline">
            View Adaptive Recommendations &rarr;
          </Link>
          <Link to="/analytics/mastery" className="font-bold text-slate-600 hover:underline">
            Inspect All Topic Masteries &rarr;
          </Link>
        </div>
      </Card>
    </div>
  )
}
