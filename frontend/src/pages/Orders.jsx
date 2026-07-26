import { useState, useEffect, useCallback } from 'react';
import api, { API_URL } from '../api';

function fmt(v) {
  if (v == null || isNaN(v)) return '0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusList = ['PENDING', 'PRINTING', 'DONE', 'SHIPPED'];
const statusColors = {
  PENDING: '#f59e0b',
  PRINTING: '#3b82f6',
  DONE: '#22c55e',
  SHIPPED: '#6b7280',
};
const statusLabels = {
  PENDING: 'Pendente',
  PRINTING: 'Imprimindo',
  DONE: 'Concluído',
  SHIPPED: 'Enviado',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    product_id: '', quantity: '1', amount: '', buyer_name: '', buyer_contact: '',
    shipping_address: '', notes: '', order_number: '', status: 'PENDING',
  });

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get(`${API_URL}/orders/`, { params });
      setOrders(res.data);
    } catch {
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const loadProducts = async () => {
    try {
      const res = await api.get(`${API_URL}/products/`, { params: { limit: 200 } });
      setProducts(res.data);
    } catch {}
  };

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadProducts(); }, []);

  const handleSave = async () => {
    const payload = { ...form };
    payload.product_id = payload.product_id ? parseInt(payload.product_id) : null;
    payload.quantity = payload.quantity ? parseInt(payload.quantity) : 1;
    payload.amount = payload.amount !== '' && payload.amount != null ? parseFloat(payload.amount) : null;
    try {
      setError(null);
      if (editing) {
        await api.patch(`${API_URL}/orders/${editing}`, payload);
      } else {
        await api.post(`${API_URL}/orders/`, payload);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ product_id: '', quantity: '1', amount: '', buyer_name: '', buyer_contact: '', shipping_address: '', notes: '', order_number: '', status: 'PENDING' });
      loadOrders();
    } catch {
      setError('Erro ao salvar pedido');
    }
  };

  const handleEdit = (order) => {
    setForm({
      product_id: order.product_id ?? '',
      quantity: order.quantity ?? '1',
      amount: order.amount ?? '',
      buyer_name: order.buyer_name ?? '',
      buyer_contact: order.buyer_contact ?? '',
      shipping_address: order.shipping_address ?? '',
      notes: order.notes ?? '',
      order_number: order.order_number ?? '',
      status: order.status,
    });
    setEditing(order.id);
    setShowForm(true);
  };

  const handleStatus = async (order, status) => {
    try {
      await api.patch(`${API_URL}/orders/${order.id}/status`, null, { params: { status } });
      loadOrders();
    } catch {
      setError('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este pedido?')) return;
    try {
      await api.delete(`${API_URL}/orders/${id}`);
      loadOrders();
    } catch {
      setError('Erro ao remover pedido');
    }
  };

  const nextStatus = (current) => {
    const idx = statusList.indexOf(current);
    return idx < statusList.length - 1 ? statusList[idx + 1] : null;
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Pedidos</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ product_id: '', quantity: '1', amount: '', buyer_name: '', buyer_contact: '', shipping_address: '', notes: '', order_number: '', status: 'PENDING' }); }} style={{
          padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
          background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
        }}>
          + Novo Pedido
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
          marginBottom: '16px', fontSize: '14px', fontWeight: '500',
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px',
        }}>
          <option value="">Todos os status</option>
          {statusList.map(s => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar comprador..."
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
        />
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '20px', marginBottom: '20px', display: 'grid', gap: '12px',
        }}>
          <h3 style={{ fontSize: '15px', margin: 0 }}>{editing ? 'Editar' : 'Novo'} Pedido</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select value={form.product_id} onChange={e => {
              const pid = e.target.value;
              const prod = products.find(p => String(p.id) === pid);
              setForm(f => ({ ...f, product_id: pid, amount: prod?.sale_price ?? prod?.production_cost ?? f.amount }));
            }} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}>
              <option value="">Nenhum produto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title || `Produto #${p.id}`}</option>
              ))}
            </select>
            <input type="number" step="0.01" min="0" placeholder="Valor (R$)" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <input placeholder="Nº do pedido" value={form.order_number}
              onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <input type="number" min="1" placeholder="Quantidade" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <input placeholder="Nome do comprador" value={form.buyer_name}
              onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <input placeholder="Contato (tel/e-mail)" value={form.buyer_contact}
              onChange={e => setForm(f => ({ ...f, buyer_contact: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
          </div>
          <input placeholder="Endereço de entrega" value={form.shipping_address}
            onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))}
            style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
          />
          <input placeholder="Observações" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
          />
          {editing && (
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text)', marginRight: '8px' }}>Status:</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                {statusList.map(s => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              background: 'var(--bg)', cursor: 'pointer', fontSize: '13px', color: 'var(--text)',
            }}>Cancelar</button>
            <button onClick={handleSave} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
            }}>{editing ? 'Salvar' : 'Criar Pedido'}</button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
            Nenhum pedido encontrado
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>Pedido</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>Produto</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>Comprador</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '600' }}>Qtd</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '600' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600' }}>Valor</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600' }}>Data</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600' }}></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>#{order.id}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-h)', fontWeight: '500' }}>
                    {order.order_number || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-h)', fontWeight: '500' }}>
                    {order.product ? (order.product.title || `Produto #${order.product.id}`) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>{order.buyer_name || '—'}</div>
                    {order.buyer_contact && <div style={{ fontSize: '12px', color: 'var(--text)' }}>{order.buyer_contact}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text)' }}>
                    {order.quantity || 1}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                      background: `${statusColors[order.status]}20`,
                      color: statusColors[order.status],
                    }}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: 'var(--accent)' }}>
                    R$ {fmt(order.amount)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', fontSize: '13px' }}>
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {nextStatus(order.status) && (
                        <button onClick={() => handleStatus(order, nextStatus(order.status))} title={`Mover para ${statusLabels[nextStatus(order.status)]}`} style={{
                          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--accent)',
                          background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)',
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
                        </button>
                      )}
                      <button onClick={() => handleEdit(order)} style={{
                        padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--text)',
                      }}>Editar</button>
                      <button onClick={() => handleDelete(order.id)} style={{
                        padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--danger)',
                        background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--danger)',
                      }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
