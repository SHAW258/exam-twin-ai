import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Mail,
  ShieldCheck,
  Send,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Building2,
  HelpCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'

type ResetPreviewState = 'default' | 'sent' | 'error'

export const ForgotPasswordPage: React.FC = () => {
  const [previewState, setPreviewState] = useState<ResetPreviewState>('default')
  const [email, setEmail] = useState('alexandra.chen@stanford.edu')
  const [isLoading, setIsLoading] = useState(false)

  const handleStateChange = (state: ResetPreviewState) => {
    setPreviewState(state)
    setIsLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setPreviewState('sent')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header matching Figma: Logo on Left, State Switcher in Center, Back Link on Right */}
      <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4338CA] flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Exam<span className="text-[#4338CA]">Twin</span>
          </span>
        </Link>

        {/* Figma Exact State Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 rounded-full px-3 py-1 text-xs">
          <button
            type="button"
            onClick={() => handleStateChange('default')}
            className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${
              previewState === 'default'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Default Input
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('sent')}
            className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${
              previewState === 'sent'
                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Email Sent
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('error')}
            className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${
              previewState === 'error'
                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Unregistered Error
          </button>
        </div>

        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[500px] my-6">
        <div className="bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200 rounded-2xl space-y-6">
          {/* Card Header matching Figma: Lock icon in rounded square + End-to-End Encrypted badge */}
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4338CA] flex items-center justify-center shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              End-to-End Encrypted
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Reset your password
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter the email address associated with your ExamTwin student account, and we will send you a secure recovery link.
            </p>
          </div>

          {previewState === 'sent' ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Recovery Instructions Sent</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an ExamTwin account matches <strong>{email}</strong>, you will receive password reset instructions within 2 minutes.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 bg-[#4338CA] text-white rounded-lg text-xs font-semibold hover:bg-[#3730A3]"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {previewState === 'error' && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>No ExamTwin account found matching this institutional email.</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Student or Institutional Email
                  </label>
                  <span className="text-[10px] text-slate-400">
                    e.g. .edu / school domain
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alexandra.chen@stanford.edu"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl shadow-md shadow-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Sending Instructions...' : 'Send Reset Instructions'}</span>
              </button>
            </form>
          )}

          {/* Links Below Form */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <Link to="/login" className="font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              &larr; Return to Sign In
            </Link>
            <Link to="/help" className="font-semibold text-[#4338CA] hover:underline flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Need help?
            </Link>
          </div>

          {/* Security Notice matching Figma */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <p className="font-bold text-slate-800">ExamTwin security notice:</p>
            <p>
              We will never solicit your password or multi-factor credentials via email or SMS.
            </p>
          </div>
        </div>

        {/* Institutional Trust Badges matching Figma */}
        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            940+ Universities Integrated
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            FERPA & SOC-2 Type II Compliant
          </span>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <p className="text-center text-xs text-slate-400 py-2">
        © 2025 ExamTwin • <Link to="/help" className="hover:underline">Pledge</Link> • <Link to="/help" className="hover:underline">Privacy</Link> • <Link to="/help" className="hover:underline">Terms</Link>
      </p>
    </div>
  )
}
