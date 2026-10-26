import type {
  StudentRegisterPayload,
  StudentLoginPayload,
  AuthTokenResponse,
  StudentProfile,
  DocumentListItem,
  DocumentUploadResponse,
  TutorAskPayload,
  TutorAskResponse,
  DiagnosisPayload,
  DiagnosisResponse,
  ErrorDNASummary,
  InterventionRecommendation,
  AssessmentSubmissionPayload,
  AssessmentResponse,
  MeasurementPayload,
  MeasurementResponse,
  ApiErrorResponse,
} from '../types/api'

// Base URL configuration: reads from environment or defaults to relative path for Vite dev proxy / tunnels
export const API_BASE_URL =
  typeof import.meta.env.VITE_API_BASE_URL === 'string'
    ? import.meta.env.VITE_API_BASE_URL
    : ''

// Token management: Session-isolated memory cache with sessionStorage rehydration
// SessionStorage clears immediately on tab close, reducing exposure compared to persistent localStorage.
let inMemoryToken: string | null = null

export const setAuthToken = (token: string | null): void => {
  inMemoryToken = token
  if (token) {
    try {
      sessionStorage.setItem('examtwin_token', token)
    } catch {
      // storage unavailable / sandboxed
    }
  } else {
    try {
      sessionStorage.removeItem('examtwin_token')
    } catch {
      // ignore
    }
  }
}

export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken
  try {
    const stored = sessionStorage.getItem('examtwin_token')
    if (stored) {
      inMemoryToken = stored
      return stored
    }
  } catch {
    // ignore
  }
  return null
}

export const clearAuthToken = (): void => {
  setAuthToken(null)
}

/**
 * Custom API client fetch wrapper with Bearer token injection,
 * JSON parsing, and normalized problem detail error handling.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData || options.body instanceof Blob)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle unauthorized or expired tokens automatically
  if (response.status === 401) {
    clearAuthToken()
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`
    let errorType = 'HttpError'
    try {
      const errJson = (await response.json()) as ApiErrorResponse
      if (errJson.detail) {
        if (typeof errJson.detail === 'string') {
          errorDetail = errJson.detail
        } else if (Array.isArray(errJson.detail)) {
          errorDetail = errJson.detail.map((e) => `${e.loc?.join('.') || 'param'}: ${e.msg}`).join(', ')
        }
      }
      if (errJson.error_type) {
        errorType = errJson.error_type
      }
    } catch {
      // fallback to status text
      errorDetail = response.statusText || errorDetail
    }

    const error = new Error(errorDetail) as Error & { status: number; errorType: string }
    error.status = response.status
    error.errorType = errorType
    throw error
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

export const api = {
  // Authentication
  auth: {
    register: (payload: StudentRegisterPayload): Promise<StudentProfile> =>
      request<StudentProfile>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    login: async (payload: StudentLoginPayload): Promise<AuthTokenResponse> => {
      const res = await request<AuthTokenResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setAuthToken(res.access_token)
      return res
    },

    getMe: (): Promise<StudentProfile> => request<StudentProfile>('/api/v1/auth/me'),

    logout: (): void => {
      clearAuthToken()
    },
  },

  // Document Management
  documents: {
    upload: async (file: File): Promise<DocumentUploadResponse> => {
      const token = getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/pdf',
        'x-filename': encodeURIComponent(file.name),
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
        method: 'POST',
        headers,
        body: file,
      })

      if (!response.ok) {
        let errMessage = 'PDF Upload failed'
        try {
          const errData = await response.json()
          errMessage = errData.detail || errMessage
        } catch {
          // ignore
        }
        const error = new Error(errMessage) as Error & { status: number }
        error.status = response.status
        throw error
      }

      return response.json() as Promise<DocumentUploadResponse>
    },

    list: (): Promise<DocumentListItem[]> => request<DocumentListItem[]>('/api/v1/documents'),

    getById: (id: string): Promise<DocumentListItem> =>
      request<DocumentListItem>(`/api/v1/documents/${encodeURIComponent(id)}`),
  },

  // AI Tutor
  tutor: {
    ask: (payload: TutorAskPayload): Promise<TutorAskResponse> =>
      request<TutorAskResponse>('/api/v1/tutor/ask', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Diagnostics & Misconception Analysis
  diagnosis: {
    diagnose: (payload: DiagnosisPayload): Promise<DiagnosisResponse> =>
      request<DiagnosisResponse>('/api/v1/diagnosis', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Learning State & Interventions
  learning: {
    getState: (): Promise<ErrorDNASummary> => request<ErrorDNASummary>('/api/v1/learning/state'),

    getInterventions: (): Promise<InterventionRecommendation> =>
      request<InterventionRecommendation>('/api/v1/learning/interventions'),
  },

  // Assessments & Quizzes
  assessments: {
    submit: (payload: AssessmentSubmissionPayload): Promise<AssessmentResponse> =>
      request<AssessmentResponse>('/api/v1/assessments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    list: (topic?: string): Promise<AssessmentResponse[]> => {
      const url = topic
        ? `/api/v1/assessments?topic=${encodeURIComponent(topic)}`
        : '/api/v1/assessments'
      return request<AssessmentResponse[]>(url)
    },

    getById: (id: string): Promise<AssessmentResponse> =>
      request<AssessmentResponse>(`/api/v1/assessments/${encodeURIComponent(id)}`),
  },

  // Learning Measurements & Gains
  measurements: {
    create: (payload: MeasurementPayload): Promise<MeasurementResponse> =>
      request<MeasurementResponse>('/api/v1/learning/measurements', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getById: (id: string): Promise<MeasurementResponse> =>
      request<MeasurementResponse>(`/api/v1/learning/measurements/${encodeURIComponent(id)}`),

    list: (topic?: string): Promise<MeasurementResponse[]> => {
      const url = topic
        ? `/api/v1/learning/measurements?topic=${encodeURIComponent(topic)}`
        : '/api/v1/learning/measurements'
      return request<MeasurementResponse[]>(url)
    },
  },
}
