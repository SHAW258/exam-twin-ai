import React from 'react'
import { BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'indigo' | 'slate'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }

  const variantStyles = {
    default: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/60',
    error: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    indigo: 'bg-indigo-600 text-white',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export interface CitationBadgeProps {
  grounded: boolean
  citationsCount?: number
  className?: string
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ grounded, citationsCount = 0, className = '' }) => {
  if (grounded && citationsCount > 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
        <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Grounded in Course Material</span>
        <span className="ml-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
          {citationsCount} {citationsCount === 1 ? 'citation' : 'citations'}
        </span>
      </span>
    )
  }

  if (grounded) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Grounded in Course Material</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 shadow-2xs ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
      <span>General Academic Knowledge</span>
    </span>
  )
}

export interface GainBadgeProps {
  gain: number | null
  classification: string
}

export const GainBadge: React.FC<GainBadgeProps> = ({ gain, classification }) => {
  if (classification === 'PERFECT_PRETEST') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        Mastered Prior to Intervention (100% Pre-Test)
      </span>
    )
  }

  if (gain === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        N/A
      </span>
    )
  }

  const percentage = (gain * 100).toFixed(1)

  if (gain >= 0.5) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        +{percentage}% High Gain
      </span>
    )
  }

  if (gain > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        +{percentage}% Moderate Gain
      </span>
    )
  }

  if (gain === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        0.0% No Change
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      {percentage}% Performance Drop
    </span>
  )
}
