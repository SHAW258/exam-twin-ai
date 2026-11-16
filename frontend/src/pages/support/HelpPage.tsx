import React, { useState, useEffect } from 'react'
import { HelpCircle, ChevronDown, Send, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'

type Ticket = { id: string; subject: string; description: string; status: 'Submitted' | 'In Review' | 'Resolved'; createdAt: string }

const GuideItem: React.FC<{
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ title, isOpen, onToggle, children }) => (
  <Card className="p-5 bg-white border border-slate-200 rounded-2xl">
    <button className="w-full flex items-center justify-between text-left" onClick={onToggle}>
      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#2563EB]" /> {title}
      </span>
      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="mt-3 text-xs text-slate-600 leading-relaxed space-y-2">{children}</div>}
  </Card>
)

export const HelpPage: React.FC = () => {
  const [openGuide, setOpenGuide] = useState<string | null>('syllabus')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [subject, setSubject] = useState('Study materials or AI tutor issue')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try { const raw = localStorage.getItem('codeknot_support_tickets'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })

  useEffect(() => {
    api.support.listTickets().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setTickets(data.map(d => ({
          id: d.id,
          subject: d.subject,
          description: d.message,
          status: d.status === 'RESOLVED' ? 'Resolved' : d.status === 'IN_PROGRESS' ? 'In Review' : 'Submitted',
          createdAt: d.created_at || new Date().toISOString(),
        })))
      }
    }).catch(() => {})
  }, [])

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    const desc = description.trim()
    try {
      const created = await api.support.createTicket({
        category: 'Help & Guides',
        subject: subject.trim(),
        message: desc,
      })
      const ticket: Ticket = {
        id: created.id,
        subject: created.subject,
        description: created.message,
        status: 'Submitted',
        createdAt: created.created_at || new Date().toISOString(),
      }
      setTickets(prev => [ticket, ...prev])
    } catch {
      const ticket: Ticket = {
        id: `TKT-${Date.now()}`,
        subject: subject.trim(),
        description: desc,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
      }
      setTickets(prev => [ticket, ...prev])
      try { localStorage.setItem('codeknot_support_tickets', JSON.stringify([ticket, ...tickets])) } catch {}
    }
    setDescription('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2500)
  }

  const faqs = [
    {
      q: 'Why does the AI Tutor sometimes refuse to answer without PDF sources?',
      a: 'When the tutor cannot find supporting information in your uploaded materials, it may avoid guessing. This helps prevent incorrect or made-up answers. Upload or select the relevant PDF so the tutor can answer using that content.',
    },
    {
      q: 'Which questions can the AI answer?',
      a: 'The AI can answer questions related to your uploaded study materials and supported course content, including explanations, summaries, hints, and practice guidance.',
    },
    {
      q: 'When is an uploaded PDF required?',
      a: 'An uploaded PDF is required for PDF-grounded tutoring, citations, and PDF-based quiz/practice generation. Without relevant material, grounded features may be limited.',
    },
    {
      q: 'How does the AI handle questions outside the uploaded PDF?',
      a: 'If the answer is not available in the selected/uploaded material, the AI should clearly tell you that the information is not found in the source material instead of inventing details.',
    },
    {
      q: 'How are AI answers grounded in relevant information?',
      a: 'CodeKnot retrieves relevant passages from your uploaded documents and uses them to generate responses. When available, citations and page numbers are shown so you can verify the source.',
    },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">CodeKnot / Help & Guides</div>
        <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">Help, Guides & Student Support</h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl">Learn how to use CodeKnot features, understand AI grounding and citations, and submit support requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">Guides</h2>
          <GuideItem title="Syllabus Integration Pipeline – Explore in 3 Steps" isOpen={openGuide === 'syllabus'} onToggle={() => setOpenGuide(openGuide === 'syllabus' ? null : 'syllabus')}>
            <p><strong>Step 1:</strong> Upload your syllabus or course PDF in <em>Study Materials</em>.</p>
            <p><strong>Step 2:</strong> Wait for processing so CodeKnot can read and index the content for tutoring and practice.</p>
            <p><strong>Step 3:</strong> Ask questions in AI Tutor or generate PDF-based quizzes and practice drills using the uploaded material.</p>
          </GuideItem>
          <GuideItem title="AI Tutor Grounding Precision Calibration Guide" isOpen={openGuide === 'grounding'} onToggle={() => setOpenGuide(openGuide === 'grounding' ? null : 'grounding')}>
            <p>The AI Tutor uses your uploaded PDFs and study materials to find relevant passages before answering.</p>
            <p>When supporting sources are available, answers can include citation badges with page numbers and quoted snippets so you can verify the response.</p>
            <p>If the material does not contain enough information, the tutor should clearly state that instead of guessing.</p>
          </GuideItem>
          <GuideItem title="Assessment and Error DNA" isOpen={openGuide === 'error-dna'} onToggle={() => setOpenGuide(openGuide === 'error-dna' ? null : 'error-dna')}>
            <p>CodeKnot analyzes your quiz and practice results to identify mistake patterns, repeated errors, and learning gaps.</p>
            <p>Use <em>Learning Patterns</em>, <em>Topic Mastery</em>, and <em>Assessment History</em> to review strengths, weaknesses, and progress over time.</p>
            <p>Recommendations and practice suggestions are based on your actual performance data.</p>
          </GuideItem>
          <GuideItem title="How to Use Key Features (Step by Step)" isOpen={openGuide === 'features'} onToggle={() => setOpenGuide(openGuide === 'features' ? null : 'features')}>
            <p><strong>Grounded Q&A:</strong> Upload a PDF → open AI Tutor → ask a question → review the answer and citations/page numbers.</p>
            <p><strong>Socratic Hint:</strong> In AI Tutor, choose Hint mode to get step-by-step guidance instead of the final answer; request another hint or reveal the answer when needed.</p>
            <p><strong>Practical Drill:</strong> Go to Practice Setup → select an uploaded PDF → choose a drill mode → generate questions → answer, get instant feedback, and retry.</p>
          </GuideItem>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">FAQ</h2>
          <Card className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button className="w-full flex items-center justify-between gap-3 p-3 text-left bg-slate-50 hover:bg-slate-100" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-[#2563EB]" /> {f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="p-3 text-xs text-slate-600 leading-relaxed bg-white">{f.a}</div>}
              </div>
            ))}
          </Card>

          <h2 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">Submit Support Ticket</h2>
          <Card className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
            {submitted && <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Ticket submitted successfully. You can track its status below.</div>}
            <form onSubmit={submitTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required placeholder="Describe the problem..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm" />
              </div>
              <Button type="submit" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Send className="w-4 h-4" />}>Submit</Button>
            </form>
            <div className="pt-1 space-y-2">
              <p className="text-xs font-bold text-slate-700">Ticket Status</p>
              {tickets.length === 0 ? <p className="text-xs text-slate-500">No tickets submitted yet.</p> : tickets.slice(0,5).map(t => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between"><span className="font-semibold text-slate-800">{t.subject}</span><span className="px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">{t.status}</span></div>
                  <p className="text-[10px] text-slate-400 mt-1">{t.id} • {new Date(t.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}