import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Dna,
  Scale,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const SignUpPage: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [examTrack, setExamTrack] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Password validation checks
  const hasMinChars = password.length >= 8
  const hasNumberOrSymbol = /[\d\W]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const isStrong = hasMinChars && hasNumberOrSymbol && hasUppercase

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please provide all required fields.')
      return
    }
    if (!hasMinChars) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }
    if (!agreeTerms) {
      setError('Please accept the Terms of Service and Academic Integrity Pledge.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const username = email.trim().toLowerCase()
      await register({
        username,
        password,
        email: email.trim(),
        full_name: fullName.trim() || undefined,
      })
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try a different email.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4 mb-2">
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

      {/* Main Two-Column Split Layout */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-4">
        {/* Left Column: Platform Values */}
        <div className="lg:col-span-5 p-7 sm:p-8 rounded-2xl bg-[#EEF2F6] border border-slate-200/90 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white text-indigo-700 border border-slate-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>ExamTwin AI Study Engine</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Engineered for High-Stakes Precision
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed">
              Eliminate exam anxiety with deterministic learning twins modeled against your verified syllabus, notes, and textbook PDFs.
            </p>

            {/* Feature Cards */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Zero Hallucination Grounding</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    AI solutions cite page numbers from your uploaded course materials.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100">
                  <Dna className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Cognitive Error DNA™</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Detects cognitive slip traps and recurring reasoning fallacies.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Student Privacy Sandbox</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Your notes and diagnostic data remain private to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign Up Form Card */}
        <div className="lg:col-span-7">
          <div className="p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200 rounded-2xl bg-white space-y-5">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Create your ExamTwin account
              </h1>
              <p className="text-xs text-slate-500">
                Start studying with evidence-grounded AI powered by your actual syllabus materials.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Full Name & Target Exam Track */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Exam Track (Optional)
                  </label>
                  <select
                    value={examTrack}
                    onChange={(e) => setExamTrack(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  >
                    <option value="">Select Target Exam Track</option>
                    <option value="General University Course">General University Course</option>
                    <option value="Computer Science (MCA / BTech)">Computer Science (MCA / BTech)</option>
                    <option value="Medical Examination (USMLE / MCAT)">Medical Examination (USMLE / MCAT)</option>
                    <option value="Law / Bar Examination">Law / Bar Examination</option>
                    <option value="Finance & Accounting">Finance & Accounting</option>
                    <option value="Other Certification">Other Certification</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Row 3: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Confirm Password
                    </label>
                    {passwordsMatch && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        ✓ Passwords match
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirements Indicator */}
              <div className="p-3.5 rounded-xl bg-[#EBF1F6] border border-slate-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    Password Requirements:
                  </span>
                  <span className={isStrong ? 'text-emerald-600 font-extrabold' : 'text-slate-500 font-medium'}>
                    {password.length === 0 ? 'Required' : isStrong ? 'Strong' : 'Moderate'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className={`h-1.5 rounded-full ${hasMinChars ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <div className={`h-1.5 rounded-full ${hasNumberOrSymbol ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <div className={`h-1.5 rounded-full ${hasUppercase ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-medium pt-0.5">
                  <span className={hasMinChars ? 'text-emerald-700' : 'text-slate-500'}>
                    {hasMinChars ? '✓' : '•'} 8+ characters
                  </span>
                  <span className={hasNumberOrSymbol ? 'text-emerald-700' : 'text-slate-500'}>
                    {hasNumberOrSymbol ? '✓' : '•'} 1 number or symbol
                  </span>
                  <span className={hasUppercase ? 'text-emerald-700' : 'text-slate-500'}>
                    {hasUppercase ? '✓' : '•'} 1 uppercase letter
                  </span>
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#4338CA] focus:ring-indigo-500 mt-0.5 shrink-0"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the <Link to="/help" className="text-[#4338CA] font-medium hover:underline">Terms of Service</Link>,{' '}
                  <Link to="/help" className="text-[#4338CA] font-medium hover:underline">Privacy Policy</Link>, and the{' '}
                  <Link to="/help" className="text-[#4338CA] font-medium hover:underline">ExamTwin Academic Integrity Pledge</Link>.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl shadow-md shadow-indigo-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Create Free Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Already have an ExamTwin account?{' '}
                <Link to="/login" className="font-bold text-[#4338CA] hover:underline">
                  Sign In
                </Link>
              </p>
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
