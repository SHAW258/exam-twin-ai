import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { StudentProfile, StudentRegisterPayload, StudentLoginPayload } from '../types/api'
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../api/client'

interface AuthContextType {
  student: StudentProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: StudentLoginPayload) => Promise<void>
  register: (payload: StudentRegisterPayload) => Promise<void>
  logout: () => void
  refreshStudent: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [token, setTokenState] = useState<string | null>(getAuthToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshStudent = useCallback(async () => {
    const currentToken = getAuthToken()
    if (!currentToken) {
      setStudent(null)
      setIsLoading(false)
      return
    }

    try {
      const profile = await api.auth.getMe()
      setStudent(profile)
    } catch (err) {
      console.warn('Failed to rehydrate student profile:', err)
      clearAuthToken()
      setTokenState(null)
      setStudent(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStudent()
  }, [refreshStudent])

  const login = async (payload: StudentLoginPayload) => {
    setIsLoading(true)
    try {
      const res = await api.auth.login(payload)
      setTokenState(res.access_token)
      // fetch profile
      const profile = await api.auth.getMe()
      setStudent(profile)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: StudentRegisterPayload) => {
    setIsLoading(true)
    try {
      await api.auth.register(payload)
      // auto-login upon registration
      await login({ username: payload.username, password: payload.password })
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    api.auth.logout()
    setTokenState(null)
    setStudent(null)
  }

  return (
    <AuthContext.Provider
      value={{
        student,
        token,
        isAuthenticated: !!student && !!token,
        isLoading,
        login,
        register,
        logout,
        refreshStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
