import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const categories = [
  { id: 'integrations', label: 'Integrações' },
  { id: 'store', label: 'Loja' },
  { id: 'printers', label: 'Impressoras' },
];

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState('integrations');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings/`);
      setSettings(res.data);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      integrations: { ...prev.integrations, [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_URL}/settings/`, settings);
      setMessage({ type: 'success', text: 'Configurações salvas!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
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
            <IntegrationsTab
              data={settings?.integrations}
              onChange={handleIntegrationsChange}
            />
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
          <span style={{ color: message.type === 'success' ? '#22c55e' : '#ef4444' }}>
            {message.text}
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
          label="Moonraker URL"
          value={data?.moonraker_url || ''}
          onChange={(v) => onChange('moonraker_url', v)}
          placeholder="http://localhost:7125"
        />
        <Field
          label="Spoolman URL"
          value={data?.spoolman_url || ''}
          onChange={(v) => onChange('spoolman_url', v)}
          placeholder="http://localhost:7912"
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
