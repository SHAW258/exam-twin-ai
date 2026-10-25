import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  Building2,
  GraduationCap,
  ArrowLeft,
  CornerDownLeft,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const SignInPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid student credentials.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
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
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </Link>
      </div>

      {/* Main Sign In Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px] my-4">
        <div className="bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200 rounded-2xl space-y-5">
          {/* Top Center Icon & Pill */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#4338CA] text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              ExamTwin AI Study Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back to your Study Twin
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Sign in to access your indexed course materials, tutor conversations, and Error DNA profile.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Email Address or Username
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-xs text-slate-600">Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl shadow-md shadow-indigo-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/60 text-indigo-100 font-mono">
                <CornerDownLeft className="w-2.5 h-2.5" /> ENTER
              </span>
            </button>
          </form>

          {/* Sign Up Link Container */}
          <div className="p-3 rounded-xl bg-slate-50 text-center border border-slate-100">
            <p className="text-xs text-slate-600">
              Don't have an ExamTwin account yet?{' '}
              <Link to="/register" className="font-bold text-[#4338CA] hover:underline">
                Create your account free &rarr;
              </Link>
            </p>
          </div>

          {/* Academic Integrity & Privacy Shield Footnote */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Academic Integrity & Privacy:</span> Protected by secure password hashing and encrypted token authentication. Your study notes and diagnostic states remain private to your account.
            </div>
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
