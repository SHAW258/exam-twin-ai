import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md',
}) => {
  const { isDark, toggleTheme } = useTheme()

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'px-3 py-2 text-sm',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4 sm:w-4.5 sm:h-4.5',
    lg: 'w-5 h-5',
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer select-none border ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-400 border-slate-700/80 shadow-xs hover:border-slate-600'
          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs hover:border-slate-300'
      } ${sizeClasses[size]} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className={`${iconSizes[size]} text-amber-400 animate-in fade-in zoom-in duration-200`} />
        ) : (
          <Moon className={`${iconSizes[size]} text-indigo-600 animate-in fade-in zoom-in duration-200`} />
        )}
      </div>

      {showLabel && (
        <span className="font-semibold text-xs tracking-tight">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  )
}
