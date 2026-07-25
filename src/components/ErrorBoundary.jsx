import { Component } from 'react';

/**
 * Top-level crash guard: if any page throws during render, visitors get a
 * friendly recovery screen (with a way back home / reload) instead of a
 * blank white page. Kept intentionally dependency-free so it can never
 * itself fail.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    const isChunkLoadError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      String(error).includes('dynamically imported module');

    if (isChunkLoadError && typeof window !== 'undefined') {
      const hasReloaded = sessionStorage.getItem('apex-chunk-reload-v1');
      if (!hasReloaded) {
        sessionStorage.setItem('apex-chunk-reload-v1', 'true');
        window.location.reload();
        return { error: null };
      }
    }
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Surface crashes in the console for bug reports; keep rendering.
    console.error('[APEX] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ error: null, errorInfo: null });
    window.location.assign(import.meta.env.BASE_URL || '/');
  };

  handleReset = () => {
    this.setState({ error: null, errorInfo: null, copied: false });
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const details = `[APEX Error Details]\nException: ${String(error || '')}\nStack Trace:\n${errorInfo?.componentStack || ''}`;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(details);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error, errorInfo, copied } = this.state;

    return (
      <main
        className="page-shell"
        style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: '32px 16px' }}
      >
        <div className="card" style={{ padding: '2rem', maxWidth: 640, width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ marginTop: 0, fontSize: '1.4rem', color: 'var(--danger, #ff4d4d)' }}>Diagnostic Error Boundary</h1>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', margin: 0 }}>
            An unexpected runtime exception was caught. Component stack trace details are recorded below:
          </p>

          <div style={{ background: 'var(--bg-elevated, #12121c)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 10px)', padding: 14, overflowX: 'auto', maxHeight: 220, fontSize: '0.78rem', fontFamily: 'monospace' }}>
            <strong style={{ color: '#ff6b6b', display: 'block', marginBottom: 8 }}>{String(error || 'Unknown Error')}</strong>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-dim, #bfbfbf)' }}>
              {errorInfo?.componentStack || 'No component stack trace available.'}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <button type="button" className="badge filled" onClick={this.handleCopyDetails} style={{ cursor: 'pointer' }}>
              {copied ? '✓ Copied Details!' : '📋 Copy Error Details'}
            </button>
            <button type="button" className="badge" onClick={this.handleReset} style={{ cursor: 'pointer', border: '1px solid var(--border-strong)' }}>
              ⚡ Reset Component
            </button>
            <button type="button" className="badge dim" onClick={this.handleReload} style={{ cursor: 'pointer' }}>
              Reload page
            </button>
            <button type="button" className="badge dim" onClick={this.handleHome} style={{ cursor: 'pointer' }}>
              Go home
            </button>
          </div>
        </div>
      </main>
    );
  }
}
