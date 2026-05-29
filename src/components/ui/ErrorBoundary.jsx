import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches unhandled React rendering errors
 * Displays a user-friendly fallback UI instead of white-screening the app.
 * Wrap around <Outlet /> in layouts to isolate page-level crashes.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In dev, log for debugging. In prod, send to error reporting (e.g. Sentry).
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.25rem',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--error-bg, #FEF2F2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'scaleIn 0.3s var(--ease-spring)',
          }}>
            <AlertTriangle size={36} color="var(--error, #EF4444)" />
          </div>
          <h2 style={{
            fontSize: '1.375rem', fontWeight: 800,
            color: 'var(--text-primary, #0F172A)',
            margin: 0,
          }}>
            Something went wrong
          </h2>
          <p style={{
            color: 'var(--text-secondary, #64748B)',
            maxWidth: 420, margin: 0, lineHeight: 1.6,
            fontSize: '0.9375rem',
          }}>
            An unexpected error occurred. You can try again or reload the page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              fontSize: '0.75rem', color: 'var(--error, #EF4444)',
              background: 'var(--error-bg, #FEF2F2)', padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md, 0.5rem)', maxWidth: '100%',
              overflow: 'auto', textAlign: 'left', border: '1px solid var(--error-border, #FCA5A5)',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              onClick={this.handleRetry}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
