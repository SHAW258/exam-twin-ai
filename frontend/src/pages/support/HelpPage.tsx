import React, { useState } from 'react'
import {
  HelpCircle,
  Search,
  BookOpen,
  ShieldCheck,
  Dna,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  LifeBuoy,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export const HelpPage: React.FC = () => {
  const [ticketCategory, setTicketCategory] = useState('Syllabus Ingestion & PDF Chunking')
  const [ticketDescription, setTicketDescription] = useState('')
  const [severity, setSeverity] = useState('Medium')
  const [ticketSubmitted, setTicketSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketDescription) return
    setTicketSubmitted(true)
  }

  const faqs = [
    {
      q: 'Why does AI Tutor refuse to answer certain questions without direct PDF citations?',
      a: "To protect you from harmful confabulations in high-stakes examinations, ExamTwin enforces an immutable grounding filter. If a prompt does not align with your course materials and syllabus above a strict cosine similarity metric, the model declines speculative answers. Solution: Upload additional lecture slide decks or supplementary textbook PDFs in Study Materials.",
    },
    {
      q: 'How is Hake’s normalized learning gain calculated?',
      a: 'Normalized gain g is calculated using Hake’s educational psychometric equation: g = (Post - Pre) / (100 - Pre). A gain g >= 0.5 denotes high cognitive velocity, while g < 0 indicates performance drop requiring targeted Error DNA intervention.',
    },
    {
      q: 'Are my uploaded class slides or textbook chapters shared with other students?',
      a: 'By default, documents uploaded with PRIVATE access level are strictly isolated to your authenticated student ID and never exposed to other students or shared public LLM training datasets.',
    },
  ]

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header matching Figma */}
      <div>
        <div className="text-xs text-slate-500 mb-1">
          ExamTwin / Student Suite / Help & Support / Knowledge Base v4.2
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Help, Documentation & Student Support
        </h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
          Search authoritative guides on retrieval-augmented grounding, Cognitive Error DNA taxonomy, syllabus vectorization, and dispatch priority engineering tickets.
        </p>
      </div>

      {/* Global Search Bar with Quick Tags matching Figma */}
      <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder='Search articles, error codes, and tutorials (e.g., "cosine cutoff", "ANSI CSV sync", "FERPA pledge")...'
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Quick Filters:</span>
          {['Vector Grounding', 'Chunking Failure', 'Institutional SSO', 'Error DNA Taxonomy', 'Hake’s Formula'].map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </Card>

      {/* 3 Knowledge Pillars Cards matching Figma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card hoverEffect className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Syllabus Ingestion Pipeline</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Syllabus PDF formatting, high-density OCR extraction, apex chunking pipelines, and multi-tenant semantic dialog modes.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer">
              Explore 3-step setup &rarr;
            </span>
          </div>
        </Card>

        <Card hoverEffect className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">AI Tutor Grounding Precision</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Deep-dive into cosine similarity research telemetry, 0.30-accuracy PDF attribution anchor links, and token-redundant safety.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
              Calibration guides &rarr;
            </span>
          </div>
        </Card>

        <Card hoverEffect className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Dna className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Assessments & Error DNA</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Algorithmic psychometrics, hierarchical Bayesian-cognitive traversal, trajectory log tagging, and vector-based parameters.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer">
              Diagnostic formulas &rarr;
            </span>
          </div>
        </Card>
      </div>

      {/* Strict Grounding Safety Protocol Section matching Figma */}
      <div className="p-6 md:p-8 rounded-2xl bg-indigo-950 text-white shadow-md space-y-5">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Under the Hood</span>
          <h3 className="text-xl font-bold tracking-tight">The Strict-Grounding Safety Protocol</h3>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            ExamTwin uses deterministic vector embeddings. When arriving at exam practice prompts, the AI tutor compares conceptual candidate axioms strictly against indexed textbook passages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-indigo-900/50 border border-indigo-800/80 space-y-1">
            <span className="font-bold text-indigo-300 block">Stage 1 - Ingestion</span>
            <p className="text-slate-300 text-[11px]">Syllabus PDF above 99% vector fidelity with 64-spaced-stride tokenization.</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-900/50 border border-indigo-800/80 space-y-1">
            <span className="font-bold text-indigo-300 block">Stage 2 - Vector Filter</span>
            <p className="text-slate-300 text-[11px]">Cross-attention queries matching vector cosine thresholds &ge; 0.82.</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-900/50 border border-indigo-800/80 space-y-1">
            <span className="font-bold text-indigo-300 block">Stage 3 - Strict Run</span>
            <p className="text-slate-300 text-[11px]">Grounding verified via source anchors with zero LLM hallucination guarantee.</p>
          </div>
        </div>
      </div>

      {/* FAQ & Support Ticket Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: FAQ Accordion (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">High-Yield FAQ</h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-800 text-left transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />}
                </button>
                {openFaq === i && (
                  <div className="p-4 bg-white text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Submit Support Ticket (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Submit Support Ticket</h3>
            <p className="text-xs text-slate-500">Direct dispatch to Clinical & Engineering desk</p>
          </div>

          {ticketSubmitted ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">Ticket Dispatched</p>
              <p>Reference: #TK-89104-EX. An engineer will inspect your syllabus vector pipeline within 2 business hours.</p>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Syllabus Ingestion & PDF Chunking">Syllabus Ingestion & PDF Chunking</option>
                  <option value="AI Tutor Citation Inaccuracy">AI Tutor Citation Inaccuracy</option>
                  <option value="Assessment Telemetry Error">Assessment Telemetry Error</option>
                  <option value="Single Sign-On Authentication">Single Sign-On Authentication</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Diagnostic Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`py-1.5 rounded-lg border font-bold text-xs ${
                        severity === s
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Ingestion failed at page 29 of Robbins Pathology PDF..."
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <Button type="submit" variant="primary" className="w-full py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold">
                Dispatch Ticket to Priority Queue
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
