import { useState } from 'react';
import api, { API_URL } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`${API_URL}/auth/login`, null, {
        params: { username, password },
      });
      onLogin(resp.data.access_token, resp.data.username, remember);
    } catch {
      setError('Usuário ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-muted)',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: '40px', width: '100%', maxWidth: '400px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ marginBottom: '16px' }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px', color: 'var(--text-h)' }}>Storker</h1>
          <p style={{ color: 'var(--text)', fontSize: '14px', margin: 0 }}>A 3D print Store Manager</p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
            marginBottom: '16px', fontSize: '14px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Usuário</span>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg)' }}
              placeholder="admin" autoFocus />
          </label>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Senha</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg)' }}
              placeholder="admin" />
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            fontSize: '13px', color: 'var(--text)', padding: '4px 0',
          }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '16px', height: '16px', cursor: 'pointer' }} />
            Mantenha-me conectado
          </label>
          <button type="submit" disabled={loading || !username || !password} style={{
            width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: loading || !username || !password ? 'var(--border-h)' : 'var(--accent)',
            color: '#fff', cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '15px', marginTop: '8px',
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
