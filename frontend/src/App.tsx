import { GlobalApiLoader } from './components/ui/GlobalApiLoader'
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Public & Auth Pages
import { MarketingLandingPage } from './pages/public/MarketingLandingPage'
import { SignInPage } from './pages/auth/SignInPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'

// Main Learning Experience Pages
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { AITutorWorkspacePage } from './pages/tutor/AITutorWorkspacePage'
import { DistractionFreeTutorPage } from './pages/tutor/DistractionFreeTutorPage'
import { ErrorDNAPage } from './pages/learning/ErrorDNAPage'
import { StudyMaterialsPage } from './pages/materials/StudyMaterialsPage'

// Practice & Assessment Pages
import { PracticeSetupPage } from './pages/assessment/PracticeSetupPage'
import { QuizPage } from './pages/assessment/QuizPage'
import { AssessmentHistoryPage } from './pages/assessment/AssessmentHistoryPage'
import { AssessmentResultsPage } from './pages/assessment/AssessmentResultsPage'
import { AnswerReviewPage } from './pages/assessment/AnswerReviewPage'

// Learning Analytics Pages
import { LearningAnalyticsPage } from './pages/analytics/LearningAnalyticsPage'
import { PrePostComparisonPage } from './pages/analytics/PrePostComparisonPage'
import { TopicMasteryPage } from './pages/analytics/TopicMasteryPage'
import { AdaptiveInterventionsPage } from './pages/analytics/AdaptiveInterventionsPage'

// Account & Support Pages
import { ProfilePage } from './pages/account/ProfilePage'
import { HelpPage } from './pages/support/HelpPage'

// Global Application States & Error Boundaries
import { GlobalErrorPage } from './pages/error/GlobalErrorPage'

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <GlobalApiLoader />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MarketingLandingPage />} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/register" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Distraction-Free Tutor Fullscreen Route */}
          <Route
            path="/tutor/focus"
            element={
              <ProtectedRoute>
                <DistractionFreeTutorPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Workspace AppLayout Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Group B: Main Learning Experience */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tutor" element={<AITutorWorkspacePage />} />
            <Route path="/error-dna" element={<ErrorDNAPage />} />
            <Route path="/materials" element={<StudyMaterialsPage />} />

            {/* Group C: Practice & Assessment */}
            <Route path="/practice" element={<PracticeSetupPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/assessments" element={<AssessmentHistoryPage />} />
            <Route path="/assessments/results" element={<AssessmentResultsPage />} />
            <Route path="/assessments/review" element={<AnswerReviewPage />} />

            {/* Group D: Learning Analytics */}
            <Route path="/analytics" element={<LearningAnalyticsPage />} />
            <Route path="/analytics/comparison" element={<PrePostComparisonPage />} />
            <Route path="/analytics/mastery" element={<TopicMasteryPage />} />
            <Route path="/analytics/interventions" element={<AdaptiveInterventionsPage />} />

            {/* Group E: Account & Support */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<ProfilePage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          {/* Error & Fallback Routes */}
          <Route path="/error" element={<GlobalErrorPage />} />
          <Route path="*" element={<GlobalErrorPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
