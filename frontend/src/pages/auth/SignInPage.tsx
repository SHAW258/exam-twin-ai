import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  CornerDownLeft,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

type DevPreviewState = 'standard' | 'error' | 'submitting'

export const SignInPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Dev preview state switcher matching Figma top bar
  const [previewState, setPreviewState] = useState<DevPreviewState>('standard')

  const [username, setUsername] = useState('student@university.edu')
  const [password, setPassword] = useState('ExamTwinCognitive#2025')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Synchronize state when user clicks dev preview switcher
  const handleStateChange = (state: DevPreviewState) => {
    setPreviewState(state)
    if (state === 'standard') {
      setError(null)
      setUsername('student@university.edu')
      setPassword('ExamTwinCognitive#2025')
      setIsSubmitting(false)
    } else if (state === 'error') {
      setError('Invalid student credentials. Please verify your email or contact campus IT.')
      setIsSubmitting(false)
    } else if (state === 'submitting') {
      setError(null)
      setIsSubmitting(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Please enter your student email or username and password.')
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
      {/* Top Header matching Figma: Logo on Left, Dev Preview in Center, Back Link on Right */}
      <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4338CA] flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Exam<span className="text-[#4338CA]">Twin</span>
          </span>
        </Link>

        {/* Figma Exact Dev Preview State Switcher */}
        <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/90 rounded-full px-3 py-1 text-xs">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mr-1">
            DEV PREVIEW:
          </span>
          <button
            type="button"
            onClick={() => handleStateChange('standard')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              previewState === 'standard'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            1. Standard
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('error')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              previewState === 'error'
                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            2. Error State
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('submitting')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              previewState === 'submitting'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            3. Submitting
          </button>
        </div>

        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </Link>
      </div>

      {/* Main Sign In Card Container matching Figma */}
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

          {/* Institutional Session Banner with Live Pulse */}
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Institutional Session</span>
                <p className="text-[10px] text-emerald-700">Synced with Canvas & Blackboard API</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine v4.2 Live
            </span>
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
                  Institutional or Work Email
                </label>
                <span className="text-[10px] text-slate-400">
                  e.g. .edu, .ac.uk, .org
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="student@university.edu"
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
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
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
                <span className="ml-2 text-xs text-slate-600">Remember me on this browser</span>
              </label>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                30-day session
              </span>
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

          {/* Enterprise Single Sign-On */}
          <div className="space-y-3 pt-1">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[10px] font-bold tracking-wider text-slate-400">
                  ENTERPRISE SINGLE SIGN-ON
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Campus Shibboleth</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Google Scholar</span>
              </button>
            </div>
          </div>

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
              <span className="font-bold text-slate-800">Academic Integrity & Privacy Shield:</span> Protected by 256-bit student data privacy encryption. Your study notes, uploaded exam papers, and Error DNA profiles remain strictly isolated from public LLM training datasets.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <p className="text-center text-xs text-slate-400 py-2">
        © 2025 ExamTwin • <Link to="/help" className="hover:underline">Pledge</Link> • <Link to="/help" className="hover:underline">Privacy</Link> • <Link to="/help" className="hover:underline">Terms</Link>
      </p>
    </div>
  )
}
