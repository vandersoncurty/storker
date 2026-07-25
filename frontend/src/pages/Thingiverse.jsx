import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

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
        <p style={{ color: '#ef4444', marginTop: '12px' }}>{error}</p>
        <button onClick={loadData} style={{ marginTop: '8px', padding: '8px 16px', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Thingiverse</h1>

      {actionMessage && (
        <p style={{ color: actionMessage.type === 'success' ? '#22c55e' : '#ef4444', marginBottom: '12px' }}>
          {actionMessage.text}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' }}>
        <div>
          <h2>Coleções para Sync</h2>
          <form onSubmit={handleAddCollection} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="number"
              placeholder="ID da collection"
              value={newCollectionId}
              onChange={e => setNewCollectionId(e.target.value)}
              required
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}
            />
            <input
              placeholder="Nome (opcional)"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}
            />
            <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
              Adicionar
            </button>
          </form>

          {collections.length === 0 ? (
            <p style={{ color: 'var(--text)' }}>Nenhuma collection configurada.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {collections.map(c => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <strong>{c.name}</strong>
                    <span style={{ color: 'var(--text)', marginLeft: '8px' }}>ID: {c.collection_id}</span>
                    {c.last_synced_at && (
                      <span style={{ color: 'var(--text)', marginLeft: '8px', fontSize: '12px' }}>
                        Sync: {new Date(c.last_synced_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveCollection(c.collection_id)}
                    title="Remover collection"
                    style={{
                      background: 'none',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2>Sincronizar</h2>
          <button onClick={handleSync} disabled={syncing || collections.length === 0} style={{
            padding: '10px 24px',
            borderRadius: '6px',
            border: 'none',
            background: syncing ? '#666' : 'var(--accent)',
            color: '#fff',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontWeight: '600',
          }}>
            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>

          {syncResult && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', background: 'var(--accent-bg)' }}>
              <p><strong>Resultado:</strong></p>
              <p>Novos baixados: {syncResult.total_downloaded}</p>
              <p>Já existentes: {syncResult.total_skipped}</p>
              <p>Falhas: {syncResult.total_failed}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2>Downloads Recentes</h2>
        {downloads.length === 0 ? (
          <p style={{ color: 'var(--text)' }}>Nenhum download realizado.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Nome</th>
                <th style={{ padding: '8px' }}>Thing ID</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {downloads.slice(0, 20).map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}>{d.thing_name}</td>
                  <td style={{ padding: '8px' }}>{d.thing_id}</td>
                  <td style={{ padding: '8px', color: d.status === 'DOWNLOADED' ? '#22c55e' : '#ef4444' }}>
                    {d.status}
                  </td>
                  <td style={{ padding: '8px' }}>{new Date(d.synced_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
