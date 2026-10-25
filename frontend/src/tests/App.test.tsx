import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from '../App'

describe('ExamTwin Frontend Application', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.history.pushState({}, 'Test', '/')
  })

  it('renders marketing landing page at root URL with exact brand and heading', () => {
    render(<App />)
    expect(screen.getByText(/Master Complex Syllabi With/i)).toBeInTheDocument()
    expect(screen.getByText(/Strict Cognitive Precision/i)).toBeInTheDocument()
    expect(screen.getByText(/Source-Grounded AI Tutor/i)).toBeInTheDocument()
  })

  it('renders interactive hero preview card with Guyton and Hall textbook citation', () => {
    render(<App />)
    expect(screen.getByText(/MCAT Biology Section IV • Renal Microcirculation Hemodynamics/i)).toBeInTheDocument()
    expect(screen.getByText(/Diagnostic Q-409/i)).toBeInTheDocument()
    expect(screen.getByText(/0.000%/i)).toBeInTheDocument()
  })
})
