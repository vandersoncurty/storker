import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/`);
      setProducts(res.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Produtos</h1>
      {products.length === 0 ? (
        <p style={{ color: 'var(--text)', marginTop: '12px' }}>
          Nenhum produto. Sincronize coleções no Thingiverse para importar modelos.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} onRefresh={loadProducts} onEdit={setEditing} />
          ))}
        </div>
      )}
      {editing && <EditModal product={editing} onClose={() => setEditing(null)} onRefresh={loadProducts} />}
    </div>
  );
}

function ProductCard({ product, onRefresh, onEdit }) {
  const primaryImage = product.images.find(i => i.is_primary);
  const thingiverseImage = product.images.find(i => i.source === 'thingiverse');

  const imageUrl = primaryImage
    ? `http://localhost:8000/images/products/${primaryImage.file_path.split('/').pop()}`
    : null;

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s',
    }}
      onClick={() => onEdit(product)}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ height: '180px', background: 'var(--code-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: 'var(--text)', fontSize: '14px' }}>Sem imagem</span>
        )}

        {thingiverseImage && (
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#1a73e8',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: '600',
          }}>
            Thingiverse
          </span>
        )}

        {!product.is_sliced && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: '600',
          }}>
            Não fatiado
          </span>
        )}
      </div>

      <div style={{ padding: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-h)' }}>{product.title}</h3>
        {product.description && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '13px', color: 'var(--text)' }}>
          {product.filament_grams && <span>{product.filament_grams}g</span>}
          {product.sale_price && <span>R$ {product.sale_price}</span>}
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
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/products/${product.id}`, {
        ...form,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        production_cost: form.production_cost ? parseFloat(form.production_cost) : null,
        taxes_fees: form.taxes_fees ? parseFloat(form.taxes_fees) : null,
        filament_grams: form.filament_grams ? parseFloat(form.filament_grams) : null,
        print_time_seconds: form.print_time_seconds ? parseInt(form.print_time_seconds) : null,
      });
      setMessage('Salvo!');
      onRefresh();
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/products/${product.id}/images/upload`, formData);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await axios.patch(`${API_URL}/products/${product.id}/images/${imageId}/primary`);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', borderRadius: '12px', padding: '24px',
        width: '90vw', maxWidth: '720px', maxHeight: '85vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Editar Produto</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text)' }}>X</button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <Field label="Título" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Descrição</span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={5}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px', resize: 'vertical', minHeight: '80px' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Peso filamento (g)" type="number" value={form.filament_grams} onChange={v => setForm(f => ({ ...f, filament_grams: v }))} />
            <Field label="Tempo impressão (s)" type="number" value={form.print_time_seconds} onChange={v => setForm(f => ({ ...f, print_time_seconds: v }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field label="Custo produção (R$)" type="number" value={form.production_cost} onChange={v => setForm(f => ({ ...f, production_cost: v }))} />
            <Field label="Preço venda (R$)" type="number" value={form.sale_price} onChange={v => setForm(f => ({ ...f, sale_price: v }))} />
            <Field label="Impostos/taxas (R$)" type="number" value={form.taxes_fees} onChange={v => setForm(f => ({ ...f, taxes_fees: v }))} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={form.is_sliced}
              onChange={e => setForm(f => ({ ...f, is_sliced: e.target.checked }))}
            />
            Modelo fatiado (pronto pra imprimir)
          </label>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Imagens</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>{product.images.length} imagem(ns)</span>
              <button onClick={() => fileInputRef.current?.click()} style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'var(--bg)', cursor: 'pointer', fontSize: '13px',
              }}>
                Enviar imagem
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
            {product.images.map(img => {
              const imgSrc = `http://localhost:8000/images/products/${img.file_path.split('/').pop()}`;
              return (
                <div key={img.id} style={{
                  aspectRatio: '1', borderRadius: '6px', overflow: 'hidden',
                  border: img.is_primary ? '2px solid var(--accent)' : '1px solid var(--border)',
                  position: 'relative', cursor: 'pointer',
                }} onClick={() => handleSetPrimary(img.id)}>
                  <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {img.source === 'thingiverse' && (
                    <span style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: '#1a73e8', color: '#fff', fontSize: '9px',
                      textAlign: 'center', padding: '1px 0',
                    }}>TV</span>
                  )}
                  {img.is_primary && (
                    <span style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      background: 'var(--accent)', color: '#fff', fontSize: '9px',
                      textAlign: 'center', padding: '1px 0',
                    }}>Principal</span>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text)', marginTop: '6px' }}>
            Clique para definir como imagem principal. Imagens do Thingiverse tem selo "TV".
          </p>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: '6px', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600',
          }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {message && <span style={{ color: '#22c55e' }}>{message}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label style={{ display: 'grid', gap: '4px' }}>
      <span style={{ fontSize: '14px', fontWeight: '500' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          fontSize: '14px',
        }}
      />
    </label>
  );
}
