import { useState, useEffect } from 'react';
import api, { API_URL } from '../api';

const categories = [
  { id: 'thingiverse', label: 'Thingiverse' },
  { id: 'store', label: 'Loja' },
  { id: 'printers', label: 'Impressoras' },
  { id: 'filament', label: 'Filamento' },
  { id: 'costs', label: 'Custos' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'users', label: 'Usuários' },
];

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState('thingiverse');
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
      const res = await api.get(`${API_URL}/settings/`);
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
      await api.put(`${API_URL}/settings/`, settings);
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
          {activeCategory === 'thingiverse' && (
            <ThingiverseTab data={settings?.thingiverse} onChange={(field, v) => handleChange('thingiverse', field, v)} />
          )}
          {activeCategory === 'store' && (
            <StoreTab data={settings?.store} onChange={(field, v) => handleChange('store', field, v)} />
          )}
          {activeCategory === 'printers' && (
            <PrintersTab data={settings?.printers} onChange={(field, v) => handleChange('printers', field, v)} />
          )}
          {activeCategory === 'filament' && (
            <FilamentTab data={settings?.spoolman} onChange={(field, v) => handleChange('spoolman', field, v)} />
          )}
          {activeCategory === 'costs' && (
            <CostsTab data={settings?.costs} onChange={(field, v) => handleChange('costs', field, v)} />
          )}
          {activeCategory === 'finance' && (
            <FinanceTab data={settings?.finance} onChange={(field, v) => handleChange('finance', field, v)} />
          )}
          {activeCategory === 'users' && <UsersTab />}

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
        api.get(`${API_URL}/thingiverse/collections`),
        api.get(`${API_URL}/thingiverse/downloads`),
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
      await api.post(`${API_URL}/thingiverse/collections`, {
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
      await api.delete(`${API_URL}/thingiverse/collections/${collectionId}`);
      loadCollections();
    } catch {
      alert('Erro ao remover collection.');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post(`${API_URL}/thingiverse/sync`);
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
      const res = await api.post(`${API_URL}/thingiverse/sync/${collectionId}`);
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

function FilamentTab({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Filamento</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Configure a integração com o Spoolman para gerenciar filamentos.
      </p>
      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="Servidor Spoolman"
          value={data?.server || 'http://localhost:7912'}
          onChange={(v) => onChange('server', v)}
          placeholder="http://localhost:7912"
        />
      </div>
    </div>
  );
}

function CostsTab({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Custos Fixos</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Configure os custos fixos usados no cálculo automático de preço.
      </p>
      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="Valor do kWh (R$)"
          type="number"
          value={data?.kwh_rate ?? 0.95}
          onChange={(v) => onChange('kwh_rate', parseFloat(v) || 0)}
        />
        <Field
          label="Consumo da impressora (W)"
          type="number"
          value={data?.printer_watts ?? 250}
          onChange={(v) => onChange('printer_watts', parseInt(v) || 0)}
        />
        <Field
          label="Custo de mão de obra (R$/h)"
          type="number"
          value={data?.labor_cost_per_hour ?? 0}
          onChange={(v) => onChange('labor_cost_per_hour', parseFloat(v) || 0)}
        />
        <Field
          label="Custo fixo por peça (R$)"
          type="number"
          value={data?.fixed_cost_per_print ?? 0}
          onChange={(v) => onChange('fixed_cost_per_print', parseFloat(v) || 0)}
        />
        <Field
          label="Taxa do e-commerce (%)"
          type="number"
          value={data?.ecommerce_fee_percent ?? 0}
          onChange={(v) => onChange('ecommerce_fee_percent', parseFloat(v) || 0)}
        />
        <Field
          label="Margem de lucro (%)"
          type="number"
          value={data?.profit_margin_percent ?? 30}
          onChange={(v) => onChange('profit_margin_percent', parseFloat(v) || 0)}
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

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [message, setMessage] = useState(null);

  const loadUsers = async () => {
    try {
      const res = await api.get(`${API_URL}/auth/users`);
      setUsers(res.data);
    } catch {
      setMessage('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async () => {
    if (!newUsername || !newPassword) return;
    try {
      await api.post(`${API_URL}/auth/users`, null, {
        params: { username: newUsername, password: newPassword },
      });
      setNewUsername('');
      setNewPassword('');
      setMessage('Usuário criado!');
      loadUsers();
    } catch {
      setMessage('Erro ao criar usuário');
    }
  };

  const handleUpdate = async (username) => {
    if (!editPassword) return;
    try {
      await api.patch(`${API_URL}/auth/users/${username}`, null, {
        params: { password: editPassword },
      });
      setEditingUser(null);
      setEditPassword('');
      setMessage('Senha alterada!');
      loadUsers();
    } catch {
      setMessage('Erro ao alterar senha');
    }
  };

  const handleDelete = async (username) => {
    if (!confirm(`Remover usuário "${username}"?`)) return;
    try {
      await api.delete(`${API_URL}/auth/users/${username}`);
      setMessage('Usuário removido!');
      loadUsers();
    } catch {
      setMessage('Erro ao remover usuário');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Usuários</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Gerencie os usuários do sistema. O usuário <strong>admin</strong> não pode ser removido.
      </p>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(34,197,94,0.1)', color: 'var(--success)',
          marginBottom: '16px', fontSize: '14px',
        }}>{message}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', maxWidth: '480px' }}>
        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
          placeholder="Novo usuário" style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }} />
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="Senha" style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }} />
        <button onClick={handleCreate} disabled={!newUsername || !newPassword} style={{
          padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
          background: !newUsername || !newPassword ? 'var(--border-h)' : 'var(--accent)',
          color: '#fff', cursor: !newUsername || !newPassword ? 'not-allowed' : 'pointer',
          fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap',
        }}>Adicionar</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text)', fontSize: '14px' }}>Carregando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '480px' }}>
          {users.map(u => (
            <div key={u.username} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{u.username}</span>
                <span style={{
                  fontSize: '11px', padding: '2px 6px', borderRadius: '3px', marginLeft: '8px',
                  background: u.role === 'admin' ? 'rgba(124,58,237,0.1)' : 'rgba(34,197,94,0.1)',
                  color: u.role === 'admin' ? 'var(--accent)' : 'var(--success)', fontWeight: '600',
                }}>{u.role}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {editingUser === u.username ? (
                  <>
                    <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                      placeholder="Nova senha" style={{ width: '120px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(u.username); }} />
                    <button onClick={() => handleUpdate(u.username)} disabled={!editPassword} style={{
                      padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)',
                      background: 'transparent', cursor: !editPassword ? 'not-allowed' : 'pointer', fontSize: '12px', color: 'var(--success)',
                      opacity: !editPassword ? 0.5 : 1,
                    }}>Salvar</button>
                    <button onClick={() => { setEditingUser(null); setEditPassword(''); }} style={{
                      padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--text)',
                    }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={() => { setEditingUser(u.username); setEditPassword(''); }} style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--accent)',
                  }}>Alterar senha</button>
                )}
                {u.username !== 'admin' && (
                  <button onClick={() => handleDelete(u.username)} style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)',
                    background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)',
                  }}>Remover</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanceTab({ data, onChange }) {
  if (!data) return null;
  return (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Financeiro</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px', fontSize: '14px' }}>
        Configure as categorias de entrada e saída do caixa.
        As vendas concluídas (pedidos com status DONE) são registradas automaticamente.
      </p>
      <div style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
        <Field
          label="Categorias de entrada"
          value={data?.categories_income || ''}
          onChange={(v) => onChange('categories_income', v)}
          placeholder="Separadas por vírgula. Ex: Venda,Comissão"
        />
        <Field
          label="Categorias de saída"
          value={data?.categories_expense || ''}
          onChange={(v) => onChange('categories_expense', v)}
          placeholder="Separadas por vírgula. Ex: Filamento,Energia,Embalagem"
        />
        <Field
          label="Saldo inicial"
          type="number"
          value={data?.initial_balance ?? 0}
          onChange={(v) => onChange('initial_balance', parseFloat(v) || 0)}
          step="0.01"
        />
      </div>
    </div>
  );
}
