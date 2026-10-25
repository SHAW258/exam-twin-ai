import React, { useState } from 'react'
import {
  User,
  ShieldCheck,
  Building2,
  Calendar,
  Award,
  Lock,
  Bell,
  Sliders,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'

export const ProfilePage: React.FC = () => {
  const { student } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'model'>('profile')

  const studentName = student?.full_name || 'Marcus Antonio Rivera'
  const studentEmail = student?.email || 'm.rivera@stanford.edu'

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header matching Figma */}
      <div>
        <div className="text-xs text-slate-500 mb-1">
          ExamTwin / Student Suite / Settings / Account & Profile
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Student Profile & Account Settings
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Manage institutional verification, target exam trajectories, telemetry protocols, and high-assurance credential security.
        </p>
      </div>

      {/* Tabs matching Figma */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Profile Information
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> Security & Password
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" /> Notification Preferences
        </button>
        <button
          onClick={() => setActiveTab('model')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'model'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Model & Grounding Parameters
        </button>
      </div>

      {/* User Identity Card (Figma Exact) */}
      <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-200">
            {studentName[0]}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{studentName}</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Student (Stanford SOM)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Candidate ID: <strong>SOM-88914-US</strong> • Headshot synchronized with campus registrar
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" className="text-xs">
          Upload New Photo
        </Button>
      </Card>

      {/* Two Column Grid: Persona & Institutional Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Academic Persona (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Academic Persona & Routing</h3>
            <button className="text-xs font-semibold text-indigo-600 hover:underline">Edit Profile</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Full Legal Name</span>
              <p className="font-semibold text-slate-800">{studentName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Primary Academic Email</span>
              <p className="font-semibold text-slate-800">{studentEmail}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Anticipated Graduation</span>
              <p className="font-semibold text-slate-800">Spring 2026 (MD Track)</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Primary Subject Focus</span>
              <p className="font-semibold text-slate-800">Pre-Clinical BioMed & Physiology</p>
            </div>
            <div className="sm:col-span-2 space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium">Cognitive Learning Cohort</span>
              <p className="font-semibold text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200/60">
                High-Velocity Synthesis / Spaced Retrieval Dynamic
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Institutional Credentials (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Institutional Credentials
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                .edu Verified
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-800">Stanford University School of Medicine</h4>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Direct Shibboleth SAML 2.0 handshake active via stanford.edu. Entitlements match Clinical Medicine Curriculum Group 3.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Domain:</span>
                <span className="font-mono text-slate-800">stanford.edu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Federated:</span>
                <span className="text-slate-800 font-medium">Today, 06:14 AM</span>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full text-xs" leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
            Re-authenticate Institutional Tokens
          </Button>
        </div>
      </div>

      {/* Target Exam Track Banner (Figma Exact) */}
      <div className="p-6 rounded-2xl bg-indigo-950 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Target Exam Track</span>
            <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
              42 DAYS LEFT
            </span>
          </div>
          <h3 className="text-xl font-black">MCAT Medical College Admission Test 2025</h3>
          <p className="text-xs text-indigo-200">
            Target Score: <strong>518 / 528</strong> • Projected Composite: <strong>516 (94th Percentile)</strong>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center shrink-0">
          <div className="p-3 rounded-xl bg-indigo-900/60 border border-indigo-800/80">
            <span className="text-[10px] text-indigo-300 block uppercase font-bold">Error Recovery</span>
            <span className="text-base font-black text-emerald-400">78.4%</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-900/60 border border-indigo-800/80">
            <span className="text-[10px] text-indigo-300 block uppercase font-bold">Fatigue Limit</span>
            <span className="text-base font-black text-amber-300">48 min</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-900/60 border border-indigo-800/80">
            <span className="text-[10px] text-indigo-300 block uppercase font-bold">Calibration</span>
            <span className="text-base font-black text-white">Tier IV</span>
          </div>
        </div>
      </div>
    </div>
  )
}
