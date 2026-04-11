import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders the application without crashing', () => {
    renderApp()
    // The app should mount without throwing
    expect(document.body).toBeTruthy()
  })

  it('renders navigation links', () => {
    renderApp()
    // The navbar should display the standard nav labels
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByText('Insights')).toBeInTheDocument()
  })
})
