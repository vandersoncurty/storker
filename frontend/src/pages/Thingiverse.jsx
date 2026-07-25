import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import ThingiverseIcon from '../components/ThingiverseIcon';

export default function Thingiverse() {
  const [collections, setCollections] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [newCollectionId, setNewCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const showAction = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setError(null);
      const [collRes, dlRes] = await Promise.all([
        axios.get(`${API_URL}/thingiverse/collections`),
        axios.get(`${API_URL}/thingiverse/downloads`),
      ]);
      setCollections(collRes.data);
      setDownloads(dlRes.data);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionId) return;
    try {
      await axios.post(`${API_URL}/thingiverse/collections`, {
        collection_id: parseInt(newCollectionId),
        name: newCollectionName || `Collection ${newCollectionId}`,
      });
      setNewCollectionId('');
      setNewCollectionName('');
      showAction('Collection adicionada!');
      loadData();
    } catch (err) {
      showAction('Erro ao adicionar collection', 'error');
      console.error(err);
    }
  };

  const handleRemoveCollection = async (collectionId) => {
    try {
      await axios.delete(`${API_URL}/thingiverse/collections/${collectionId}`);
      showAction('Collection removida!');
      loadData();
    } catch (err) {
      showAction('Erro ao remover collection', 'error');
      console.error(err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await axios.post(`${API_URL}/thingiverse/sync`);
      setSyncResult(res.data);
      showAction('Sincronização concluída!');
      loadData();
    } catch (err) {
      showAction('Erro na sincronização', 'error');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <p>Carregando...</p>;

  if (error) {
    return (
      <div>
        <h1>Thingiverse</h1>
        <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>
        <button onClick={loadData} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Thingiverse</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Sincronize coleções do Thingiverse</p>

      {actionMessage && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: actionMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
          marginBottom: '16px', fontSize: '14px', fontWeight: '500',
        }}>
          {actionMessage.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThingiverseIcon size={18} />
            Coleções
          </h2>
          <form onSubmit={handleAddCollection} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="number"
              placeholder="ID da collection"
              value={newCollectionId}
              onChange={e => setNewCollectionId(e.target.value)}
              required
              style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <input
              placeholder="Nome (opcional)"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              style={{ flex: 2, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <button type="submit" style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--accent)', color: '#fff',
              cursor: 'pointer', fontWeight: '500', fontSize: '14px',
            }}>
              Adicionar
            </button>
          </form>

          {collections.length === 0 ? (
            <p style={{ color: 'var(--text)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
              Nenhuma collection configurada.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '4px' }}>
              {collections.map(c => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-muted)',
                }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-h)' }}>{c.name}</strong>
                    <span style={{ color: 'var(--text)', marginLeft: '8px', fontSize: '12px' }}>ID: {c.collection_id}</span>
                    {c.last_synced_at && (
                      <span style={{ color: 'var(--text)', marginLeft: '8px', fontSize: '12px' }}>
                        • Sync: {new Date(c.last_synced_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveCollection(c.collection_id)}
                    title="Remover collection"
                    style={{
                      background: 'none', border: 'none', color: 'var(--danger)',
                      cursor: 'pointer', padding: '4px', borderRadius: '4px',
                      fontSize: '12px', fontWeight: '600',
                    }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThingiverseIcon size={18} />
            Sincronizar
          </h2>
          <button onClick={handleSync} disabled={syncing || collections.length === 0} style={{
            padding: '10px 20px', borderRadius: 'var(--radius-sm)',
            border: 'none', background: syncing || collections.length === 0 ? 'var(--border-h)' : 'var(--accent)',
            color: '#fff', cursor: syncing || collections.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.15s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>

          {syncResult && (
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Novos', value: syncResult.total_downloaded, color: 'var(--success)' },
                { label: 'Existentes', value: syncResult.total_skipped, color: 'var(--warning)' },
                { label: 'Falhas', value: syncResult.total_failed, color: 'var(--danger)' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-muted)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Downloads Recentes
          </h2>
        </div>
        {downloads.length === 0 ? (
          <p style={{ color: 'var(--text)', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
            Nenhum download realizado.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {downloads.slice(0, 20).map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-h)', fontWeight: '500' }}>{d.thing_name}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>{d.thing_id}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                        background: d.status === 'DOWNLOADED' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: d.status === 'DOWNLOADED' ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>{new Date(d.synced_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
