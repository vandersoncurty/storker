import { useState, useEffect, useRef, useCallback } from 'react';
import api, { API_URL } from '../api';
import ThingiverseIcon from '../components/ThingiverseIcon';

const FALLBACK_COST = {
  filament_price_per_kg: 100,
  electricity_rate: 0.95,
  printer_watts: 250,
  markup_percentage: 30,
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSliced, setFilterSliced] = useState('all');

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filterSliced !== 'all') params.is_sliced = filterSliced === 'sliced';
      const res = await api.get(`${API_URL}/products/`, { params });
      setProducts(res.data);
    } catch (err) {
      setError('Erro ao carregar produtos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterSliced]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  if (loading && products.length === 0) return <p>Carregando...</p>;
  if (error) {
    return (
      <div>
        <h1>Produtos</h1>
        <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>
        <button onClick={loadProducts} className="btn btn-secondary" style={{ marginTop: '12px' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Produtos</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>{products.length} produto(s) no catálogo</p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Buscar por título..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', fontSize: '14px',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
        <select value={filterSliced} onChange={e => setFilterSliced(e.target.value)}
          style={{
            padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            fontSize: '14px', background: 'var(--bg)', cursor: 'pointer', minWidth: '140px',
          }}>
          <option value="all">Todos</option>
          <option value="sliced">Fatiados</option>
          <option value="unsliced">Não fatiados</option>
        </select>
      </div>

      {products.length === 0 ? (
        <p style={{ color: 'var(--text)', padding: '40px 0', textAlign: 'center' }}>
          {search || filterSliced !== 'all' ? 'Nenhum produto encontrado com esses filtros.' : 'Nenhum produto. Faça upload de STLs e defina título para criar produtos automaticamente.'}
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} onEdit={setEditing} />
          ))}
        </div>
      )}
      {editing && <EditModal product={editing} onClose={() => setEditing(null)} onRefresh={loadProducts} />}
    </div>
  );
}

