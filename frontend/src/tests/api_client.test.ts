import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api, getAuthToken, setAuthToken, clearAuthToken, API_BASE_URL, getWsBaseUrl } from '../api/client'

describe('API Client & Token Management', () => {
  beforeEach(() => {
    clearAuthToken()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('manages auth token in memory and sessionStorage', () => {
    expect(getAuthToken()).toBeNull()
    setAuthToken('mock-jwt-token-123')
    expect(getAuthToken()).toBe('mock-jwt-token-123')
    expect(sessionStorage.getItem('examtwin_token')).toBe('mock-jwt-token-123')

    clearAuthToken()
    expect(getAuthToken()).toBeNull()
    expect(sessionStorage.getItem('examtwin_token')).toBeNull()
  })

  it('injects Bearer token into outgoing authenticated requests', async () => {
    setAuthToken('valid-jwt-token')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'std_01',
        external_student_id: 'alice',
        is_active: true,
        total_diagnoses_count: 5,
        topics_tracked_count: 2,
      }),
    })
    global.fetch = mockFetch

    const profile = await api.auth.getMe()
    expect(profile.external_student_id).toBe('alice')
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/auth/me`,
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )

    const callHeaders = mockFetch.mock.calls[0][1].headers as Headers
    expect(callHeaders.get('Authorization')).toBe('Bearer valid-jwt-token')
  })

  it('automatically clears token on 401 Unauthorized response', async () => {
    setAuthToken('expired-jwt-token')

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        detail: 'Invalid or expired authentication token.',
        error_type: 'Unauthorized',
      }),
    })

    await expect(api.auth.getMe()).rejects.toThrow(/Invalid or expired authentication token/)
    expect(getAuthToken()).toBeNull()
  })

  it('correctly maps HTTP base URL to WebSocket URL', () => {
    const wsUrl = getWsBaseUrl()
    expect(wsUrl).toMatch(/^(ws|wss):\/\//)
  })

  it('fetches chat history via api.tutor.getHistory', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'msg_1',
          sender: 'student',
          text: 'What is cryptography?',
          mode: 'qa',
          citations: [],
          grounded: true,
          timestamp: '2026-11-01T18:00:00Z',
        },
      ],
    })

    const history = await api.tutor.getHistory(10)
    expect(history.length).toBe(1)
    expect(history[0].text).toBe('What is cryptography?')
  })
})
