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
} from 'lucide-react'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setIsSent(true)
    }, 600)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-4 mb-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4338CA] flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Exam<span className="text-[#4338CA]">Twin</span>
          </span>
        </Link>

        <Link
          to="/login"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[500px] my-6">
        <div className="bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4338CA] flex items-center justify-center border border-indigo-100">
              <Lock className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Secure Password Recovery
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Reset your password
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter the email address associated with your ExamTwin account. We'll send instructions to reset your password.
            </p>
          </div>

          {isSent ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Recovery Instructions Sent</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists for <strong>{email}</strong>, a secure password reset link has been dispatched.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4338CA] hover:underline"
                >
                  Return to Sign In &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl shadow-md shadow-indigo-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
              >
                <span>{isLoading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-slate-100">
            <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Remember your password? Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <p className="text-center text-xs text-slate-400 py-2">
        © 2025 ExamTwin • <Link to="/help" className="hover:underline">Help & Docs</Link>
      </p>
    </div>
  )
}
