import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Sparkles,
  Dna,
  ShieldCheck,
  ArrowRight,
  Play,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Send,
  Zap,
  Scale,
  GraduationCap,
  FileText,
  Star,
  Check,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const MarketingLandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [chatPrompt, setChatPrompt] = useState('Twin, show me the Starling equation equilibrium proof...')

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar matching Figma */}
      <nav className="h-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#4338CA] flex items-center justify-center text-white shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Exam<span className="text-[#4338CA]">Twin</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a href="#product" className="hover:text-[#4338CA] transition-colors">Product</a>
              <a href="#grounding" className="hover:text-[#4338CA] transition-colors">Grounding Engine</a>
              <a href="#error-dna" className="hover:text-[#4338CA] transition-colors">Error DNA</a>
              <a href="#comparison" className="hover:text-[#4338CA] transition-colors">Why ExamTwin</a>
              <a href="#tracks" className="hover:text-[#4338CA] transition-colors">Pre-Tuned Tracks</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-sm font-semibold shadow-xs flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 pt-12 pb-16 text-center flex flex-col items-center">
        {/* Top Cognitive Precision Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-6 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#4338CA] animate-pulse" />
          <span>Strict Cognitive Precision • Zero AI Hallucinations for High-Stakes Exams</span>
        </div>

        {/* Primary Hero Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12] max-w-4xl">
          Master Complex Syllabi With <br className="hidden sm:inline" />
          <span className="text-[#4338CA]">
            Evidence–Grounded
          </span> AI Study Twin
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          Upload your textbooks, lecture slides, and notes. ExamTwin synthesizes strict citations, maps your personal Error DNA, and conducts adaptive retrieval drills that guarantee score velocity.
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
          >
            <span>Start Studying Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/quiz"
            className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center gap-2 shadow-2xs transition-all"
          >
            <Play className="w-4 h-4 fill-slate-700" />
            <span>Explore Interactive Demo</span>
          </Link>
        </div>

        {/* Trust & Proof Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Trusted by med, law & STEM students</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#4338CA]" />
            <span>1,400,000+ pages indexed</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-semibold">0% invented citations</span>
          </div>
        </div>

        {/* =========================================================================
            Figma Exact Interactive Mockup Preview Card
            ========================================================================= */}
        <div className="mt-12 w-full max-w-5xl rounded-2xl border border-slate-300 bg-white shadow-2xl shadow-slate-200 overflow-hidden text-left" id="product">
          {/* Mockup Window Titlebar */}
          <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              <span className="ml-3 font-semibold text-slate-700">
                MCAT Biology Section IV • Renal Microcirculation Hemodynamics
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-600">
                Active Session: Guyton & Hall 14th Ed.
              </span>
            </div>
          </div>

          {/* Mockup Body: Two Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left: Diagnostic Question (7 cols) */}
            <div className="lg:col-span-7 p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                  Diagnostic Q-409
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Adaptive Difficulty: 8.8/10
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                If renal efferent arteriolar resistance increases moderately while afferent arteriolar resistance remains fixed, which hemodynamic shift is mathematically predicted for Glomerular Filtration Rate (GFR)?
              </h3>
              <p className="text-xs text-slate-400 italic">Select the precise response grounded strictly within the physiological equilibrium model.</p>

              {/* Options */}
              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-slate-300 bg-white font-bold text-[11px] flex items-center justify-center shrink-0">A</span>
                  <span>GFR falls linearly due to systemic downstream oncotic backpressure.</span>
                </div>

                <div className="p-3.5 rounded-lg border-2 border-[#4338CA] bg-indigo-50/40 text-xs text-slate-900 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#4338CA] text-white font-bold text-[11px] flex items-center justify-center shrink-0">B</span>
                    <span className="font-semibold text-indigo-950">
                      GFR initially increases as glomerular hydrostatic pressure (P_G) rises, then plateaus at severe constriction.
                    </span>
                  </div>
                  <div className="ml-7 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                      Direct Match (Target Index Score 0.984)
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-slate-300 bg-white font-bold text-[11px] flex items-center justify-center shrink-0">C</span>
                  <span>Renal plasma flow (RPF) and GFR increase symmetrically without filtration fraction alteration.</span>
                </div>
              </div>

              {/* Footer status */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                <span className="font-medium text-slate-700">Error DNA Logged: Zero Reasoning Inversion</span>
                <span>12.4s Response Latency</span>
              </div>
            </div>

            {/* Right: Citation Verification (5 cols) */}
            <div className="lg:col-span-5 p-6 bg-slate-50/70 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Citation Verification
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Cosine: 98.4%
                  </span>
                </div>

                {/* Source Pill */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#4338CA]">Guyton and Hall Medical Physiology (14th Ed)</span>
                    <span className="text-slate-400">Page 342 • ¶ 3</span>
                  </div>
                  <blockquote className="text-xs text-slate-700 italic border-l-2 border-[#4338CA] pl-2.5 py-0.5 leading-relaxed bg-indigo-50/30 rounded-r">
                    "Moderate constriction of the efferent arterioles increases glomerular hydrostatic pressure (P_G), which tends to increase GFR." As constriction becomes severe, plasma protein concentration increases dramatically, oncotic pressure increases, and net filtration declines.
                  </blockquote>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Bounding Box [X:142, Y:890, W:420, H:72]</span>
                    <span className="text-[#4338CA] font-semibold cursor-pointer hover:underline flex items-center gap-0.5">
                      View Source PDF <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Hallucination Risk Metric */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold">Hallucination Risk Probability</p>
                    <p className="text-[10px] text-emerald-700">Response mathematically bound to verified textbook index</p>
                  </div>
                  <span className="text-lg font-black text-emerald-600">0.000%</span>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="relative pt-2">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-3 pr-10 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-3.5 w-7 h-7 rounded-lg bg-[#4338CA] text-white flex items-center justify-center shadow-2xs hover:bg-[#3730A3]"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            Section 1: Architectural Pillars
            ========================================================================= */}
        <section className="mt-24 w-full text-left" id="grounding">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#4338CA] tracking-wider uppercase">Architectural Pillars</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Engineered for High-Stakes Intellectual Rigor
            </h2>
            <p className="text-sm text-slate-600">
              Generic chatbots hallucinate when test questions demand precision. ExamTwin isolates your exact curriculum, indexes authoritative medical and legal doctrines, and anchors every token.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#4338CA] flex items-center justify-center font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Source-Grounded AI Tutor</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Page-aware vector chunking and cosine similarity thresholds filter retrieved course documents, ensuring answers quote verifiable paragraphs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#4338CA] flex items-center justify-center font-bold">
                <Dna className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Deterministic Error Profiling</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Continuous Error DNA logging records reasoning flaws, trap vulnerabilities, and knowledge gaps without synthetic guesswork.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dynamic Knowledge Corpus</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload syllabus PDFs anytime. The pipeline runs PDF parsing, text sanitization, and MySQL vector store indexing within seconds.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 2: The Danger of Generative Hallucinations on Exam Day (Comparison)
            ========================================================================= */}
        <section className="mt-24 w-full text-left" id="comparison">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-rose-600 tracking-wider uppercase">Zero Toleration for Hallucinations</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              The Danger of Generative Hallucinations on Exam Day
            </h2>
            <p className="text-sm text-slate-600">
              Why generic consumer chatbots fail high-stakes medical, legal, and engineering students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Left: Unanchored Generative AI (Red) */}
            <div className="p-7 rounded-2xl bg-white border-2 border-rose-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 text-rose-600 font-extrabold text-base">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>Unanchored Generative AI (ChatGPT / Claude)</span>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Invents plausible-sounding physiological equations and fabricated case precedents.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>No link to your university syllabus, faculty lecture slides, or required editions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Cannot diagnose whether you misread the question stem or misunderstood the core mechanism.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Memorizes false explanations that silently cost critical points on board exams.</span>
                </li>
              </ul>
            </div>

            {/* Right: ExamTwin Cognitive Precision (Emerald) */}
            <div className="p-7 rounded-2xl bg-emerald-50/50 border-2 border-emerald-300 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 text-emerald-800 font-extrabold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>ExamTwin Cognitive Precision Engine</span>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>100% mathematically bounded to your uploaded textbooks and authoritative sources.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Deterministic chunk citations with page numbers, paragraph indexes, and cosine scores.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Deep Error DNA profiling isolates trap vulnerabilities, inversion flaws, and misread triggers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Empirically verifiable normalized score gains (Hake's mean gain g &gt; +0.45).</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 3: Four-Step Workflow Stepper
            ========================================================================= */}
        <section className="mt-24 w-full text-left" id="error-dna">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#4338CA] tracking-wider uppercase">System Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Raw Syllabi to Board Mastery in Four Steps
            </h2>
            <p className="text-sm text-slate-600">
              The closed-loop learning cycle engineered to turn cognitive weaknesses into verified retention.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4338CA] font-extrabold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900">Ingest & Vectorize</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload course syllabi, textbooks, and notes. The engine parses PDFs and builds a high-dimensional vector index.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4338CA] font-extrabold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900">Diagnostic Sprints</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete adaptive pre-tests that isolate reasoning fallacies and map your cognitive gaps.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4338CA] font-extrabold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900">Targeted Interventions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive tailored drills and Socratic tutor explanations anchored strictly in verified source materials.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-sm flex items-center justify-center">
                4
              </div>
              <h3 className="text-sm font-bold text-slate-900">Mastery Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track normalized gain (g) with post-tests proving retention before high-stakes exam day.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 4: Standardized Prep Tracks
            ========================================================================= */}
        <section className="mt-24 w-full text-left" id="tracks">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#4338CA] tracking-wider uppercase">Curriculum Coverage</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Pre-Tuned for Rigorous High-Stakes Standardized Exams
            </h2>
            <p className="text-sm text-slate-600">
              Pre-indexed with standard doctrinal references and high-yield board question patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">MCAT & USMLE</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Guyton & Hall Physiology, Robbins Pathology, First Aid, and USMLE Step 1/2 CK question banks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4338CA] flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Bar Exam (MBE / UBE)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Federal Rules of Civil Procedure, Constitutional Law doctrines, and Multistate Bar Examination rules.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">CFA Level I & II</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ethical & Professional Standards, Quantitative Methods, and Financial Statement Analysis.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Custom Institutional Syllabi</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ingest any MCA, computer science, engineering, or graduate curriculum in minutes.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 5: Testimonial Quote matching Figma
            ========================================================================= */}
        <section className="mt-20 max-w-3xl mx-auto w-full p-8 rounded-3xl bg-[#EEF2F6] border border-slate-200 text-center space-y-4">
          <div className="flex items-center justify-center gap-1 text-emerald-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-emerald-500" />
            ))}
          </div>
          <blockquote className="text-sm sm:text-base italic text-slate-800 leading-relaxed font-medium">
            "Matched my USMLE Step 1 question phrasing with 98% fidelity. The diagnostic breakdown replaced 4 disjointed prep books and helped me pinpoint my exact hemodynamic reasoning errors."
          </blockquote>
          <div className="text-xs font-bold text-slate-900">
            Elena K. • Johns Hopkins SOM Candidate
          </div>
        </section>

        {/* =========================================================================
            Section 6: Final CTA Banner
            ========================================================================= */}
        <section className="mt-24 w-full p-10 sm:p-14 rounded-3xl bg-[#4338CA] text-white text-center space-y-6 shadow-xl shadow-indigo-200">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to study with mathematical certainty?
          </h2>
          <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
            Join thousands of ambitious students achieving measurable score improvements with source-grounded AI.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#4338CA] font-bold rounded-xl text-sm shadow-md hover:bg-slate-50 transition-colors"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </header>

      {/* Footer matching Figma */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4338CA] flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              Exam<span className="text-[#4338CA]">Twin</span>
            </span>
            <span className="text-slate-400 ml-2">
              © 2026 ExamTwin AI Study Engine. Academic MCA Project — Web-First Architecture.
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-600 font-medium">
            <Link to="/help" className="hover:text-slate-900">Documentation</Link>
            <Link to="/help" className="hover:text-slate-900">Privacy Policy</Link>
            <Link to="/help" className="hover:text-slate-900">Academic Integrity Pledge</Link>
            <Link to="/help" className="hover:text-slate-900">Institutional Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
