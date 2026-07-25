import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, orderRes] = await Promise.all([
        axios.get(`${API_URL}/products/`),
        axios.get(`${API_URL}/orders/`)
      ]);
      setProducts(prodRes.data);
      setOrders(orderRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

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
