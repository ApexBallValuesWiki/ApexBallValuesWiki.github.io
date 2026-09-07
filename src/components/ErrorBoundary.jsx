import { Component } from 'react';

// ERROR BOUNDARY — if any part of the UI crashes at render time, the site
// shows a calm recovery screen instead of a blank white page. Reload always
// fixes a one-off crash; "back to home" clears any bad route state.

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a trace in the console for debugging — never crash the UI for it.
    console.error('[APEX] UI crash caught by boundary:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = String(this.state.error?.message || this.state.error).slice(0, 200);
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '460px', textAlign: 'center', background: 'rgba(16,16,24,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '32px 28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>💥</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px' }}>Something went wrong</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 6px' }}>
            A part of the page crashed — the rest of the site is fine. Try reloading.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 18px', fontFamily: 'monospace', wordBreak: 'break-word' }}>{message}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5a78ff, #7a5aff)', color: '#fff', fontWeight: 600 }}>
              Reload
            </button>
            <button type="button" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', background: 'transparent', color: '#fff' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
