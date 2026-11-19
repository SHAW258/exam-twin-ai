import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useTheme } from '../context/ThemeContext'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const TestComponent = () => {
  const { theme, isDark, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <span data-testid="is-dark">{isDark ? 'true' : 'false'}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle
      </button>
      <ThemeToggle showLabel />
    </div>
  )
}

describe('Global Theme Management System', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to dark mode for all UIs on initial load', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-value').textContent).toBe('dark')
    expect(screen.getByTestId('is-dark').textContent).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles from dark mode to light mode and back cleanly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByTestId('toggle-btn')

    // Initial is dark
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Switch to light
    fireEvent.click(toggleBtn)
    expect(screen.getByTestId('theme-value').textContent).toBe('light')
    expect(screen.getByTestId('is-dark').textContent).toBe('false')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('codeknot_theme')).toBe('light')

    // Switch back to dark
    fireEvent.click(toggleBtn)
    expect(screen.getByTestId('theme-value').textContent).toBe('dark')
    expect(screen.getByTestId('is-dark').textContent).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('codeknot_theme')).toBe('dark')
  })

  it('renders ThemeToggle button with accessible aria labels', () => {
    render(
      <ThemeProvider>
        <ThemeToggle showLabel />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: /switch to light mode/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })
})
