import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { SignInPage } from '../pages/auth/SignInPage'
import { SignUpPage } from '../pages/auth/SignUpPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { StudyMaterialsPage } from '../pages/materials/StudyMaterialsPage'
import { AssessmentHistoryPage } from '../pages/assessment/AssessmentHistoryPage'
import { ErrorDNAPage } from '../pages/learning/ErrorDNAPage'
import { AuthProvider } from '../context/AuthContext'
import { api } from '../api/client'

// Wrap components with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  )
}

describe('PHASE 2: Authentication Form Field Verification', () => {
  it('verifies SignInPage fields start completely empty with proper placeholders', () => {
    renderWithProviders(<SignInPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement

    expect(emailInput).toBeInTheDocument()
    expect(emailInput.value).toBe('')
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput.value).toBe('')
    expect(passwordInput.type).toBe('password')
  })

  it('verifies SignUpPage fields start completely empty with proper placeholders', () => {
    renderWithProviders(<SignUpPage />)

    const nameInput = screen.getByPlaceholderText('Enter your full name') as HTMLInputElement
    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('Create a password') as HTMLInputElement
    const confirmInput = screen.getByPlaceholderText('Confirm your password') as HTMLInputElement

    expect(nameInput.value).toBe('')
    expect(emailInput.value).toBe('')
    expect(passwordInput.value).toBe('')
    expect(confirmInput.value).toBe('')
    expect(passwordInput.type).toBe('password')
    expect(confirmInput.type).toBe('password')
  })
})

describe('PHASE 3 & 9: Real Empty States for Zero-Record State', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('verifies DashboardPage renders 0 counts and onboarding state when user has no records', async () => {
    vi.spyOn(api.documents, 'list').mockResolvedValue([])
    vi.spyOn(api.learning, 'getState').mockResolvedValue({
      student_id: 'test_user',
      total_diagnoses: 0,
      review_required_count: 0,
      confirmed_diagnoses_count: 0,
      recurring_errors: [],
      most_affected_topics: [],
      temporal_trend: {
        recent_window_days: 7,
        recent_diagnoses_count: 0,
        historical_diagnoses_count: 0,
        trend: 'STABLE',
      },
      topic_masteries: [],
      revision_recommendations: [],
    })
    vi.spyOn(api.learning, 'getInterventions').mockResolvedValue({
      student_id: 'test_user',
      selected_topic: '',
      selected_strategy: 'FOUNDATIONAL_REVIEW',
      priority_score: 0,
      strategy_rationale: '',
      student_explanation: '',
      is_cold_start: true,
      review_required: false,
      is_uncertain: false,
    })
    vi.spyOn(api.measurements, 'list').mockResolvedValue([])

    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/0 Docs/i)).toBeInTheDocument()
      expect(screen.getByText(/0 Tests/i)).toBeInTheDocument()
      expect(screen.getByText(/0 Topics/i)).toBeInTheDocument()
      expect(screen.getByText(/No Study Materials Uploaded Yet/i)).toBeInTheDocument()
    })
  })

  it('verifies StudyMaterialsPage renders clean empty state when no documents exist', async () => {
    vi.spyOn(api.documents, 'list').mockResolvedValue([])

    renderWithProviders(<StudyMaterialsPage />)

    await waitFor(() => {
      expect(screen.getByText(/No Study Materials Uploaded Yet/i)).toBeInTheDocument()
      expect(screen.getByText(/Upload Your First PDF/i)).toBeInTheDocument()
    })
  })

  it('verifies AssessmentHistoryPage renders clean empty state when no tests exist', async () => {
    vi.spyOn(api.assessments, 'list').mockResolvedValue([])

    renderWithProviders(<AssessmentHistoryPage />)

    await waitFor(() => {
      expect(screen.getByText(/No Assessments Completed Yet/i)).toBeInTheDocument()
    })
  })

  it('verifies ErrorDNAPage renders 0 evaluated and clean empty state when no diagnoses exist', async () => {
    vi.spyOn(api.learning, 'getState').mockResolvedValue({
      student_id: 'test_user',
      total_diagnoses: 0,
      review_required_count: 0,
      confirmed_diagnoses_count: 0,
      recurring_errors: [],
      most_affected_topics: [],
      temporal_trend: {
        recent_window_days: 7,
        recent_diagnoses_count: 0,
        historical_diagnoses_count: 0,
        trend: 'STABLE',
      },
      topic_masteries: [],
      revision_recommendations: [],
    })

    renderWithProviders(<ErrorDNAPage />)

    await waitFor(() => {
      expect(screen.getByText(/No Cognitive Errors Diagnosed Yet/i)).toBeInTheDocument()
    })
  })
})
