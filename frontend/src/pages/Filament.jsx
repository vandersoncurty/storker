import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Filament() {
  const [spools, setSpools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadSpools(); }, []);

  const loadSpools = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/filament/spools`);
      setSpools(res.data.spools || []);
    } catch {
      setError('Spoolman offline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Filamento</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
        Spools e filamentos gerenciados pelo Spoolman
      </p>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>
          {error} — <button onClick={loadSpools} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '14px', textDecoration: 'underline' }}>tentar novamente</button>
        </div>
      )}

      {spools.length === 0 ? (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontSize: '14px' }}>Nenhum spool encontrado. Configure o servidor Spoolman em <strong>Configurações → Filamento</strong>.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {spools.map(spool => {
            const filament = spool.filament || {};
            const remaining = spool.remaining_weight != null ? spool.remaining_weight : spool.weight;
            const total = spool.weight || 0;
            const pct = total > 0 ? Math.round((remaining / total) * 100) : 100;
            return (
              <div key={spool.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '15px' }}>{filament.name || filament.material || `Spool #${spool.id}`}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{filament.vendor || '—'}</div>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>#{spool.id}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text)' }}>{remaining}g / {total}g</span>
                    <span style={{ fontWeight: 600, color: pct < 20 ? 'var(--danger)' : 'var(--success)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? 'var(--danger)' : 'var(--success)', borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                </div>
                {filament.color_hex && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: `#${filament.color_hex}`, border: '1px solid var(--border)' }} />
                    {filament.material}{filament.diameter ? ` · ${filament.diameter}mm` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
