import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

function fmt(v) {
  if (v == null || isNaN(v)) return '0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Field({ label, value, onChange, type = 'number', placeholder, min, step, suffix }) {
  return (
    <label style={{ display: 'grid', gap: '4px' }}>
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', fontSize: '14px',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.outline = 'none'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        {suffix && <span style={{ fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
    </label>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '8px 0',
      borderBottom: '1px solid var(--border)', fontSize: '14px',
    }}>
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <span style={{ fontWeight: highlight ? '700' : '500', color: highlight ? 'var(--accent)' : 'var(--text-h)', fontSize: highlight ? '16px' : '14px' }}>
        R$ {fmt(value)}
      </span>
    </div>
  );
}

export default function Costs() {
  const [spools, setSpools] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filamentGrams, setFilamentGrams] = useState(0);
  const [filamentPriceKg, setFilamentPriceKg] = useState(0);
  const [printerWatts, setPrinterWatts] = useState(250);
  const [printTimeHours, setPrintTimeHours] = useState(0);
  const [kwhRate, setKwhRate] = useState(0.95);
  const [laborPerHour, setLaborPerHour] = useState(0);
  const [laborHours, setLaborHours] = useState(0);
  const [fixedCost, setFixedCost] = useState(0);
  const [ecommerceFee, setEcommerceFee] = useState(0);
  const [profitMargin, setProfitMargin] = useState(30);
  const [selectedSpoolId, setSelectedSpoolId] = useState('');

  const [parsing, setParsing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [sRes, spRes] = await Promise.all([
        axios.get(`${API_URL}/costs/settings`),
        axios.get(`${API_URL}/filament/spools`),
      ]);
      const cs = sRes.data;
      setPrinterWatts(cs.printer_watts ?? 250);
      setKwhRate(cs.kwh_rate ?? 0.95);
      setLaborPerHour(cs.labor_cost_per_hour ?? 0);
      setFixedCost(cs.fixed_cost_per_print ?? 0);
      setEcommerceFee(cs.ecommerce_fee_percent ?? 0);
      setProfitMargin(cs.profit_margin_percent ?? 30);
      setSpools(spRes.data.spools || []);
    } catch {
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSpoolSelect = (spoolId) => {
    setSelectedSpoolId(spoolId);
    const spool = spools.find(s => String(s.id) === spoolId);
    if (spool) {
      const f = spool.filament || {};
      setFilamentPriceKg(f.price || spool.price || 0);
    }
  };

  const handleParseGcode = async (file) => {
    if (!file) return;
    setParsing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/costs/parse-gcode`, formData);
      const { parsed, settings: cs, spools: sp } = res.data;
      setFilamentGrams(parsed.filament_grams);
      const hours = parsed.print_time_seconds / 3600;
      setPrintTimeHours(parseFloat(hours.toFixed(2)));
      if (cs) {
        setPrinterWatts(cs.printer_watts ?? 250);
        setKwhRate(cs.kwh_rate ?? 0.95);
        setLaborPerHour(cs.labor_cost_per_hour ?? 0);
        setFixedCost(cs.fixed_cost_per_print ?? 0);
        setEcommerceFee(cs.ecommerce_fee_percent ?? 0);
        setProfitMargin(cs.profit_margin_percent ?? 30);
      }
      if (sp?.length) {
        setSpools(sp);
      }
    } catch {
      setError('Erro ao analisar GCode');
    } finally {
      setParsing(false);
    }
  };

  const handleCalculate = () => {
    const seconds = Math.round(printTimeHours * 3600);
    axios.post(`${API_URL}/costs/estimate`, {
      filament_grams: filamentGrams,
      print_time_seconds: seconds,
      filament_price_per_kg: filamentPriceKg,
      printer_watts: printerWatts,
      kwh_rate: kwhRate,
      labor_cost_per_hour: laborPerHour,
      labor_hours: laborHours,
      fixed_cost_per_print: fixedCost,
      ecommerce_fee_percent: ecommerceFee,
      profit_margin_percent: profitMargin,
    })
      .then(res => setResult(res.data))
      .catch(() => setError('Erro ao calcular'));
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Custos</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
        Calculadora de custo de impressão 3D
      </p>

      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
          marginBottom: '16px', fontSize: '14px', fontWeight: '500',
        }}>{error}</div>
      )}

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              GCode (opcional)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '12px' }}>
              Faça upload de um GCode para preencher automaticamente gramas e tempo.
            </p>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="file" accept=".gcode"
                onChange={e => handleParseGcode(e.target.files[0])}
                style={{ flex: 1, fontSize: '13px' }}
              />
              {parsing && <span style={{ fontSize: '13px', color: 'var(--accent)' }}>Analisando...</span>}
            </label>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              Filamento
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {spools.length > 0 && (
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Spool</span>
                  <select
                    value={selectedSpoolId}
                    onChange={e => handleSpoolSelect(e.target.value)}
                    style={{
                      padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', fontSize: '14px',
                    }}
                  >
                    <option value="">Selecionar spool...</option>
                    {spools.map(s => {
                      const f = s.filament || {};
                      return (
                        <option key={s.id} value={s.id}>
                          {f.name || f.material || `Spool #${s.id}`} — {f.vendor?.name || '—'} (R$ {fmt(f.price || s.price || 0)}/kg)
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}
              <Field label="Quantidade usada" value={filamentGrams} onChange={setFilamentGrams} step={0.1} suffix="g" />
              <Field label="Preço do filamento" value={filamentPriceKg} onChange={setFilamentPriceKg} step={0.5} suffix="R$/kg" />
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Energia e Tempo
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <Field label="Consumo da impressora" value={printerWatts} onChange={setPrinterWatts} step={10} suffix="W" />
              <Field label="Tempo de impressão" value={printTimeHours} onChange={setPrintTimeHours} step={0.1} suffix="horas" />
              <Field label="Valor do kWh" value={kwhRate} onChange={setKwhRate} step={0.01} suffix="R$" />
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Opcionais
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <Field label="Mão de obra" value={laborPerHour} onChange={setLaborPerHour} step={1} suffix="R$/h" />
              <Field label="Horas de trabalho" value={laborHours} onChange={setLaborHours} step={0.25} suffix="h" />
              <Field label="Custos fixos (peça)" value={fixedCost} onChange={setFixedCost} step={0.5} suffix="R$" />
              <Field label="Taxa do e-commerce" value={ecommerceFee} onChange={setEcommerceFee} step={1} suffix="%" />
              <Field label="Margem de lucro" value={profitMargin} onChange={setProfitMargin} step={5} suffix="%" />
            </div>
          </div>

          <button onClick={handleCalculate} style={{
            padding: '12px 24px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
            fontWeight: '700', fontSize: '15px', width: '100%',
          }}>
            Calcular Custo
          </button>
        </div>

        <div style={{ display: 'grid', gap: '20px', position: 'sticky', top: '32px' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Resultado
            </h2>
            <div>
              <ResultRow label="Filamento" value={result?.filament_cost ?? 0} />
              <ResultRow label="Energia" value={result?.electricity_cost ?? 0} />
              <ResultRow label="Mão de obra" value={result?.labor_cost ?? 0} />
              <ResultRow label="Custos fixos" value={result?.fixed_cost ?? 0} />
              <div style={{ borderTop: '2px solid var(--text)', margin: '4px 0' }} />
              <ResultRow label="Custo de produção" value={result?.production_cost ?? 0} highlight />
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <ResultRow label="Taxa e-commerce" value={result?.ecommerce_fee ?? 0} />
              <ResultRow label="Lucro estimado" value={result?.profit_amount ?? 0} />
              <div style={{ borderTop: '2px solid var(--accent)', margin: '4px 0' }} />
              <ResultRow label="Preço final sugerido" value={result?.final_price ?? 0} highlight />
            </div>
            {result && result.final_price > 0 && (
              <div style={{
                marginTop: '16px', padding: '12px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(124,58,237,0.06)', textAlign: 'center',
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Valor sugerido de venda</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent)' }}>
                  R$ {fmt(result.final_price)}
                </div>
              </div>
            )}
          </div>

          {result && result.final_price > 0 && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Distribuição dos custos</h3>
              {(() => {
                const total = result.filament_cost + result.electricity_cost + result.labor_cost + result.fixed_cost || 1;
                const items = [
                  { label: 'Filamento', value: result.filament_cost, color: '#7c3aed' },
                  { label: 'Energia', value: result.electricity_cost, color: '#f59e0b' },
                  { label: 'Mão de obra', value: result.labor_cost, color: '#22c55e' },
                  { label: 'Custos fixos', value: result.fixed_cost, color: '#ef4444' },
                ].filter(i => i.value > 0);
                return (
                  <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
                    {items.map(i => (
                      <div key={i.label} style={{
                        flex: i.value / total, background: i.color, minWidth: '4px',
                        position: 'relative',
                      }} title={`${i.label}: ${((i.value / total) * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[
                  { label: 'Filamento', color: '#7c3aed' },
                  { label: 'Energia', color: '#f59e0b' },
                  { label: 'Mão de obra', color: '#22c55e' },
                  { label: 'Custos fixos', color: '#ef4444' },
                ].map(i => (
                  <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: i.color }} />
                    {i.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
