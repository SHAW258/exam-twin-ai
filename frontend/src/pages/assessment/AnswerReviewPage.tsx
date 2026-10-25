import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Dna,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export const AnswerReviewPage: React.FC = () => {
  const [activeQuestion, setActiveQuestion] = useState(8)

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Assessment Audit / Answer Review
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Cognitive Post-Mortem & Grounded Citations
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Algorithmic breakdown of student choices, distractor traps, and authoritative textbook proofs.
          </p>
        </div>

        <Link to="/assessments">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Assessment History
          </Button>
        </Link>
      </div>

      {/* Question Stepper matching Figma */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isCurrent = activeQuestion === num
          const isCorrect = num !== 8 // question 8 is the diagnostic trap
          return (
            <button
              key={num}
              onClick={() => setActiveQuestion(num)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 border ${
                isCurrent
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                  : isCorrect
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {num}
            </button>
          )
        })}
      </div>

      {/* Cognitive Error DNA Trap Banner (Figma Exact) */}
      <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="font-extrabold text-xs text-rose-900 tracking-wide uppercase">
              COGNITIVE ERROR DNA DETECTED • Afferent vs. Efferent Resistance Confusion Trap
            </span>
          </div>
          <span className="text-[11px] font-bold text-rose-800 bg-rose-200/60 px-2 py-0.5 rounded">
            Cognitive Blindspot #3
          </span>
        </div>
        <p className="text-xs text-rose-800 leading-relaxed">
          <strong>Heuristic Pattern Breakdown: </strong>
          You correctly deduced that an elevated pre-capillary resistance reduces both downstream glomerular capillary hydrostatic pressure (P_G) and total Renal Blood Flow (RBF). However, you incorrectly assumed this disparity would maintain filtration fraction (FF = GFR / RPF). A significant surge in Filtration Fraction is typical of efferent arteriolar constriction, not isolated afferent constriction.
        </p>
      </div>

      {/* Main Review Card */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-6">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-700">Question #{activeQuestion} • Diagnostic Q-409</span>
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Incorrect (Trap Triggered)
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-3 leading-snug">
            If renal efferent arteriolar resistance increases moderately while afferent arteriolar resistance remains fixed, which hemodynamic shift is mathematically predicted for Glomerular Filtration Rate (GFR)?
          </h2>
        </div>

        {/* Options Comparison */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-rose-900">
              <span>Your Selected Answer: Option A</span>
              <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded">Incorrect Choice</span>
            </div>
            <p className="text-slate-700">"GFR falls linearly due to systemic downstream oncotic backpressure."</p>
          </div>

          <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 text-xs space-y-1 shadow-2xs">
            <div className="flex items-center justify-between font-bold text-emerald-900">
              <span>Correct Grounded Answer: Option B</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Grounded Truth</span>
            </div>
            <p className="text-emerald-950 font-semibold">
              "GFR initially increases as glomerular hydrostatic pressure (P_G) rises, then plateaus at severe constriction."
            </p>
          </div>
        </div>

        {/* Physiological Formula Proof matching Figma */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3 font-mono">
          <div className="font-bold text-slate-800 font-sans text-xs">Renal Vascular Resistance Equation (R_total):</div>
          <p className="text-slate-600">
            Total resistance is the sum of afferent, efferent, and venular segments: R_total = R_aff + R_eff + R_ven.
            Doubling R_eff by 2.5 markedly elevates R_total, which drives a sharp decline in total Renal Blood Flow:
          </p>
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-indigo-700 font-bold">
            F = ΔP / R_total &rarr; ↓ RBF &rarr; ↑ FF = GFR / RPF
          </div>
        </div>

        {/* Grounded Textbook Citation (Figma Exact) */}
        <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Textbook Grounding
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              98.4% Cosine Match
            </span>
          </div>

          <p className="font-semibold text-emerald-900">
            Guyton and Hall Textbook of Medical Physiology (14th Ed.) - Chapter 28, Page 342:
          </p>
          <blockquote className="italic border-l-2 border-emerald-500 pl-3 text-emerald-900 leading-relaxed bg-white/60 p-2.5 rounded">
            "Selective constriction of efferent arterioles increases glomerular hydrostatic pressure (P_G) while decreasing renal blood flow. Because both filtration and flow decline synchronously, the filtration fraction remains relatively constant, in contrast to isolated afferent constriction which elevates filtration fraction."
          </blockquote>

          <div className="pt-2 flex items-center justify-between text-[11px] text-emerald-700">
            <span>Vector Index: Guyton-14ed-Sec4-v28</span>
            <Link to="/materials" className="font-bold text-indigo-700 hover:underline flex items-center gap-1">
              Open in Source Hub (Page 342) <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveQuestion((prev) => Math.max(1, prev - 1))}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Previous Review
          </Button>

          <Link to="/tutor">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Discuss this with AI Tutor
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
