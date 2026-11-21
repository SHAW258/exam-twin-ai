import { CodeKnotIcon } from '../../components/ui/CodeKnotIcon'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
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
      const profile = await login({ username: username.trim(), password })
      const requestedFrom = (location.state as { from?: { pathname: string } })?.from?.pathname
      const defaultDest = profile?.is_admin ? '/admin' : '/dashboard'
      navigate(requestedFrom || defaultDest, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid student credentials.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-4 mb-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <CodeKnotIcon className="w-8 h-8" />
          <span className="font-extrabold text-xl tracking-tight text-[#14213D] dark:text-white">
            Code<span className="text-[#2563EB] dark:text-blue-400">Knot</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle size="sm" />
          <Link
            to="/"
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
          </Link>
        </div>
      </div>

      {/* Main Sign In Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px] my-4">
        <div className="bg-white dark:bg-[#0F172A] p-7 sm:p-9 shadow-xl shadow-slate-200/60 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-5 transition-colors">
          {/* Top Center Icon & Pill */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-blue-400" />
              CodeKnot Learning Platform
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213D] dark:text-white">
              Welcome back to CodeKnot
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Sign in to access your study materials, tutor chats, practice, and progress.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-200 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address or Username
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-850 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-850 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
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
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="ml-2 text-xs text-slate-600 dark:text-slate-300">Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-500/20 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-900/60 text-blue-100 font-mono">
                <CornerDownLeft className="w-2.5 h-2.5" /> ENTER
              </span>
            </button>
          </form>

          {/* Sign Up Link Container */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Don't have a CodeKnot account yet?{' '}
              <Link to="/register" className="font-bold text-[#2563EB] dark:text-blue-400 hover:underline">
                Create your account free &rarr;
              </Link>
            </p>
          </div>

          {/* Academic Integrity & Privacy Shield Footnote */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100">Privacy & security:</span> Your account and study materials are protected with secure sign-in. Your uploaded content stays linked to your account.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        © 2026 CodeKnot • <Link to="/help" className="hover:underline">Help & Guides</Link>
      </p>
    </div>
  )
}
