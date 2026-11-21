import React from 'react'
import { Menu, Search, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from '../ui/ThemeToggle'

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
        return 'Learning Patterns & Mistakes'
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
      case '/analytics/mastery':
        return 'Topic Mastery'
      case '/profile':
        return 'Profile & Support'
      case '/settings':
        return 'Profile & Support'
      case '/help':
        return 'Help & Guides'
      default:
        return 'CodeKnot'
    }
  }

  return (
    <header className="h-16 bg-white dark:bg-[#0A1124] border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">CodeKnot</span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <h2 className="text-base font-semibold text-[#14213D] dark:text-white">{getPageTitle(location.pathname)}</h2>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center relative max-w-xs lg:max-w-md w-full mx-4">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search materials, topics, misconceptions..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle size="sm" />

        {/* Notifications */}
        <button
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#2563EB] absolute top-1.5 right-1.5" />
        </button>

        {/* User avatar */}
        {student ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-semibold flex items-center justify-center text-xs shadow-xs">
              {(student.full_name || student.external_student_id || 'S')[0].toUpperCase()}
            </div>
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
