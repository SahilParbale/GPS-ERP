import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="content-area" style={{ padding: '40px' }}>
          <div className="section-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '36px', textAlign: 'center' }}>
            <AlertTriangle size={42} color="#dc2626" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              Screen Display Notice
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={this.handleReset}
              >
                <RefreshCw size={14} />
                <span>Reload Screen</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
