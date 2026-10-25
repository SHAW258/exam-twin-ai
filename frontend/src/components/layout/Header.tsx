import React from 'react'
import { Menu, Search, Bell, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'

interface HeaderProps {
  onToggleSidebar: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { student } = useAuth()
  const location = useLocation()

  // Format breadcrumb title
  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/dashboard':
        return 'Student Dashboard'
      case '/tutor':
        return 'AI Tutor Workspace'
      case '/tutor/focus':
        return 'Distraction-Free Tutor'
      case '/error-dna':
        return 'Error DNA & Misconceptions'
      case '/materials':
        return 'Study Materials Library'
      case '/practice':
        return 'Practice Setup'
      case '/quiz':
        return 'Interactive Quiz'
      case '/assessments':
        return 'Assessment History'
      case '/analytics':
        return 'Learning Analytics'
      case '/analytics/comparison':
        return 'Pre/Post-Test Gain Comparison'
      case '/analytics/mastery':
        return 'Topic Mastery Breakdown'
      case '/analytics/interventions':
        return 'Adaptive Pedagogical Interventions'
      case '/profile':
        return 'Student Profile'
      case '/settings':
        return 'Account Settings'
      case '/help':
        return 'Help & Documentation'
      default:
        return 'ExamTwin AI'
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">ExamTwin</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h2 className="text-base font-semibold text-slate-900">{getPageTitle(location.pathname)}</h2>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center relative max-w-xs lg:max-w-md w-full mx-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search materials, topics, misconceptions..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Quick status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/50">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Active Prep</span>
        </div>

        {/* Notifications */}
        <button
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-1.5 right-1.5" />
        </button>

        {/* User avatar */}
        {student ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center text-xs shadow-xs">
              {(student.full_name || student.external_student_id || 'S')[0].toUpperCase()}
            </div>
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
