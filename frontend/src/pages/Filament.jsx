import { useState, useEffect } from 'react';
import api, { API_URL } from '../api';

function fmt(v) {
  if (v == null) return '—';
  if (typeof v === 'number') {
    if (v % 1 === 0) return v.toLocaleString('pt-BR');
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
}

export default function Filament() {
  const [spools, setSpools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadSpools(); }, []);

  const loadSpools = async () => {
    try {
      setError(null);
      const res = await api.get(`${API_URL}/filament/spools`);
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
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {spools.map(spool => {
            const f = spool.filament || {};
            const hasTracking = spool.remaining_weight != null;
            const remaining = hasTracking ? spool.remaining_weight : (spool.weight || 0);
            const total = spool.initial_weight || spool.weight || 0;
            const pct = total > 0 && hasTracking ? Math.round((remaining / total) * 100) : null;
            const used = hasTracking ? Math.round((total - remaining) * 10) / 10 : null;

            return (
              <div key={spool.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      {f.color_hex && (
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: `#${f.color_hex}`, border: '1px solid var(--border)', flexShrink: 0 }} />
                      )}
                      <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name || f.material || `Spool #${spool.id}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                      {f.vendor?.name || '—'}{f.material ? ` · ${f.material}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text)', flexShrink: 0, marginLeft: '8px' }}>#{spool.id}</span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text)' }}>
                      {remaining}g / {total}g
                      {used != null && <span style={{ color: 'var(--text)', marginLeft: '8px' }}>({used}g usados)</span>}
                    </span>
                    {pct != null ? (
                      <span style={{ fontWeight: 600, color: pct < 20 ? 'var(--danger)' : pct < 50 ? 'var(--warning)' : 'var(--success)' }}>{pct}%</span>
                    ) : (
                      <span style={{ color: 'var(--text)', fontSize: '12px' }}>uso não monitorado</span>
                    )}
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                    {pct != null && (
                      <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? 'var(--danger)' : pct < 50 ? 'var(--warning)' : 'var(--success)', borderRadius: '3px', transition: 'width 0.3s' }} />
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  {f.diameter != null && (
                    <>
                      <span>Diâmetro</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>{f.diameter}mm</span>
                    </>
                  )}
                  {f.density != null && (
                    <>
                      <span>Densidade</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>{f.density} g/cm³</span>
                    </>
                  )}
                  {f.price != null && (
                    <>
                      <span>Preço / kg</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>R$ {fmt(f.price)}</span>
                    </>
                  )}
                  {spool.price != null && (
                    <>
                      <span>Preço do spool</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>R$ {fmt(spool.price)}</span>
                    </>
                  )}
                  {f.settings_extruder_temp != null && (
                    <>
                      <span>Temp. extrusora</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>{f.settings_extruder_temp}°C</span>
                    </>
                  )}
                  {f.settings_bed_temp != null && (
                    <>
                      <span>Temp. mesa</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>{f.settings_bed_temp}°C</span>
                    </>
                  )}
                  {spool.registered && (
                    <>
                      <span>Registrado</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-h)' }}>{new Date(spool.registered).toLocaleDateString('pt-BR')}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
