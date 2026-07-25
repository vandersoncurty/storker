import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Jobs() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadQueue(); }, []);

  const loadQueue = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/jobs/queue`);
      setQueue(res.data.queue || []);
    } catch {
      setError('Moonraker offline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Fila de Impressão</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
        Fila de impressão do Moonraker
      </p>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>
          {error} — <button onClick={loadQueue} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '14px', textDecoration: 'underline' }}>tentar novamente</button>
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text)', fontWeight: 600, textTransform: 'uppercase' }}>
          <span style={{ flex: 1 }}>Arquivo</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Posição</span>
          <span style={{ flex: 1, textAlign: 'right' }}>Ações</span>
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
            Nenhum job na fila.
          </div>
        ) : (
          queue.map((job, idx) => (
            <div key={idx} style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', fontSize: '14px',
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{ fontWeight: 500, color: 'var(--text-h)' }}>{typeof job === 'string' ? job : job.filename}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--text)' }}>{idx + 1}</div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <button onClick={() => {}} style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)',
                  background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)',
                }}>Remover</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginTop: '16px' }}>
        <p style={{ color: 'var(--text)', fontSize: '14px', margin: 0 }}>
          Para adicionar à fila, use o <strong>Explorador de Arquivos</strong> — clique com botão direito em um projeto e selecione "Enviar para fila".
        </p>
      </div>
    </div>
  );
}
