import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  ArrowLeft,
  Search,
  LayoutDashboard,
  ShieldAlert,
  Clock,
  ServerCrash,
  Radio,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export const GlobalErrorPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'404' | '403' | 'expired' | '500'>('404')
  const [copied, setCopied] = useState(false)

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify({
      incident_session_id: 'twin-prd-e7c10b',
      error_type: activeTab,
      routing_host: 'twin-mesh.node-08.internal',
      timestamp: new Date().toISOString(),
    }))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const errorStates = {
    '404': {
      code: '404',
      badge: 'MISSING CORPUS ENTITY',
      badgeColor: 'text-rose-600 bg-rose-50 border-rose-200',
      title: 'Page Not Found in ExamTwin Corpus',
      description:
        'The syllabus resource, quiz session, or telemetry audit URL you requested could not be located. It may have been relocated, restructured during curricular reindexing, or archived.',
      signature: '#404-NOT-FOUND',
      path: '/student/assessment/drill-99?mode=synthetic_adaptive',
      routing: 'Unresolved URI',
    },
    '403': {
      code: '403',
      badge: 'ACCESS FORBIDDEN • STUDENT ISOLATION',
      badgeColor: 'text-amber-600 bg-amber-50 border-amber-200',
      title: 'Access Restricted by Security Shield',
      description:
        'You do not have authorization to inspect or measure assessments belonging to another student account. Multi-tenant privacy safeguards prevent cross-student enumeration.',
      signature: '#403-FORBIDDEN-ISOLATION',
      path: '/api/v1/assessments/doc-student-bob-921',
      routing: 'Security Gate Rejection',
    },
    'expired': {
      code: '401',
      badge: 'BEARER TOKEN EXPIRED',
      badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      title: 'Session Invalidation • Re-Auth Required',
      description:
        'Your 60-minute JWT bearer token has expired. Your in-progress telemetry answers have been saved in session storage to ensure zero data loss.',
      signature: '#401-JWT-EXPIRED',
      path: '/api/v1/auth/me',
      routing: 'Token Revocation',
    },
    '500': {
      code: '500',
      badge: 'INTERNAL SERVER TIMEOUT',
      badgeColor: 'text-rose-600 bg-rose-50 border-rose-200',
      title: 'Vector Pipeline Internal Interruption',
      description:
        'The LLM grounding gateway or HNSW vector database experienced a temporary socket timeout during chunk embedding synthesis. All user inputs are safely buffered.',
      signature: '#500-INTERNAL-TIMEOUT',
      path: '/api/v1/tutor/ask',
      routing: 'Pipeline Error',
    },
  }

  const current = errorStates[activeTab]

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header with Back Link matching Figma */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">ExamTwin</span>
        </Link>
        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </Link>
      </div>

      <div className="max-w-4xl mx-auto w-full my-6 space-y-6">
        {/* State Selector Tabs matching Figma */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: '404', label: '1. 404 Not Found' },
            { id: '403', label: '2. 403 Access Denied' },
            { id: 'expired', label: '3. Session Expired' },
            { id: '500', label: '4. 500 / API Timeout' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as '404' | '403' | 'expired' | '500')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            • EXAMTWIN DIAGNOSTICS • OPERATIONAL CORE
          </span>
        </div>

        {/* Main Error Card (Figma Exact) */}
        <Card className="p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 rounded-3xl bg-white space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Radar Visual Target Box (5 cols) */}
            <div className="md:col-span-5 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-indigo-200 flex items-center justify-center bg-indigo-50/40">
                <div className="w-20 h-20 rounded-full border border-indigo-300 flex items-center justify-center bg-white shadow-2xs">
                  <Radio className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
                <span className="absolute top-1 right-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-2xs">
                  {current.code}
                </span>
              </div>

              <div className="w-full text-left p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">System Routing:</span>
                  <span className="font-bold text-rose-600">{current.routing}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Host:</span>
                  <span className="font-mono text-slate-700">twin-mesh.node-08.internal</span>
                </div>
              </div>
            </div>

            {/* Right: Error Details & Telemetry (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${current.badgeColor}`}>
                • {current.badge}
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {current.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {current.description}
              </p>

              {/* Telemetry Signature Code Box matching Figma */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-sans font-bold">Error Telemetry Signature</span>
                  <span className="text-rose-600 font-bold">{current.signature}</span>
                </div>
                <div className="text-slate-700 text-[11px] break-all pt-1">
                  {current.path}
                </div>
              </div>

              {/* Action Buttons matching Figma */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/dashboard">
                  <Button
                    variant="primary"
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-xs font-semibold py-2.5 px-4"
                    leftIcon={<LayoutDashboard className="w-4 h-4" />}
                  >
                    Return to Dashboard
                  </Button>
                </Link>
                <Link to="/materials">
                  <Button
                    variant="outline"
                    className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 px-4"
                    leftIcon={<Search className="w-4 h-4" />}
                  >
                    Search Study Materials
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Incident Session Footer Card matching Figma */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">Incident Session ID: twin-prd-e7c10b</span>
              <p className="text-[11px] text-slate-400">Client IP routing via Cloudflare Edge Edge-AMS1</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyPayload}
                className="font-bold text-indigo-600 hover:underline flex items-center gap-1 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy Telemetry Payload'}
              </button>
              <span className="text-slate-300">|</span>
              <Link to="/help" className="font-bold text-slate-700 hover:underline flex items-center gap-1 text-xs">
                Exam Support Desk <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <p className="text-center text-[11px] text-slate-400 py-2">
        © 2025 ExamTwin • <Link to="/help" className="hover:underline">Pledge</Link> • <Link to="/help" className="hover:underline">Privacy</Link> • <Link to="/help" className="hover:underline">Terms</Link>
      </p>
    </div>
  )
}
