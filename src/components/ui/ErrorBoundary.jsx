import { Component } from 'react';
import { MdErrorOutline, MdRefresh } from 'react-icons/md';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state" style={{ padding: '60px 24px' }}>
          <MdErrorOutline style={{ color: 'var(--danger)', fontSize: 48, opacity: 1 }} />
          <h3>Something went wrong</h3>
          <p>An unexpected error occurred. Please try again or navigate to another page.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-primary btn-sm" onClick={this.reset}>
              <MdRefresh /> Try Again
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
