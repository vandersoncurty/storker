import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

function fmtTime(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Printers() {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([
        axios.get(`${API_URL}/printers/status`),
        axios.get(`${API_URL}/printers/stats`),
      ]);
      setStatus(s.data);
      setStats(st.data);
      setError(null);
    } catch {
      setError('Moonraker offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 3000);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const sendCommand = async (cmd) => {
    setSending(cmd);
    try {
      await axios.post(`${API_URL}/printers/print/${cmd}`);
      setTimeout(loadData, 500);
    } catch {
      setError(`Erro ao ${cmd}`);
    } finally {
      setSending(null);
    }
  };

  if (loading) return <p>Carregando...</p>;

  const isPrinting = stats?.state === 'printing';
  const isPaused = stats?.state === 'paused';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Impressoras</h1>
        <button onClick={loadData} style={{
          padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'var(--bg)', cursor: 'pointer', fontSize: '12px', color: 'var(--text)',
        }}>Atualizar</button>
      </div>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Status e controle da impressora 3D</p>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', marginBottom: '16px', fontSize: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={loadData} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '14px', textDecoration: 'underline' }}>tentar novamente</button>
        </div>
      )}

      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <StatCard label="Estado" value={status.state} color={status.state === 'ready' ? 'var(--success)' : isPrinting ? 'var(--accent)' : 'var(--warning)'} />
          <StatCard label="Hostname" value={status.hostname} color="var(--text-h)" />
          <StatCard label="Firmware" value={status.firmware_version || '—'} color="var(--text-h)" />
        </div>
      )}

      {stats && (
        <>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-h)' }}>
                {isPrinting ? 'Imprimindo' : isPaused ? 'Pausado' : stats.filename ? stats.state : 'Impressão Atual'}
              </h3>
              {(isPrinting || isPaused) && (
                <span style={{
                  fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                  background: isPrinting ? 'rgba(124,58,237,0.1)' : 'rgba(245,158,11,0.1)',
                  color: isPrinting ? 'var(--accent)' : 'var(--warning)',
                  fontWeight: '600',
                }}>
                  {isPrinting ? `${stats.progress ?? 0}%` : 'Pausado'}
                </span>
              )}
            </div>

            {isPrinting && stats.progress != null && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(stats.progress, 100)}%`, height: '100%',
                    background: 'var(--accent)', borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              <InfoRow label="Arquivo" value={stats.filename || '-'} />
              <InfoRow label="Duração" value={fmtTime(stats.print_duration)} />
              <InfoRow label="Total estimado" value={fmtTime(stats.total_duration)} />
              <InfoRow label="Filamento" value={stats.filament_used ? `${(stats.filament_used / 1000).toFixed(2)}m` : '-'} />

              {stats.extruder_temp != null && (
                <InfoRow
                  label="Extrusora"
                  value={`${stats.extruder_temp.toFixed(1)}°C${stats.extruder_target ? ` / ${stats.extruder_target}°C` : ''}`}
                  color={stats.extruder_target > 0 && Math.abs(stats.extruder_temp - stats.extruder_target) < 3 ? 'var(--success)' : 'var(--text-h)'}
                />
              )}
              {stats.bed_temp != null && (
                <InfoRow
                  label="Mesa"
                  value={`${stats.bed_temp.toFixed(1)}°C${stats.bed_target ? ` / ${stats.bed_target}°C` : ''}`}
                  color={stats.bed_target > 0 && Math.abs(stats.bed_temp - stats.bed_target) < 3 ? 'var(--success)' : 'var(--text-h)'}
                />
              )}
              {stats.position && (
                <InfoRow label="Posição" value={`X${stats.position.x.toFixed(1)} Y${stats.position.y.toFixed(1)} Z${stats.position.z.toFixed(1)}`} />
              )}
            </div>

            {(isPrinting || isPaused) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                {isPrinting && (
                  <button onClick={() => sendCommand('pause')} disabled={sending} style={btnStyle('var(--warning)', sending === 'pause')}>
                    {sending === 'pause' ? '...' : 'Pausar'}
                  </button>
                )}
                {isPaused && (
                  <button onClick={() => sendCommand('resume')} disabled={sending} style={btnStyle('var(--success)', sending === 'resume')}>
                    {sending === 'resume' ? '...' : 'Retomar'}
                  </button>
                )}
                <button onClick={() => sendCommand('cancel')} disabled={sending} style={btnStyle('var(--danger)', sending === 'cancel')}>
                  {sending === 'cancel' ? '...' : 'Cancelar impressão'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <p style={{ color: 'var(--text)', fontSize: '14px', margin: 0 }}>
          Configure o servidor Moonraker em <strong>Configurações → Impressoras</strong>.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '600' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'var(--text-h)', textAlign: 'right', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function btnStyle(color, disabled) {
  return {
    padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}`,
    background: disabled ? 'rgba(0,0,0,0.05)' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px', color: disabled ? 'var(--text)' : color, fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
  };
}
