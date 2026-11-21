import { CodeKnotIcon } from '../../components/ui/CodeKnotIcon'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
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
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const MarketingLandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [chatPrompt, setChatPrompt] = useState('Show me the Starling equation equilibrium proof...')

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-300">
      {/* Top Navbar */}
      <nav className="h-20 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0A1124]/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <CodeKnotIcon className="w-9 h-9" />
              <span className="font-extrabold text-xl tracking-tight text-[#14213D] dark:text-white">
                Code<span className="text-[#2563EB] dark:text-blue-400">Knot</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <a href="#product" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Product</a>
              <a href="#grounding" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Grounding Engine</a>
              <a href="#error-dna" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Error DNA</a>
              <a href="#comparison" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Why CodeKnot</a>
              <a href="#tracks" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Exam Prep</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-semibold shadow-sm shadow-blue-200 dark:shadow-none transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <header className="relative max-w-7xl mx-auto px-6 pt-14 pb-16 text-center flex flex-col items-center overflow-hidden">
        {/* Subtle Ambient Backing Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-80 bg-gradient-to-b from-blue-100/60 via-teal-50/30 to-transparent dark:from-blue-950/40 dark:via-teal-950/20 dark:to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Top Cognitive Precision Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#14B8A6] dark:text-teal-400" />
          <span>Study with answers mathematically grounded in your own materials</span>
        </div>

        {/* Primary Hero Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#14213D] dark:text-white tracking-tight leading-[1.14] max-w-4xl">
          Learn Better with <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#14B8A6] dark:from-blue-400 dark:via-cyan-300 dark:to-teal-300 bg-clip-text text-transparent">
            CodeKnot AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-normal">
          Upload your PDFs, ask questions with source-based answers, generate adaptive practice quizzes, and track your progress in one focused student workspace.
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm shadow-md shadow-blue-500/25 dark:shadow-none flex items-center gap-2 transition-all"
          >
            <span>Create Student Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2 shadow-xs transition-all"
          >
            <Play className="w-4 h-4 fill-slate-700 dark:fill-slate-300 text-slate-700 dark:text-slate-300" />
            <span>Sign In</span>
          </Link>
        </div>

        {/* Trust & Proof Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Answers grounded in uploaded PDFs</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-[#2563EB] dark:text-blue-400">
            <BookOpen className="w-4 h-4" />
            <span>Quizzes generated from your materials</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Clear progress tracking & Error DNA</span>
          </div>
        </div>

        {/* =========================================================================
            INTERACTIVE MOCKUP PREVIEW CARD ("Grounded Study Workspace")
            ========================================================================= */}
        <div className="mt-12 w-full max-w-5xl rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl shadow-blue-900/10 dark:shadow-black/60 overflow-hidden text-left transition-colors duration-300" id="product">
          {/* Mockup Window Titlebar */}
          <div className="bg-slate-100 dark:bg-[#0B132B] px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              <span className="ml-3 font-semibold text-slate-800 dark:text-slate-200">
                Grounded Study Workspace
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                Active Source: Course Notes.pdf
              </span>
            </div>
          </div>

          {/* Mockup Body: Two Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Left: Practice Question (7 cols) - Pure Crisp Card */}
            <div className="lg:col-span-7 p-6 bg-white dark:bg-[#0F172A] space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300">
                  Adaptive Practice Question
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Verified PDF Content
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                What is the main purpose of page-aware text chunking before generating study answers and quizzes?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">Select the best answer based on the uploaded syllabus notes.</p>

              {/* Options */}
              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">A</span>
                  <span>To artificially expand the PDF file byte length for cloud archiving.</span>
                </div>

                <div className="p-3.5 rounded-lg border-2 border-[#2563EB] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 text-xs text-slate-900 dark:text-slate-100 flex flex-col gap-1.5 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-bold text-[11px] flex items-center justify-center shrink-0">B</span>
                    <span className="font-semibold text-blue-950 dark:text-blue-100">
                      To partition content into bounded paragraphs so the vector retriever finds precise source excerpts with page provenance.
                    </span>
                  </div>
                  <div className="ml-7 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-md">
                      Correct Answer (Verified)
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">C</span>
                  <span>To suppress mathematical notations and formulas from retrieval queries.</span>
                </div>
              </div>

              {/* Footer status */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">Instant feedback & conceptual explanation</span>
                <span className="text-teal-600 dark:text-teal-400 font-semibold">+0.85 Normalized Gain</span>
              </div>
            </div>

            {/* Right: Citation Verification (5 cols) - Luminous Verification Column */}
            <div className="lg:col-span-5 p-6 bg-slate-50/80 dark:bg-[#070D1E] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#14213D] dark:text-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Citation Verification Badge
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Ground Truth Verified
                  </span>
                </div>

                {/* Source Pill */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-blue-100 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#2563EB] dark:text-blue-400">Course Notes.pdf</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Page 12 • Chunk #4</span>
                  </div>
                  <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic border-l-2 border-[#2563EB] dark:border-blue-400 pl-2.5 py-0.5 leading-relaxed bg-blue-50/40 dark:bg-blue-950/30 rounded-r">
                    "Chunking splits long documents into smaller sections so the system can retrieve the most relevant passages when answering questions or generating practice items."
                  </blockquote>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>Source snippet from uploaded PDF</span>
                    <span className="text-[#2563EB] dark:text-blue-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5">
                      Inspect citation <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Hallucination Risk Metric Box */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100 flex items-center justify-between shadow-2xs">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Hallucination Risk Probability</p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Constrained to verified cosine similarity threshold (s &ge; 0.50)</p>
                  </div>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">0.000%</span>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="relative pt-2">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl py-2 pl-3 pr-10 text-xs text-slate-700 dark:text-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-3.5 w-7 h-7 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white flex items-center justify-center shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: ARCHITECTURAL PILLARS (Color-Coded Cards)
            ========================================================================= */}
        <section className="mt-28 w-full text-left" id="grounding">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400 tracking-wider uppercase">Core Learning Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
              Built for Accurate, Reliable Exam Preparation
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-normal">
              Generic chatbots guess when test questions demand accuracy. CodeKnot focuses strictly on your uploaded course materials, anchoring every answer to verifiable facts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Blue / Royal Theme */}
            <div className="p-7 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-blue-50/20 dark:from-blue-950/40 dark:via-[#0F172A] dark:to-blue-900/20 border border-blue-200/80 dark:border-blue-800/60 shadow-xs hover:shadow-md dark:hover:border-blue-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB] dark:bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-blue-950 dark:text-blue-200">Source-Grounded AI Tutor</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Page-aware vector chunking and cosine similarity thresholds filter retrieved course documents, ensuring answers quote verifiable paragraphs.
              </p>
            </div>

            {/* Card 2: Purple / DNA Diagnostics Theme */}
            <div className="p-7 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-purple-50/20 dark:from-purple-950/40 dark:via-[#0F172A] dark:to-purple-900/20 border border-purple-200/80 dark:border-purple-800/60 shadow-xs hover:shadow-md dark:hover:border-purple-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600 dark:bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
                <Dna className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-purple-950 dark:text-purple-200">Deterministic Error DNA</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Continuous Error DNA logging records reasoning flaws, trap vulnerabilities, and knowledge gaps without synthetic guesswork.
              </p>
            </div>

            {/* Card 3: Teal / Dynamic Corpus Theme */}
            <div className="p-7 rounded-2xl bg-gradient-to-br from-teal-50/70 via-white to-teal-50/20 dark:from-teal-950/40 dark:via-[#0F172A] dark:to-teal-900/20 border border-teal-200/80 dark:border-teal-800/60 shadow-xs hover:shadow-md dark:hover:border-teal-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#14B8A6] dark:bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-teal-950 dark:text-teal-200">Dynamic Course Corpus</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Upload syllabus PDFs anytime. The pipeline runs PDF parsing, text sanitization, and vector store indexing within seconds.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: HALLUCINATION COMPARISON (Rose vs. Emerald Contrast)
            ========================================================================= */}
        <section className="mt-28 w-full text-left" id="comparison">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase">Zero Toleration for Hallucinations</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
              The Danger of Hallucinations on Exam Day
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-normal">
              Why generic consumer chatbots fail high-stakes medical, legal, and engineering students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Left: Unanchored Generative AI (Vivid Rose Warning Card) */}
            <div className="p-7 rounded-2xl bg-gradient-to-b from-rose-50/70 via-red-50/30 to-white dark:from-rose-950/40 dark:via-[#160A0D] dark:to-[#0F172A] border-2 border-rose-300 dark:border-rose-900/70 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 font-extrabold text-base">
                <XCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Unanchored Generative AI (ChatGPT / Claude)</span>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-700 dark:text-rose-100/90 font-normal">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold shrink-0">✕</span>
                  <span>Invents plausible-sounding physiological equations and fabricated case precedents.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold shrink-0">✕</span>
                  <span>No connection to your university syllabus, faculty lecture slides, or required editions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold shrink-0">✕</span>
                  <span>Cannot diagnose whether you misread the question stem or misunderstood the core mechanism.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold shrink-0">✕</span>
                  <span>Memorizes false explanations that silently cost critical points on final exam day.</span>
                </li>
              </ul>
            </div>

            {/* Right: CodeKnot Cognitive Precision (Vivid Emerald Success Card) */}
            <div className="p-7 rounded-2xl bg-gradient-to-b from-emerald-50 via-teal-50/30 to-white dark:from-emerald-950/45 dark:via-[#09221C] dark:to-[#0F172A] border-2 border-emerald-400 dark:border-emerald-600/70 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-300 font-extrabold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>CodeKnot Cognitive Precision Engine</span>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-800 dark:text-emerald-100 font-normal">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>100% mathematically bounded to your uploaded textbooks and authoritative notes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Deterministic chunk citations with page numbers, paragraph indexes, and cosine scores.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Deep Error DNA profiling isolates trap vulnerabilities, calculation flaws, and misread triggers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Empirically verifiable normalized learning gains (Hake's mean gain g &gt; +0.45).</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: FOUR-STEP WORKFLOW (Progressive Color Sequence)
            ========================================================================= */}
        <section className="mt-28 w-full text-left" id="error-dna">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400 tracking-wider uppercase">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
              Master Your Course Material in 4 Simple Steps
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-normal">
              A clear, evidence-based study workflow designed to turn learning gaps into proven understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1: Blue */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/30 dark:to-[#0F172A] border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">Ingest & Vectorize</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Upload course syllabi, textbooks, and notes. The engine parses PDFs and builds a semantic vector index.
              </p>
            </div>

            {/* Step 2: Indigo */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-[#0F172A] border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                2
              </div>
              <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">Diagnostic Sprints</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Complete adaptive pre-tests that isolate reasoning fallacies and map your cognitive gaps.
              </p>
            </div>

            {/* Step 3: Amber */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/30 dark:to-[#0F172A] border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">Targeted Drills</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Receive tailored drills and Socratic tutor explanations anchored strictly in verified source materials.
              </p>
            </div>

            {/* Step 4: Emerald */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/30 dark:to-[#0F172A] border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                4
              </div>
              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">Mastery Verification</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Track normalized learning gain (g) with post-tests proving retention before high-stakes exam day.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: PREP TRACKS (Discipline-Themed Cards)
            ========================================================================= */}
        <section className="mt-28 w-full text-left" id="tracks">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400 tracking-wider uppercase">Curriculum Coverage</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
              Ready for Higher Education & Professional Exams
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-normal">
              Structured to support comprehensive course materials, foundational subjects, and board examination patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Medical - Ruby Red */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-3 hover:border-rose-400 dark:hover:border-rose-500 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">Medical & Life Sciences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Guyton & Hall Physiology, Robbins Pathology, First Aid, and USMLE Step 1/2 CK question banks.
              </p>
            </div>

            {/* Legal - Royal Blue */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-blue-200 dark:border-blue-900/60 shadow-2xs space-y-3 hover:border-blue-400 dark:hover:border-blue-500 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">Bar Exam (MBE / UBE)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Federal Rules of Civil Procedure, Constitutional Law doctrines, and Multistate Bar Examination rules.
              </p>
            </div>

            {/* Financial - Golden Amber */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-amber-200 dark:border-amber-900/60 shadow-2xs space-y-3 hover:border-amber-400 dark:hover:border-amber-500 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">CFA Level I & II</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Ethical & Professional Standards, Quantitative Methods, and Financial Statement Analysis.
              </p>
            </div>

            {/* Technology - Vibrant Teal */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-teal-200 dark:border-teal-900/60 shadow-2xs space-y-3 hover:border-teal-400 dark:hover:border-teal-500 transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-[#14B8A6] dark:text-teal-400 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-teal-950 dark:text-teal-200">Custom Institutional Syllabi</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Ingest any MCA, computer science, software engineering, or postgraduate curriculum in minutes.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: STUDENT TESTIMONIAL QUOTE (Warm Academic Card)
            ========================================================================= */}
        <section className="mt-24 max-w-3xl mx-auto w-full p-8 rounded-3xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-teal-50/60 dark:from-[#0F1E36] dark:via-[#131F33] dark:to-[#0C2229] border border-blue-200/80 dark:border-blue-800/60 text-center space-y-4 shadow-sm transition-colors">
          <div className="flex items-center justify-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400" />
            ))}
          </div>
          <blockquote className="text-sm sm:text-base italic text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
            "Matched my university exam phrasing with 98% fidelity. The diagnostic breakdown replaced disjointed prep books and helped me pinpoint my exact conceptual and reasoning errors."
          </blockquote>
          <div className="text-xs font-bold text-[#14213D] dark:text-teal-300">
            Elena K. • Johns Hopkins SOM Candidate
          </div>
        </section>

        {/* =========================================================================
            SECTION 6: FINAL CTA BANNER (Vibrant Royal Navy to Teal Mesh)
            ========================================================================= */}
        <section className="mt-28 w-full p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-[#14213D] via-[#1E3A8A] to-[#0F766E] border border-blue-700/30 text-white text-center space-y-6 shadow-xl shadow-blue-900/20 transition-all">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to study with verified confidence?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto leading-relaxed font-normal">
            Join ambitious students achieving measurable score improvements with course-grounded AI and Error DNA tracking.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#14213D] hover:text-[#2563EB] font-bold rounded-xl text-sm shadow-lg hover:bg-slate-50 transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </header>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#050811] py-12 px-6 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <CodeKnotIcon className="w-7 h-7" static />
            <span className="font-extrabold text-base tracking-tight text-[#14213D] dark:text-white">
              Code<span className="text-[#2563EB] dark:text-blue-400">Knot</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500 ml-2">
              © 2026 CodeKnot AI Study Engine. Academic MCA Project — Web-First Architecture.
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-600 dark:text-slate-300 font-semibold">
            <Link to="/help" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Documentation</Link>
            <Link to="/help" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Privacy Policy</Link>
            <Link to="/help" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Academic Integrity</Link>
            <Link to="/help" className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
