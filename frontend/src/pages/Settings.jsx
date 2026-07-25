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
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Gerencie as configurações do sistema</p>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: messageType === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: messageType === 'success' ? 'var(--success)' : 'var(--danger)',
          marginBottom: '16px', fontSize: '14px', fontWeight: '500',
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px' }}>
        <nav style={{ minWidth: '200px' }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px',
                  border: 'none', borderBottom: '1px solid var(--border)',
                  textAlign: 'left', cursor: 'pointer', fontSize: '14px',
                  background: activeCategory === cat.id ? 'var(--accent-bg)' : 'var(--bg)',
                  color: activeCategory === cat.id ? 'var(--accent)' : 'var(--text)',
                  fontWeight: activeCategory === cat.id ? '600' : '400',
                  transition: 'all 0.15s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </nav>

        <div style={{
          flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '24px',
        }}>
          {activeCategory === 'integrations' && (
            <IntegrationsTab data={settings} onChange={handleChange} />
          )}
          {activeCategory === 'thingiverse' && (
            <ThingiverseTab data={settings?.thingiverse} onChange={(field, v) => handleChange('thingiverse', field, v)} />
          )}
          {activeCategory === 'store' && (
            <StoreTab data={settings?.store} onChange={(field, v) => handleChange('store', field, v)} />
          )}
          {activeCategory === 'printers' && (
            <PrintersTab data={settings?.printers} onChange={(field, v) => handleChange('printers', field, v)} />
          )}

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '10px 24px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: saving ? 'var(--border-h)' : 'var(--accent)',
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '600', fontSize: '14px',
            }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Integrações</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
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
  const [collections, setCollections] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [newCollectionId, setNewCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [loadingCol, setLoadingCol] = useState(true);

  const loadCollections = async () => {
    try {
      setLoadingCol(true);
      const [colRes, dlRes] = await Promise.all([
        axios.get(`${API_URL}/thingiverse/collections`),
        axios.get(`${API_URL}/thingiverse/downloads`),
      ]);
      setCollections(colRes.data);
      setDownloads(dlRes.data);
    } catch {
      // silently fail
    } finally {
      setLoadingCol(false);
    }
  };

  useEffect(() => { loadCollections(); }, []);

  const handleAddCollection = async () => {
    if (!newCollectionId) return;
    try {
      await axios.post(`${API_URL}/thingiverse/collections`, {
        collection_id: parseInt(newCollectionId),
        name: newCollectionName || '',
      });
      setNewCollectionId('');
      setNewCollectionName('');
      loadCollections();
    } catch {
      alert('Erro ao adicionar collection. Verifique o ID.');
    }
  };

  const handleRemoveCollection = async (collectionId) => {
    try {
      await axios.delete(`${API_URL}/thingiverse/collections/${collectionId}`);
      loadCollections();
    } catch {
      alert('Erro ao remover collection.');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await axios.post(`${API_URL}/thingiverse/sync`);
      setSyncResult(res.data);
      loadCollections();
    } catch {
      alert('Erro ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCollection = async (collectionId) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await axios.post(`${API_URL}/thingiverse/sync/${collectionId}`);
      setSyncResult(res.data);
      loadCollections();
    } catch {
      alert('Erro ao sincronizar collection.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Thingiverse</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Configure sincronização de coleções do Thingiverse.
        Crie uma API key em{' '}
        <a href="https://www.thingiverse.com/apps/create" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
          thingiverse.com/apps/create
        </a>
      </p>

      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px', marginBottom: '24px' }}>
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

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--text-h)' }}>Coleções</h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="number"
            value={newCollectionId}
            onChange={e => setNewCollectionId(e.target.value)}
            placeholder="Collection ID"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', width: '140px' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.outline = 'none'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <input
            type="text"
            value={newCollectionName}
            onChange={e => setNewCollectionName(e.target.value)}
            placeholder="Nome (opcional)"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', flex: 1 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.outline = 'none'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <button onClick={handleAddCollection} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
          }}>
            Adicionar
          </button>
        </div>

        {loadingCol ? (
          <p style={{ color: 'var(--text)', fontSize: '14px' }}>Carregando...</p>
        ) : collections.length === 0 ? (
          <p style={{ color: 'var(--text)', fontSize: '14px', fontStyle: 'italic' }}>Nenhuma collection configurada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            {collections.map(col => (
              <div key={col.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{col.name || `Collection #${col.collection_id}`}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text)', marginLeft: '8px' }}>ID: {col.collection_id}</span>
                  {col.last_synced_at && (
                    <span style={{ fontSize: '12px', color: 'var(--text)', marginLeft: '8px' }}>
                      · Sincronizado: {new Date(col.last_synced_at).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleSyncCollection(col.collection_id)} disabled={syncing} style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg)', cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '12px', color: 'var(--accent)',
                  }}>
                    Sincronizar
                  </button>
                  <button onClick={() => handleRemoveCollection(col.collection_id)} style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)',
                    background: 'var(--bg)', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)',
                  }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={handleSyncAll} disabled={syncing} style={{
            padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: syncing ? 'var(--border-h)' : 'var(--accent)',
            color: '#fff', cursor: syncing ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px',
          }}>
            {syncing ? 'Sincronizando...' : 'Sincronizar todas'}
          </button>
          {syncResult && (
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
              {syncResult.total_downloaded} baixados, {syncResult.total_skipped} ignorados, {syncResult.total_failed} falhas
            </span>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-h)' }}>Histórico de downloads</h4>
          {downloads.length === 0 ? (
            <p style={{ color: 'var(--text)', fontSize: '13px', fontStyle: 'italic' }}>Nenhum download ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
              {downloads.map(dl => (
                <div key={dl.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: 'var(--bg-muted, #f9f9f9)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', fontSize: '13px',
                }}>
                  <span style={{ color: 'var(--text-h)' }}>{dl.thing_name}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                      color: dl.status === 'DOWNLOADED' ? 'var(--success)' : 'var(--danger)',
                      background: dl.status === 'DOWNLOADED' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    }}>
                      {dl.status === 'DOWNLOADED' ? 'OK' : 'Falha'}
                    </span>
                    <span style={{ color: 'var(--text)', fontSize: '12px' }}>
                      {new Date(dl.synced_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreTab({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Loja</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Configure os dados da sua loja.
      </p>
      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="Nome da Loja"
          value={data?.name || 'Minha Loja 3D'}
          onChange={(v) => onChange('name', v)}
          placeholder="Minha Loja 3D"
        />
        <Field
          label="Moeda"
          value={data?.currency || 'BRL'}
          onChange={(v) => onChange('currency', v)}
          placeholder="BRL"
        />
        <Field
          label="Taxa de imposto (%)"
          type="number"
          value={data?.tax_rate ?? 0}
          onChange={(v) => onChange('tax_rate', parseFloat(v) || 0)}
          placeholder="0"
        />
        <Field
          label="Margem de lucro padrão (%)"
          type="number"
          value={data?.markup_percentage ?? 30}
          onChange={(v) => onChange('markup_percentage', parseFloat(v) || 0)}
          placeholder="30"
        />
      </div>
    </div>
  );
}

function PrintersTab({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Impressoras</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Configure a impressora padrão. Futuramente será possível gerenciar múltiplas impressoras.
      </p>
      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="Servidor Moonraker"
          value={data?.default_server || 'http://localhost:7125'}
          onChange={(v) => onChange('default_server', v)}
          placeholder="http://localhost:7125"
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', fontSize: '14px',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.outline = 'none'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
    </label>
  );
}
