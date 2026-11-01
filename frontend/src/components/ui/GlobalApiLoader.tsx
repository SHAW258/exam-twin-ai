import React, { useEffect, useState } from 'react'
import { subscribeToLoading } from '../../api/client'
import { Loader2, Server } from 'lucide-react'

export const GlobalApiLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeToLoading((loading) => {
      setIsLoading(loading)
      if (!loading) {
        setElapsedSeconds(0)
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isLoading) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      setElapsedSeconds(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLoading])

  if (!isLoading) return null

  const isColdStart = elapsedSeconds >= 5

  return (
    <>
      {/* Top Thin Glowing Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden bg-indigo-100">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 animate-[pulse_1.5s_ease-in-out_infinite] w-full" />
      </div>

      {/* Floating Status Pill if request takes >= 1.2s */}
      {elapsedSeconds >= 1 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-xl backdrop-blur-md border border-slate-700/50">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            <span>
              {isColdStart
                ? `Waking up cloud server (cold start takes ~30s)... [${elapsedSeconds}s]`
                : 'Connecting to ExamTwin AI server...'}
            </span>
            {isColdStart && (
              <Server className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
            )}
          </div>
        </div>
      )}
    </>
  )
}
