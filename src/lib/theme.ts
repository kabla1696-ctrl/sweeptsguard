// Theme management — dark (default) / light
// Persists to localStorage, applies CSS variables

export type Theme = 'dark' | 'light'

const THEME_KEY = 'sweeptsguard_theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Ignore
  }
  return 'dark'
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Ignore
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (theme === 'light') {
    root.style.setProperty('--background', '#f8f9fa')
    root.style.setProperty('--foreground', '#1a1a2e')
    root.style.setProperty('--card-bg', '#ffffff')
    root.style.setProperty('--card-border', '#e5e7eb')
    root.style.setProperty('--muted', '#6b7280')
    root.style.setProperty('--accent', '#8b5cf6')
    root.style.setProperty('--accent-hover', '#7c3aed')
    root.style.setProperty('--danger', '#ef4444')
    root.style.setProperty('--success', '#22c55e')
    root.style.setProperty('--warning', '#f59e0b')
    root.style.setProperty('--input-bg', '#f3f4f6')
    root.style.setProperty('--input-border', '#d1d5db')
    root.classList.remove('dark')
    root.classList.add('light')
  } else {
    root.style.setProperty('--background', '#0a0a0f')
    root.style.setProperty('--foreground', '#ededed')
    root.style.setProperty('--card-bg', '#1a1a2e')
    root.style.setProperty('--card-border', '#2a2a3e')
    root.style.setProperty('--muted', '#9ca3af')
    root.style.setProperty('--accent', '#8b5cf6')
    root.style.setProperty('--accent-hover', '#a78bfa')
    root.style.setProperty('--danger', '#ef4444')
    root.style.setProperty('--success', '#22c55e')
    root.style.setProperty('--warning', '#f59e0b')
    root.style.setProperty('--input-bg', '#1a1a2e')
    root.style.setProperty('--input-border', '#3a3a4e')
    root.classList.remove('light')
    root.classList.add('dark')
  }
}
