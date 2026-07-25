import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const categories = [
  { id: 'integrations', label: 'Integrações' },
  { id: 'thingiverse', label: 'Thingiverse' },
  { id: 'store', label: 'Loja' },
  { id: 'printers', label: 'Impressoras' },
];

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState('integrations');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings/`);
      setSettings(res.data);
    } catch (err) {
      setMessage('Erro ao carregar configurações');
      setMessageType('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_URL}/settings/`, settings);
      setMessage('Configurações salvas!');
      setMessageType('success');
    } catch {
      setMessage('Erro ao salvar configurações');
      setMessageType('error');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Configurações</h1>

      <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
        <nav style={{ minWidth: '160px' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 16px',
                marginBottom: '4px',
                textAlign: 'left',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeCategory === cat.id ? 'var(--accent-bg)' : 'transparent',
                color: activeCategory === cat.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: activeCategory === cat.id ? '600' : '400',
                fontSize: '14px',
              }}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
          {activeCategory === 'integrations' && (
            <IntegrationsTab data={settings} onChange={handleChange} />
          )}
          {activeCategory === 'thingiverse' && (
            <ThingiverseTab data={settings?.thingiverse} onChange={(field, v) => handleChange('thingiverse', field, v)} />
          )}
          {activeCategory === 'store' && <StoreTab />}
          {activeCategory === 'printers' && <PrintersTab />}
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '10px 24px',
          cursor: 'pointer',
          borderRadius: '6px',
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontWeight: '600',
        }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {message && (
          <span style={{ color: messageType === 'success' ? '#22c55e' : '#ef4444' }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}

function IntegrationsTab({ data, onChange }) {
  return (
    <div>
      <h2>Integrações</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px' }}>
        Configure as URLs dos serviços externos.
      </p>

      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="Moonraker Server"
          value={data?.moonraker?.server || ''}
          onChange={(v) => onChange('moonraker', 'server', v)}
          placeholder="http://localhost:7125"
        />
        <Field
          label="Spoolman Server"
          value={data?.spoolman?.server || ''}
          onChange={(v) => onChange('spoolman', 'server', v)}
          placeholder="http://localhost:7912"
        />
      </div>
    </div>
  );
}

function ThingiverseTab({ data, onChange }) {
  return (
    <div>
      <h2>Thingiverse</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px' }}>
        Configure sincronização de coleções do Thingiverse.
        Crie uma API key em{' '}
        <a href="https://www.thingiverse.com/apps/create" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
          thingiverse.com/apps/create
        </a>
      </p>

      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="App Token (Thingiverse API Key)"
          value={data?.app_token || ''}
          onChange={(v) => onChange('app_token', v)}
          placeholder="Se vazio, usa THINGIVERSE_APP_TOKEN do .env"
          type="password"
        />
        <Field
          label="Diretório de Download"
          value={data?.download_dir || ''}
          onChange={(v) => onChange('download_dir', v)}
          placeholder="data/thingiverse_models"
        />
        <Field
          label="Intervalo de Sync (minutos, 0 = desligado)"
          type="number"
          value={data?.sync_interval ?? 0}
          onChange={(v) => onChange('sync_interval', parseInt(v) || 0)}
          placeholder="0"
        />
      </div>
    </div>
  );
}

function StoreTab() {
  return (
    <div>
      <h2>Loja</h2>
      <p style={{ color: 'var(--text)' }}>Em breve: configurações da loja (Shopee, etc).</p>
    </div>
  );
}

function PrintersTab() {
  return (
    <div>
      <h2>Impressoras</h2>
      <p style={{ color: 'var(--text)' }}>Em breve: gerenciamento de impressoras.</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'grid', gap: '4px' }}>
      <span style={{ fontSize: '14px', fontWeight: '500' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text-h)',
          fontSize: '14px',
        }}
      />
    </label>
  );
}
