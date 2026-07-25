import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const resp = await axios.get(`${API_URL}/dashboard/`);
      setData(resp.data);
    } catch {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--text)', marginTop: '8px' }}>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>
        <button onClick={loadData} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg)' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const { products, orders, stl_projects, stl_files, thingiverse, moonraker, moonraker_error } = data;

  const statusLabels = {
    PENDING: 'Pendentes',
    PRINTING: 'Imprimindo',
    DONE: 'Concluídos',
    SHIPPED: 'Enviados',
  };

  const statusColors = {
    PENDING: 'var(--warning)',
    PRINTING: 'var(--accent)',
    DONE: 'var(--success)',
    SHIPPED: 'var(--text)',
  };

  const mainStats = [
    { label: 'Produtos', value: products.total, color: 'var(--accent)', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { label: 'Pedidos', value: orders.total, color: 'var(--success)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: 'Projetos STL', value: stl_projects.total, color: 'var(--danger)', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6' },
    { label: 'Arquivos STL', value: stl_files.total_stl, color: 'var(--warning)', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Visão geral da loja</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {mainStats.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--radius)',
              background: `linear-gradient(135deg, ${s.color}22, ${s.color}11)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-h)', lineHeight: '1' }}>{s.value}</div>
            <div style={{ color: 'var(--text)', marginTop: '4px', fontSize: '14px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Pedidos por status</h3>
          {Object.keys(orders.by_status).length === 0 ? (
            <p style={{ color: 'var(--text)', fontSize: '14px' }}>Nenhum pedido</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(orders.by_status).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[status] || 'var(--text)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>{statusLabels[status] || status}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Projetos STL</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Upload manual</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{stl_projects.upload}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Thingiverse</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{stl_projects.thingiverse}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--warning)' }}>Info. pendentes</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--warning)' }}>{stl_projects.info_pending}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '14px', color: 'var(--danger)' }}>Não fatiados</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>{stl_files.unsliced}</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Thingiverse</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Coleções</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{thingiverse.collections}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Sincronizados</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>{thingiverse.synced}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Falhas</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>{thingiverse.failed}</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Produtos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Total</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{products.total}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Com custo definido</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{products.with_costs}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Com preço definido</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{products.with_price}</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Impressora (Moonraker)</h3>
          {moonraker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>Estado</span>
                <span style={{
                  fontSize: '14px', fontWeight: '600',
                  color: moonraker.state === 'ready' || moonraker.state === 'printing' ? 'var(--success)' : 'var(--text-h)',
                }}>
                  {moonraker.state}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>Hostname</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{moonraker.hostname}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>Firmware</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{moonraker.firmware_version}</span>
              </div>
              {moonraker.print_stats.state && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)' }}>Status impressão</span>
                  <span style={{
                    fontSize: '14px', fontWeight: '600',
                    color: moonraker.print_stats.state === 'printing' ? 'var(--accent)' : 'var(--text-h)',
                  }}>
                    {moonraker.print_stats.state}
                  </span>
                </div>
              )}
              {moonraker.print_stats.filename && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arquivo</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{moonraker.print_stats.filename}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ color: moonraker_error ? 'var(--danger)' : 'var(--text)', fontSize: '14px', margin: '8px 0' }}>
                {moonraker_error || 'Impressora não configurada'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
