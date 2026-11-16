import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from '../App'

describe('CodeKnot Frontend Application', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.history.pushState({}, 'Test', '/')
  })

  it('renders marketing landing page at root URL with exact brand and heading', () => {
    render(<App />)
    expect(screen.getByText(/Learn Better with/i)).toBeInTheDocument()
    expect(screen.getAllByText(/CodeKnot/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Upload your PDFs/i)).toBeInTheDocument()
  })

  it('renders interactive hero preview with grounded learning example', () => {
    render(<App />)
    expect(screen.getByText(/Grounded Study Workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/Practice Question/i)).toBeInTheDocument()
  })
})
