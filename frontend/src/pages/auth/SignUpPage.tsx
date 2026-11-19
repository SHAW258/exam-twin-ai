import { CodeKnotIcon } from '../../components/ui/CodeKnotIcon'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api, setAuthToken } from '../../api/client'

export const SignUpPage: React.FC = () => {
  const { refreshStudent } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [otpCode, setOtpCode] = useState('')
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordChecks = {
    length: password.length >= 8,
    number: /\d/.test(password),
    letter: /[a-zA-Z]/.test(password),
  }
  const isPasswordValid = passwordChecks.length && passwordChecks.number && passwordChecks.letter

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfoMessage(null)

    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setError('Please fill in your full name, username, and email address.')
      return
    }
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await api.auth.requestRegisterOTP({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
      })
      setStep('otp')
      setCooldown(res.resend_cooldown_seconds || 60)
      setDevOtp(res.dev_otp_code || null)
      setInfoMessage(res.message)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code. Please try again.'
      setError(msg.includes('already registered') || msg.includes('already exists') ? msg : msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!otpCode.trim()) {
      setError('Please enter the verification code sent to your email.')
      return
    }
    setIsSubmitting(true)
    try {
      const tokenRes = await api.auth.verifyRegisterOTP({
        email: email.trim().toLowerCase(),
        otp_code: otpCode.trim(),
      })
      setAuthToken(tokenRes.access_token)
      await refreshStudent()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError(null)
    setInfoMessage(null)
    setIsSubmitting(true)
    try {
      const res = await api.auth.resendRegisterOTP({ email: email.trim().toLowerCase() })
      setCooldown(res.resend_cooldown_seconds || 60)
      setDevOtp(res.dev_otp_code || devOtp)
      setInfoMessage(res.message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <nav className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-label="Back to Home">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <CodeKnotIcon className="w-8 h-8" />
              <span className="font-extrabold text-xl tracking-tight text-[#14213D]">
                Code<span className="text-[#2563EB]">Knot</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <ThemeToggle size="sm" />
            <div className="flex items-center gap-1.5">
              <span>Already have an account?</span>
              <Link to="/login" className="font-bold text-[#2563EB] hover:underline">Sign In</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          <section className="p-6 sm:p-10 space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure Student Registration
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14213D] tracking-tight">
                {step === 'details' ? 'Create Your CodeKnot Account' : 'Verify Your Email'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step === 'details'
                  ? 'Create your account to upload study materials, ask the AI Tutor, and track your learning progress.'
                  : `Enter the one-time verification code sent to ${email}. Your account will be activated after verification.`}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {infoMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}
            {step === 'otp' && devOtp && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Development code:</strong> {devOtp} (shown because email delivery is not configured locally)
              </div>
            )}

            {step === 'details' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4" autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="off" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="Enter your full name" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="student_username" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="Enter your email" />
                  </div>
                  <p className="text-[11px] text-slate-500">We will send a one-time verification code to this email.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="Create a password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="Confirm your password" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className={passwordChecks.length ? 'text-teal-700' : ''}>• At least 8 characters</p>
                  <p className={passwordChecks.letter ? 'text-teal-700' : ''}>• Includes a letter</p>
                  <p className={passwordChecks.number ? 'text-teal-700' : ''}>• Includes a number</p>
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5" />
                  <span>I agree to the Terms of Service and Privacy Policy.</span>
                </label>

                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-200 text-sm font-semibold transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Sending verification code...' : 'Continue & Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Verification Code (OTP)</label>
                  <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ''))} inputMode="numeric" maxLength={6} required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-lg tracking-[0.3em] font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="000000" />
                  <p className="text-[11px] text-slate-500">Enter the 6-digit code sent to your email. The code expires in 10 minutes.</p>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-200 text-sm font-semibold transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button type="button" onClick={handleResend} disabled={cooldown > 0 || isSubmitting} className="inline-flex items-center gap-1.5 text-[#2563EB] font-semibold disabled:text-slate-400 hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                  <button type="button" onClick={() => { setStep('details'); setOtpCode(''); setError(null); setInfoMessage(null); }} className="text-slate-600 hover:text-slate-900 font-medium">Edit registration details</button>
                </div>
              </form>
            )}
          </section>

          <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#14213D] to-[#1e3a8a] text-white">
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold leading-tight">A simple, student-focused learning workspace</h2>
              <ul className="space-y-4 text-sm text-blue-100">
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#14B8A6] mt-0.5" /><span>Upload your PDFs and ask questions grounded in your study material.</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#14B8A6] mt-0.5" /><span>Generate quizzes and practice questions from your actual notes and textbooks.</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#14B8A6] mt-0.5" /><span>Track scores, topic mastery, and improvement over time.</span></li>
              </ul>
            </div>
            <p className="text-xs text-blue-200">Email verification helps protect student accounts and ensures important updates reach you.</p>
          </aside>
        </div>
      </main>
    </div>
  )
}
