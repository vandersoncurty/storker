import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [resp, chartResp] = await Promise.all([
        axios.get(`${API_URL}/dashboard/`),
        axios.get(`${API_URL}/dashboard/charts`),
      ]);
      setData(resp.data);
      setCharts(chartResp.data);
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
  const pb = charts?.products_by_month || [];
  const ob = charts?.orders_by_month || [];
  const prb = charts?.projects_by_month || [];
  const pd = charts?.price_distribution || [];

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
    { label: 'Filamento total', value: `${((charts?.total_filament_grams || 0) / 1000).toFixed(1)}kg`, color: 'var(--warning)', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  ];

  const maxBar = Math.max(...pb.map(b => b.count), 1);
  const maxBarO = Math.max(...ob.map(b => b.count), 1);
  const maxBarP = Math.max(...prb.map(b => b.count), 1);
  const maxBarPD = Math.max(...pd.map(b => b.count), 1);

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Visão geral da loja</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {mainStats.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '20px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--radius)',
              background: `linear-gradient(135deg, ${s.color}22, ${s.color}11)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-h)', lineHeight: '1' }}>{s.value}</div>
            <div style={{ color: 'var(--text)', marginTop: '4px', fontSize: '14px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <BarChartCard title="Produtos cadastrados" data={pb} maxBar={maxBar} color="var(--accent)" />
        <BarChartCard title="Pedidos por mês" data={ob} maxBar={maxBarO} color="var(--success)" />
        <BarChartCard title="Projetos STL" data={prb} maxBar={maxBarP} color="var(--danger)" />
        <BarChartCard title="Preços dos produtos" data={pd} maxBar={maxBarPD} color="var(--warning)" />
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
            <MiniRow label="Upload manual" value={stl_projects.upload} />
            <MiniRow label="Thingiverse" value={stl_projects.thingiverse} />
            <MiniRow label="Info. pendentes" value={stl_projects.info_pending} color="var(--warning)" />
            <MiniRow label="Não fatiados" value={stl_files.unsliced} color="var(--danger)" />
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Thingiverse</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniRow label="Coleções" value={thingiverse.collections} />
            <MiniRow label="Sincronizados" value={thingiverse.synced} color="var(--success)" />
            <MiniRow label="Falhas" value={thingiverse.failed} color="var(--danger)" />
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Produtos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniRow label="Total" value={products.total} />
            <MiniRow label="Com custo definido" value={products.with_costs} />
            <MiniRow label="Com preço definido" value={products.with_price} />
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>Impressora (Moonraker)</h3>
          {moonraker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MiniRow label="Estado" value={moonraker.state} color={moonraker.state === 'ready' || moonraker.state === 'printing' ? 'var(--success)' : undefined} />
              <MiniRow label="Hostname" value={moonraker.hostname} />
              <MiniRow label="Firmware" value={moonraker.firmware_version} />
              {moonraker.print_stats.state && <MiniRow label="Status impressão" value={moonraker.print_stats.state} color={moonraker.print_stats.state === 'printing' ? 'var(--accent)' : undefined} />}
              {moonraker.print_stats.filename && <MiniRow label="Arquivo" value={moonraker.print_stats.filename} />}
            </div>
          ) : (
            <p style={{ color: moonraker_error ? 'var(--danger)' : 'var(--text)', fontSize: '14px', margin: '8px 0' }}>
              {moonraker_error || 'Impressora não configurada'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '600', color: color || 'var(--text-h)' }}>{value}</span>
    </div>
  );
}

function BarChartCard({ title, data, maxBar, color }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-h)' }}>{title}</h3>
      {data.length === 0 ? (
        <p style={{ color: 'var(--text)', fontSize: '14px' }}>Sem dados</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px', paddingTop: '4px' }}>
          {data.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${(b.count / maxBar) * 80}px`,
                background: `linear-gradient(180deg, ${color}, ${color}88)`,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s',
                minHeight: b.count > 0 ? '4px' : '0',
              }} />
              <span style={{ fontSize: '10px', color: 'var(--text)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '50px', textAlign: 'center' }}>
                {b.month || b.range}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-h)' }}>{b.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
