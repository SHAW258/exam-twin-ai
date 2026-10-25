import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'

// ==========================================
// Loading Spinner & Skeletons
// ==========================================
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; message?: string }> = ({
  size = 'md',
  message,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-3 text-slate-500">
      <div
        className={`${sizeMap[size]} rounded-full border-slate-200 border-t-indigo-600 animate-spin`}
      />
      {message && <p className="text-sm font-medium text-slate-600 animate-pulse">{message}</p>}
    </div>
  )
}

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} />
)

// ==========================================
// Empty States
// ==========================================
export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 my-4">
    {icon && <div className="text-slate-400 mb-3">{icon}</div>}
    <h4 className="text-base font-semibold text-slate-800">{title}</h4>
    <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
    {action && <div>{action}</div>}
  </div>
)

// ==========================================
// Alert / Notification Banner
// ==========================================
export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  onClose?: () => void
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, message, onClose }) => {
  const styles = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
    },
  }

  const current = styles[type]

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${current.bg} my-3`}>
      <div className="shrink-0 mt-0.5">{current.icon}</div>
      <div className="flex-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        <p className="mt-0.5">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded hover:bg-black/5 text-slate-400 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ==========================================
// Modal Dialog
// ==========================================
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className={`w-full ${maxWidth} bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
