import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [prodRes, orderRes] = await Promise.all([
        axios.get(`${API_URL}/products/`),
        axios.get(`${API_URL}/orders/`)
      ]);
      setProducts(prodRes.data);
      setOrders(orderRes.data);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
      console.error(err);
    }
  };

  if (error) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>
        <button onClick={loadData} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Produtos', value: products.length, color: 'var(--accent)', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { label: 'Pedidos', value: orders.length, color: 'var(--success)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: 'Imprimindo', value: orders.filter(o => o.status === 'PRINTING').length, color: 'var(--warning)', icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' },
    { label: 'Enviados', value: orders.filter(o => o.status === 'SHIPPED').length, color: 'var(--text)', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>Visão geral da loja</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {stats.map(s => (
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
    </div>
  );
}
