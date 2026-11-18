import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from '../App'

describe('CodeKnot Frontend Application', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.history.pushState({}, 'Test', '/')
  })

  it('renders SplashScreen at root URL with brand identity and headline', () => {
    render(<App />)
    // The SplashScreen renders "Code" and "Knot" as separate spans – combine check
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Knot')).toBeInTheDocument()
    expect(
      screen.getByText(/AI-Powered Examination/i)
    ).toBeInTheDocument()
  })

  it('renders Enter Workspace and Explore Docs CTA buttons on the splash screen', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Enter Workspace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Explore System Architecture/i })).toBeInTheDocument()
  })
})
