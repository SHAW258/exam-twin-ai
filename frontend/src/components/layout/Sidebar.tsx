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
  CheckCircle2,
  Sparkles,
  User,
  HelpCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { CodeKnotIcon } from '../ui/CodeKnotIcon'
import { ThemeToggle } from '../ui/ThemeToggle'

interface SidebarProps {
  onNavigate?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { student, logout } = useAuth()

  const navGroups = [
    ...(student?.is_admin
      ? [
          {
            title: 'ADMINISTRATION',
            items: [
              { name: 'Admin Console & DB', path: '/admin', icon: ShieldCheck },
            ],
          },
        ]
      : []),
    {
      title: 'LEARNING EXPERIENCE',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'AI Tutor Chat', path: '/tutor', icon: Bot },
        { name: 'Distraction-Free Tutor', path: '/tutor/focus', icon: Maximize2 },
        { name: 'Learning Patterns', path: '/error-dna', icon: Dna },
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
        { name: 'Topic Mastery', path: '/analytics/mastery', icon: CheckCircle2 },
      ],
    },
    {
      title: 'ACCOUNT & SUPPORT',
      items: [
        { name: 'Profile & Support', path: '/profile', icon: User },
        { name: 'Help & Guides', path: '/help', icon: HelpCircle },
      ],
    },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-[#0A1124] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 gap-3">
        <CodeKnotIcon className="w-9 h-9 shrink-0" />
        <div>
          <h1 className="font-bold text-[#14213D] dark:text-white tracking-tight text-base flex items-center gap-1.5">
            CodeKnot <span className="text-[10px] font-semibold bg-[#E0F2FE] dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 px-1.5 py-0.5 rounded border border-[#BFDBFE] dark:border-blue-800">AI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Smart study & exam prep</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider px-3 mb-2">
              {group.title}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path !== '/assessments'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
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

      {/* Quick Theme Switcher in Sidebar */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Theme</span>
        <ThemeToggle size="sm" showLabel />
      </div>

      {/* User Footer Card */}
      {student && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070D1E]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-300 font-semibold flex items-center justify-center text-xs shrink-0">
                {(student.full_name || student.external_student_id || 'S')[0].toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{student.full_name || student.external_student_id}</span>
                  {student.is_admin && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 shrink-0">
                      Admin
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{student.email || 'Student Account'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
