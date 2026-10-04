import React from 'react';

/**
 * React error boundary — catches render errors in any child component tree.
 * Prevents a single broken chart from crashing the entire dashboard.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error(info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-lg p-6 text-sm"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--text-muted)',
            minHeight: 120,
          }}
        >
          <p className="font-medium mb-1" style={{ color: 'var(--danger)' }}>
            Chart failed to render
          </p>
          <p className="text-xs text-center max-w-xs">
            {this.state.error?.message || 'Unknown render error'}
          </p>
          <button
            className="mt-3 text-xs px-3 py-1 rounded"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
