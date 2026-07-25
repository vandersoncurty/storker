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
        <p style={{ color: '#ef4444', marginTop: '12px' }}>{error}</p>
        <button onClick={loadData} style={{ marginTop: '8px', padding: '8px 16px', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Produtos', value: products.length, color: '#aa3bff' },
    { label: 'Pedidos', value: orders.length, color: '#22c55e' },
    { label: 'Imprimindo', value: orders.filter(o => o.status === 'PRINTING').length, color: '#f59e0b' },
    { label: 'Enviados', value: orders.filter(o => o.status === 'SHIPPED').length, color: '#3b82f6' },
  ];

  return (
    <div>
      <h1>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ color: 'var(--text)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
