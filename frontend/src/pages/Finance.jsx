import { useState, useEffect, useCallback } from 'react';
import api, { API_URL } from '../api';

function fmt(v) {
  if (v == null || isNaN(v)) return '0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const typeIcons = {
  income: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>,
  expense: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 19V5m7 7l-7-7-7 7"/></svg>,
};

const categoryColors = {
  sale: '#22c55e',
  material: '#f59e0b',
  shipping: '#3b82f6',
  fee: '#ef4444',
  energy: '#f97316',
  other: '#6b7280',
};

const periods = [
  { label: 'Hoje', days: null, getStart: () => todayStr(), getEnd: () => todayStr() },
  { label: '7 dias', days: 7, getStart: () => daysAgoStr(7), getEnd: () => todayStr() },
  { label: '30 dias', days: 30, getStart: () => daysAgoStr(30), getEnd: () => todayStr() },
  { label: 'Este mês', days: null, getStart: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }, getEnd: () => todayStr() },
  { label: 'Mês passado', days: null, getStart: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10); }, getEnd: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10); } },
];

export default function Finance() {
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState({ total_income: 0, total_expense: 0, balance: 0, entries_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activePeriod, setActivePeriod] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRange, setCustomRange] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'income', description: '', amount: '', category: 'other' });

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const [eRes, bRes] = await Promise.all([
        api.get(`${API_URL}/finance/entries`, { params }),
        api.get(`${API_URL}/finance/balance`, { params }),
      ]);
      setEntries(eRes.data);
      setBalance(bRes.data);
    } catch {
      setError('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePeriod = (p) => {
    setActivePeriod(p.label);
    setCustomRange(false);
    setStartDate(p.getStart());
    setEndDate(p.getEnd());
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) return;
    try {
      setError(null);
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editing) {
        await api.patch(`${API_URL}/finance/entries/${editing}`, payload);
      } else {
        await api.post(`${API_URL}/finance/entries`, payload);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ type: 'income', description: '', amount: '', category: 'other' });
      loadData();
    } catch {
      setError('Erro ao salvar lançamento');
    }
  };

  const handleEdit = (entry) => {
    setForm({ type: entry.type, description: entry.description, amount: String(entry.amount), category: entry.category });
    setEditing(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este lançamento?')) return;
    try {
      await api.delete(`${API_URL}/finance/entries/${id}`);
      loadData();
    } catch {
      setError('Erro ao remover lançamento');
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Financeiro</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ type: 'income', description: '', amount: '', category: 'other' }); }} style={{
          padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
          background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
        }}>
          + Novo Lançamento
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
          marginBottom: '16px', fontSize: '14px', fontWeight: '500',
        }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Entradas</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>R$ {fmt(balance.total_income)}</div>
        </div>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Saídas</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>R$ {fmt(balance.total_expense)}</div>
        </div>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Saldo</div>
          <div style={{
            fontSize: '24px', fontWeight: '700',
            color: balance.balance >= 0 ? '#22c55e' : '#ef4444',
          }}>R$ {fmt(balance.balance)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {periods.map(p => (
          <button key={p.label} onClick={() => handlePeriod(p)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: activePeriod === p.label ? 'var(--accent-bg)' : 'var(--bg)',
            color: activePeriod === p.label ? 'var(--accent)' : 'var(--text)',
            fontWeight: activePeriod === p.label ? '600' : '400',
            cursor: 'pointer', fontSize: '13px',
          }}>{p.label}</button>
        ))}
        <button onClick={() => { setCustomRange(true); setActivePeriod(null); }} style={{
          padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: customRange ? 'var(--accent-bg)' : 'var(--bg)',
          color: customRange ? 'var(--accent)' : 'var(--text)',
          fontWeight: customRange ? '600' : '400',
          cursor: 'pointer', fontSize: '13px',
        }}>Personalizado</button>
      </div>

      {customRange && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: 'var(--text)' }}>De</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px',
          }} />
          <label style={{ fontSize: '13px', color: 'var(--text)' }}>Até</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px',
          }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px',
        }}>
          <option value="">Todos os tipos</option>
          <option value="income">Entradas</option>
          <option value="expense">Saídas</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px',
        }}>
          <option value="">Todas as categorias</option>
          <option value="sale">Venda</option>
          <option value="material">Filamento</option>
          <option value="shipping">Frete</option>
          <option value="fee">Taxa</option>
          <option value="energy">Energia</option>
          <option value="other">Outro</option>
        </select>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '20px', marginBottom: '20px', display: 'grid', gap: '12px',
        }}>
          <h3 style={{ fontSize: '15px', margin: 0 }}>{editing ? 'Editar' : 'Novo'} Lançamento</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" name="type" value="income" checked={form.type === 'income'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
              <span style={{ color: '#22c55e', fontWeight: '600' }}>Entrada</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" name="type" value="expense" checked={form.type === 'expense'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
              <span style={{ color: '#ef4444', fontWeight: '600' }}>Saída</span>
            </label>
          </div>
          <input
            placeholder="Descrição"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="number" step="0.01" min="0"
              placeholder="Valor"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            >
              <option value="sale">Venda</option>
              <option value="material">Filamento</option>
              <option value="shipping">Frete</option>
              <option value="fee">Taxa</option>
              <option value="energy">Energia</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              background: 'var(--bg)', cursor: 'pointer', fontSize: '13px', color: 'var(--text)',
            }}>Cancelar</button>
            <button onClick={handleSave} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
            }}>{editing ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
            Nenhum lançamento encontrado
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>Descrição</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600' }}>Categoria</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600' }}>Valor</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600' }}>Data</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600' }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <td style={{ padding: '10px 14px' }}>{typeIcons[entry.type]}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-h)', fontWeight: '500' }}>{entry.description}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                      background: `${categoryColors[entry.category] || '#6b7280'}20`,
                      color: categoryColors[entry.category] || '#6b7280',
                    }}>
                      {entry.category === 'sale' ? 'Venda' :
                       entry.category === 'material' ? 'Filamento' :
                       entry.category === 'shipping' ? 'Frete' :
                       entry.category === 'fee' ? 'Taxa' :
                       entry.category === 'energy' ? 'Energia' :
                       'Outro'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: entry.type === 'income' ? '#22c55e' : '#ef4444' }}>
                    {entry.type === 'income' ? '+' : '-'}R$ {fmt(entry.amount)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', fontSize: '13px' }}>
                    {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {entry.reference_type !== 'order' && (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(entry)} style={{
                          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--text)',
                        }}>Editar</button>
                        <button onClick={() => handleDelete(entry.id)} style={{
                          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--danger)',
                          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)',
                        }}>Excluir</button>
                      </div>
                    )}
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
