import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'

export const ProfilePage: React.FC = () => {
  const { student, logout } = useAuth()

  const studentName = student?.full_name || student?.external_student_id || 'Student'
  const studentEmail = student?.email || 'Not provided'
  const studentId = student?.external_student_id || student?.id || 'N/A'

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div>
        <div className="text-xs text-slate-500 mb-1">
          ExamTwin / Student Suite / Settings / Account & Profile
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Student Profile & Account Settings
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Manage your authenticated identity, security credentials, and course telemetry settings.
        </p>
      </div>

      {/* User Identity Card */}
      <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-200">
            {studentName[0].toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{studentName}</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Student ID: <strong className="font-mono">{studentId}</strong>
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={logout} className="text-xs text-rose-600 hover:text-rose-700">
          Sign Out
        </Button>
      </Card>

      {/* Two Column Grid: Persona & Account Security */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Academic Persona (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Account Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Full Name</span>
              <p className="font-semibold text-slate-800">{studentName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Registered Email</span>
              <p className="font-semibold text-slate-800">{studentEmail}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">External Student ID</span>
              <p className="font-semibold text-slate-800 font-mono">{studentId}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Account Status</span>
              <p className="font-semibold text-emerald-700">Active (JWT Bearer Token)</p>
            </div>
          </div>
        </div>

        {/* Right Column: Security Controls (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Security & Data Isolation
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Encrypted
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-800">Tenant Isolation Active</h4>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Your study documents, vector chunks, and assessment records are cryptographically verified and bound to your student identifier.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Hash Algorithm:</span>
                <span className="font-mono text-slate-800">scrypt (RFC 7914)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Token Standard:</span>
                <span className="text-slate-800 font-medium">RFC 7519 HS256 JWT</span>
              </div>
            </div>
          </div>

          <Link to="/help">
            <Button variant="outline" size="sm" className="w-full text-xs">
              View Privacy & Academic Integrity Policy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
