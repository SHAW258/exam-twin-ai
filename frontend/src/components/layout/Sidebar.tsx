import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  Maximize2,
  Dna,
  BookOpen,
  FileQuestion,
  History,
  BarChart3,
  GitCompare,
  CheckCircle2,
  Sparkles,
  User,
  Settings,
  HelpCircle,
  LogOut,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  onNavigate?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { student, logout } = useAuth()

  const navGroups = [
    {
      title: 'LEARNING EXPERIENCE',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'AI Tutor Chat', path: '/tutor', icon: Bot },
        { name: 'Distraction-Free Tutor', path: '/tutor/focus', icon: Maximize2 },
        { name: 'Error DNA', path: '/error-dna', icon: Dna },
        { name: 'Study Materials', path: '/materials', icon: BookOpen },
      ],
    },
    {
      title: 'PRACTICE & ASSESSMENT',
      items: [
        { name: 'Practice Setup', path: '/practice', icon: FileQuestion },
        { name: 'Quiz Interface', path: '/quiz', icon: Sparkles },
        { name: 'Assessment History', path: '/assessments', icon: History },
      ],
    },
    {
      title: 'LEARNING ANALYTICS',
      items: [
        { name: 'Analytics Overview', path: '/analytics', icon: BarChart3 },
        { name: 'Pre/Post Comparison', path: '/analytics/comparison', icon: GitCompare },
        { name: 'Topic Mastery', path: '/analytics/mastery', icon: CheckCircle2 },
        { name: 'Adaptive Interventions', path: '/analytics/interventions', icon: Sparkles },
      ],
    },
    {
      title: 'ACCOUNT & SUPPORT',
      items: [
        { name: 'Student Profile', path: '/profile', icon: User },
        { name: 'Account Settings', path: '/settings', icon: Settings },
        { name: 'Help & Docs', path: '/help', icon: HelpCircle },
      ],
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 tracking-tight text-base flex items-center gap-1.5">
            ExamTwin <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Error-Aware Prep</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-[11px] font-bold text-slate-400 tracking-wider px-3 mb-2">
              {group.title}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Card */}
      {student && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs shrink-0">
                {(student.full_name || student.external_student_id || 'S')[0].toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {student.full_name || student.external_student_id}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{student.email || 'Student Account'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
