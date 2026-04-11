import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            padding: '20px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            {/* Error Icon */}
            <div
              style={{
                fontSize: '64px',
                marginBottom: '24px',
              }}
            >
              ⚠️
            </div>

            {/* Title */}
            <h1
              style={{
                color: 'var(--text-primary)',
                fontSize: '28px',
                fontWeight: 'bold',
                marginBottom: '12px',
              }}
            >
              Something went wrong
            </h1>

            {/* Error Message */}
            <p
              style={{
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                lineHeight: '1.6',
              }}
            >
              An unexpected error occurred. Please try reloading the page or contact support if the problem persists.
            </p>

            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <summary style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    marginTop: '8px',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo && '\n' + this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Action Button */}
            <button
              onClick={this.handleReload}
              style={{
                marginTop: '24px',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
