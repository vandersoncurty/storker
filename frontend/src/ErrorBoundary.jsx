import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, background: 'var(--bg)',
          padding: '32px',
        }}>
          <div style={{ maxWidth: '520px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Algo deu errado</h2>
            <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '16px', fontFamily: 'monospace' }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </p>
            <button onClick={() => this.setState({ error: null })} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
            }}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
