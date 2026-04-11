import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBanner from '../components/ErrorBanner'

describe('ErrorBanner', () => {
    it('renders the message correctly', () => {
        const message = 'Test Error Message'
        render(<ErrorBanner message={message} />)
        expect(screen.getByText(message)).toBeInTheDocument()
    })

    it('renders the retry button when onRetry is provided', () => {
        const onRetry = vi.fn()
        render(<ErrorBanner message="Error" onRetry={onRetry} />)
        const retryButton = screen.getByText('Retry')
        expect(retryButton).toBeInTheDocument()
    })

    it('calls onRetry when the button is clicked', () => {
        const onRetry = vi.fn()
        render(<ErrorBanner message="Error" onRetry={onRetry} />)
        const retryButton = screen.getByText('Retry')
        fireEvent.click(retryButton)
        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('does not render retry button when onRetry is not provided', () => {
        render(<ErrorBanner message="Error" />)
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })
})