function ProductCard({ product, onEdit }) {
  const [orderMsg, setOrderMsg] = useState(null);
  const primaryImage = product.images.find(i => i.is_primary);

  const imageUrl = primaryImage
    ? `${API_URL}/images/products/${primaryImage.file_path.split(/[/\\]/).pop()}`
    : null;

  const variants = product.variants || [];
  const prices = variants.map(v => v.sale_price).filter(p => p != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  const handleCreateOrder = async (e) => {
    e.stopPropagation();
    const amount = product.sale_price || product.production_cost || 0;
    try {
      await api.post(`${API_URL}/orders/`, { product_id: product.id, amount });
      setOrderMsg('Pedido criado!');
      setTimeout(() => setOrderMsg(null), 2000);
    } catch {
      setOrderMsg('Erro');
      setTimeout(() => setOrderMsg(null), 2000);
    }
  };

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: 'var(--shadow-sm)',
    }}
      onClick={() => onEdit(product)}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--accent-border)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{
        height: '200px', background: 'var(--code-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={product.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-h)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        )}

        {!product.is_sliced && (
          <span style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'var(--danger)', color: '#fff',
            fontSize: '11px', fontWeight: '600',
            padding: '2px 8px', borderRadius: '4px',
          }}>
            Não fatiado
          </span>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <h3 style={{
          margin: 0, fontSize: '15px', fontWeight: '600',
          color: 'var(--text-h)', lineHeight: '1.3',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{product.title}</h3>

        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--text)' }}>
          {product.filament_grams && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              {product.filament_grams}g
            </span>
          )}
          {minPrice != null && maxPrice != null ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: 'var(--success)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              {minPrice === maxPrice
                ? `R$ ${minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : `R$ ${minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ~ R$ ${maxPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              }
            </span>
          ) : product.sale_price ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: 'var(--success)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              R$ {product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : null}
        </div>

        {variants.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
            {variants.map(v => (
              <span key={v.id} style={{
                fontSize: '11px', padding: '1px 6px', borderRadius: '3px',
                background: 'var(--accent-bg)', color: 'var(--accent)',
                fontWeight: '500',
              }}>
                {v.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          {orderMsg && <span style={{ fontSize: '12px', fontWeight: 600, color: orderMsg === 'Pedido criado!' ? 'var(--success)' : 'var(--danger)' }}>{orderMsg}</span>}
          <button onClick={handleCreateOrder} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)',
            background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--accent)',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ product, onClose, onRefresh }) {
  const [form, setForm] = useState({
    title: product.title,
    description: product.description || '',
    sale_price: product.sale_price || '',
    production_cost: product.production_cost || '',
    taxes_fees: product.taxes_fees || '',
    filament_grams: product.filament_grams || '',
    print_time_seconds: product.print_time_seconds || '',
    is_sliced: product.is_sliced,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');
  const [showCostCalc, setShowCostCalc] = useState(false);
  const [costForm, setCostForm] = useState({ ...FALLBACK_COST });

  useEffect(() => {
    api.get(`${API_URL}/costs/settings`).then(res => {
      const s = res.data;
      setCostForm({
        filament_price_per_kg: 100,
        electricity_rate: s.kwh_rate ?? FALLBACK_COST.electricity_rate,
        printer_watts: s.printer_watts ?? FALLBACK_COST.printer_watts,
        markup_percentage: s.profit_margin_percent ?? FALLBACK_COST.markup_percentage,
      });
    }).catch(() => {});
  }, []);
  const [costResult, setCostResult] = useState(null);
  const [applying, setApplying] = useState(false);
  const [variants, setVariants] = useState(product.variants || []);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [addingVariant, setAddingVariant] = useState(false);
  const fileInputRef = useRef(null);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`${API_URL}/products/${product.id}`, {
        ...form,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        production_cost: form.production_cost ? parseFloat(form.production_cost) : null,
        taxes_fees: form.taxes_fees ? parseFloat(form.taxes_fees) : null,
        filament_grams: form.filament_grams ? parseFloat(form.filament_grams) : null,
        print_time_seconds: form.print_time_seconds ? parseInt(form.print_time_seconds) : null,
      });
      showMessage('Salvo!');
      onRefresh();
    } catch (err) {
      showMessage('Erro ao salvar', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`${API_URL}/products/${product.id}/images/upload`, formData);
      showMessage('Imagem enviada!');
      onRefresh();
    } catch (err) {
      showMessage('Erro ao enviar imagem', 'error');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await api.patch(`${API_URL}/products/${product.id}/images/${imageId}/primary`);
      showMessage('Imagem principal atualizada');
      onRefresh();
    } catch (err) {
      showMessage('Erro ao definir imagem principal', 'error');
      console.error(err);
    }
  };

  const handleDeleteImage = async (image) => {
    if (!confirm(`Remover esta imagem?`)) return;
    try {
      await api.delete(`${API_URL}/products/${product.id}/images/${image.id}`);
      showMessage('Imagem removida');
      onRefresh();
    } catch {
      showMessage('Erro ao remover imagem', 'error');
    }
  };

  const handleEstimateCost = async () => {
    try {
      const payload = {
        filament_grams: parseFloat(form.filament_grams) || 0,
        print_time_seconds: parseInt(form.print_time_seconds) || 0,
        ...costForm,
      };
      const res = await api.post(`${API_URL}/costs/estimate`, payload);
      setCostResult(res.data);
    } catch {
      showMessage('Erro ao calcular custo', 'error');
    }
  };

  const handleApplyCost = async () => {
    setApplying(true);
    try {
      const payload = {
        filament_grams: parseFloat(form.filament_grams) || 0,
        print_time_seconds: parseInt(form.print_time_seconds) || 0,
        ...costForm,
      };
      await api.post(`${API_URL}/costs/apply/${product.id}`, payload);
      showMessage('Custo aplicado ao produto!');
      setShowCostCalc(false);
      onRefresh();
    } catch {
      showMessage('Erro ao aplicar custo', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm(`Remover produto "${product.title}" permanentemente?`)) return;
    try {
      await api.delete(`${API_URL}/products/${product.id}`);
      showMessage('Produto removido');
      onRefresh();
      onClose();
    } catch {
      showMessage('Erro ao remover produto', 'error');
    }
  };

  const handleAddVariant = async () => {
    if (!newVariantName.trim()) return;
    setAddingVariant(true);
    try {
      const res = await api.post(`${API_URL}/products/${product.id}/variants`, {
        name: newVariantName.trim(),
        filament_price_per_kg: parseFloat(newVariantPrice) || 0,
      });
      setVariants(prev => [...prev, res.data]);
      setNewVariantName('');
      setNewVariantPrice('');
      showMessage('Variante adicionada!');
      onRefresh();
    } catch {
      showMessage('Erro ao adicionar variante', 'error');
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variant) => {
    if (!confirm(`Remover variante "${variant.name}"?`)) return;
    try {
      await api.delete(`${API_URL}/products/${product.id}/variants/${variant.id}`);
      setVariants(prev => prev.filter(v => v.id !== variant.id));
      showMessage('Variante removida');
      onRefresh();
    } catch {
      showMessage('Erro ao remover variante', 'error');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
        padding: '0', width: '90vw', maxWidth: '720px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Editar Produto</h2>
          <button onClick={onClose} style={{
            background: 'var(--bg-muted)', border: 'none',
            width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', color: 'var(--text)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-h)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text)'; }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '24px', overflow: 'auto', display: 'grid', gap: '20px' }}>
          <Field label="Título" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Descrição</span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', fontSize: '14px',
                resize: 'vertical', minHeight: '80px', lineHeight: '1.5',
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Peso filamento (g)" type="number" value={form.filament_grams} onChange={v => setForm(f => ({ ...f, filament_grams: v }))} />
            <Field label="Tempo impressão (s)" type="number" value={form.print_time_seconds} onChange={v => setForm(f => ({ ...f, print_time_seconds: v }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Field label="Custo produção (R$)" type="number" value={form.production_cost} onChange={v => setForm(f => ({ ...f, production_cost: v }))} />
            <Field label="Preço venda (R$)" type="number" value={form.sale_price} onChange={v => setForm(f => ({ ...f, sale_price: v }))} />
            <Field label="Impostos/taxas (R$)" type="number" value={form.taxes_fees} onChange={v => setForm(f => ({ ...f, taxes_fees: v }))} />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-muted)', cursor: 'pointer', fontSize: '14px',
          }}>
            <input
              type="checkbox"
              checked={form.is_sliced}
              onChange={e => setForm(f => ({ ...f, is_sliced: e.target.checked }))}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span>Modelo fatiado (pronto pra imprimir)</span>
          </label>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <button onClick={() => { setShowCostCalc(true); setCostResult(null); }} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)',
              background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)', fontWeight: 600,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Calcular custo
            </button>
            {product.production_cost != null && (
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                Custo: R$ {product.production_cost} | Sugerido: R$ {product.sale_price || '-'}
              </span>
            )}
          </div>

          {showCostCalc && (
            <div style={{
              background: 'var(--bg-muted)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '16px', display: 'grid', gap: '12px',
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-h)' }}>Calculadora de Custo</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>Filamento (R$/kg)</span>
                  <input type="number" value={costForm.filament_price_per_kg} onChange={e => setCostForm(f => ({ ...f, filament_price_per_kg: parseFloat(e.target.value) || 0 }))}
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }} />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>Energia (R$/kWh)</span>
                  <input type="number" value={costForm.electricity_rate} onChange={e => setCostForm(f => ({ ...f, electricity_rate: parseFloat(e.target.value) || 0 }))}
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }} />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>Potência (W)</span>
                  <input type="number" value={costForm.printer_watts} onChange={e => setCostForm(f => ({ ...f, printer_watts: parseInt(e.target.value) || 0 }))}
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }} />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>Margem (%)</span>
                  <input type="number" value={costForm.markup_percentage} onChange={e => setCostForm(f => ({ ...f, markup_percentage: parseFloat(e.target.value) || 0 }))}
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }} />
                </label>
              </div>
              <button onClick={handleEstimateCost} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)',
                background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)', fontWeight: 600,
              }}>Calcular</button>
              {costResult && (
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'grid', gap: '4px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text)' }}>Filamento</span><span style={{ fontWeight: 600 }}>R$ {costResult.filament_cost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text)' }}>Energia</span><span style={{ fontWeight: 600 }}>R$ {costResult.electricity_cost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '4px' }}><span style={{ color: 'var(--text)' }}>Custo produção</span><span style={{ fontWeight: 700 }}>R$ {costResult.production_cost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text)' }}>Preço sugerido</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>R$ {costResult.suggested_price}</span></div>
                  <button onClick={handleApplyCost} disabled={applying} style={{
                    marginTop: '8px', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: applying ? 'var(--border-h)' : 'var(--accent)', color: '#fff',
                    cursor: applying ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px',
                  }}>{applying ? 'Aplicando...' : 'Aplicar ao produto'}</button>
                </div>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Variantes ({variants.length})
              </h3>
            </div>

            {variants.length === 0 ? (
              <p style={{ color: 'var(--text)', fontSize: '13px', padding: '8px 0', textAlign: 'center' }}>
                Nenhuma variante. Adicione opções de filamento com preços diferentes.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '6px' }}>
                {variants.map(v => (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-muted)', fontSize: '13px',
                  }}>
                    <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-h)' }}>{v.name}</span>
                    <span style={{ color: 'var(--text)' }}>
                      {v.filament_price_per_kg ? `R$${v.filament_price_per_kg.toFixed(2)}/kg` : '—'}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                      R$ {v.sale_price?.toFixed(2) || '—'}
                    </span>
                    <button onClick={() => handleDeleteVariant(v)} style={{
                      padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--danger)', background: 'transparent',
                      cursor: 'pointer', fontSize: '11px', color: 'var(--danger)',
                    }}>Remover</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'flex-end' }}>
              <label style={{ display: 'grid', gap: '4px', flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>Nome</span>
                <input type="text" value={newVariantName} onChange={e => setNewVariantName(e.target.value)}
                  placeholder="Ex: PLA Prata" style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '13px',
                  }} />
              </label>
              <label style={{ display: 'grid', gap: '4px', width: '120px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>R$/kg</span>
                <input type="number" value={newVariantPrice} onChange={e => setNewVariantPrice(e.target.value)}
                  placeholder="100" style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '13px',
                  }} />
              </label>
              <button onClick={handleAddVariant} disabled={addingVariant || !newVariantName.trim()} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--accent)', background: 'transparent',
                cursor: (addingVariant || !newVariantName.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '13px', color: 'var(--accent)', fontWeight: 600,
              }}>
                {addingVariant ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                Imagens
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{product.images.length} imagem(ns)</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px',
                    color: 'var(--text-h)', fontWeight: '500',
                    transition: 'all 0.15s',
                  }}>
                  {uploading ? 'Enviando...' : 'Enviar imagem'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              </div>
            </div>

            {product.images.length === 0 ? (
              <p style={{ color: 'var(--text)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
                Nenhuma imagem. Clique em "Enviar imagem" para adicionar.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                {product.images.map(img => {
                  const imgSrc = `${API_URL}/images/products/${img.file_path.split(/[/\\]/).pop()}`;
                  return (
                    <div key={img.id} style={{
                      aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                      border: img.is_primary ? '2px solid var(--accent)' : '1px solid var(--border)',
                      position: 'relative', cursor: 'default',
                      transition: 'all 0.15s',
                    }}>
                      <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onClick={() => handleSetPrimary(img.id)}
                      />
                      {img.source === 'thingiverse' && (
                        <span style={{
                          position: 'absolute', top: '3px', left: '3px',
                          color: '#2596be', opacity: '0.85',
                          display: 'flex',
                        }}>
                          <ThingiverseIcon size={14} />
                        </span>
                      )}
                      {img.is_primary && (
                        <span style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'var(--accent)', color: '#fff',
                          fontSize: '9px', textAlign: 'center', padding: '2px 0',
                          fontWeight: '600',
                        }}>Principal</span>
                      )}
                      <button onClick={() => handleDeleteImage(img)} style={{
                        position: 'absolute', top: '3px', right: '3px',
                        width: '18px', height: '18px', borderRadius: '50%',
                        border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff',
                        cursor: 'pointer', fontSize: '10px', lineHeight: '1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, opacity: '0.7',
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                        title="Remover imagem">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: '12px', alignItems: 'center',
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={handleDeleteProduct} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)',
              background: 'transparent', cursor: 'pointer', fontSize: '13px',
              color: 'var(--danger)', fontWeight: '500',
            }}>
              Excluir produto
            </button>
            {message && (
              <span style={{ color: messageType === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '14px', fontWeight: '500' }}>
                {message}
              </span>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: saving ? 'var(--border-h)' : 'var(--accent)',
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
          }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          fontSize: '14px', transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.outline = 'none'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
    </label>
  );
}
