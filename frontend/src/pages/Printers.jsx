import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Printers() {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [s, st] = await Promise.all([
        axios.get(`${API_URL}/printers/status`),
        axios.get(`${API_URL}/printers/stats`),
      ]);
      setStatus(s.data);
      setStats(st.data);
    } catch {
      setError('Moonraker offline');
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = async (cmd) => {
    try {
      await axios.post(`${API_URL}/printers/print/${cmd}`);
      loadData();
    } catch {
      setError(`Erro ao ${cmd}`);
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Impressoras</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Status e controle da impressora 3D</p>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>
          {error} — <button onClick={loadData} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '14px', textDecoration: 'underline' }}>tentar novamente</button>
        </div>
      )}

      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Estado" value={status.state} color={status.state === 'ready' ? 'var(--success)' : 'var(--warning)'} />
          <StatCard label="Hostname" value={status.hostname} color="var(--text-h)" />
          <StatCard label="Firmware" value={status.firmware_version} color="var(--text-h)" />
        </div>
      )}

      {stats && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Impressão Atual</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Estado</span>
              <span style={{ fontWeight: 600, color: stats.state === 'printing' ? 'var(--accent)' : 'var(--text-h)' }}>{stats.state || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Arquivo</span>
              <span style={{ fontWeight: 600, color: 'var(--text-h)', textAlign: 'right', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.filename || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Duração</span>
              <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{stats.print_duration ? `${(stats.print_duration / 60).toFixed(1)} min` : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--text)' }}>Filamento usado</span>
              <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{stats.filament_used ? `${(stats.filament_used / 1000).toFixed(1)}m` : '-'}</span>
            </div>
          </div>

          {stats.state === 'printing' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => sendCommand('pause')} style={btnStyle('var(--warning)')}>Pausar</button>
              <button onClick={() => sendCommand('cancel')} style={btnStyle('var(--danger)')}>Cancelar</button>
            </div>
          )}
          {stats.state === 'paused' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => sendCommand('resume')} style={btnStyle('var(--success)')}>Retomar</button>
              <button onClick={() => sendCommand('cancel')} style={btnStyle('var(--danger)')}>Cancelar</button>
            </div>
          )}
        </div>
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
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function btnStyle(color) {
  return {
    padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}`,
    background: 'transparent', cursor: 'pointer', fontSize: '13px', color, fontWeight: 600,
  };
}
