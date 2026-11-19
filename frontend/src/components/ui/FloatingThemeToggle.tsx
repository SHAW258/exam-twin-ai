import React from 'react'
import { useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export const FloatingThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()

  // Exclude splash screen as explicitly requested
  if (location.pathname === '/') {
    return null
  }

  return (
    <aside
      aria-label="Theme switcher"
      className="fixed bottom-5 right-5 z-50 flex items-center shadow-2xl"
    >
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer select-none active:scale-95 ${
          isDark
            ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-100 border-slate-700/80 shadow-black/40 ring-1 ring-white/10 hover:ring-amber-400/50'
            : 'bg-white/95 hover:bg-slate-50 text-slate-800 border-slate-200 shadow-slate-300/50 ring-1 ring-slate-900/5 hover:ring-indigo-500/50'
        }`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 group-hover:-rotate-12" />
          )}
        </div>
        <span className="text-xs font-semibold tracking-tight pr-1">
          {isDark ? 'Light' : 'Dark'}
        </span>
      </button>
    </aside>
  )
}
