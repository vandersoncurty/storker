import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

function App() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [gcode, setGcode] = useState('');
  const [grams, setGrams] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');

  // Carrega produtos cadastrados ao abrir a tela
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/`);
      setProducts(response.data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/products/`, {
        name,
        gcode_filename: gcode,
        filament_grams: parseFloat(grams),
        print_time_seconds: parseInt(time),
        sale_price: parseFloat(price)
      });
      // Limpa formulário e recarrega a lista
      setName(''); setGcode(''); setGrams(''); setTime(''); setPrice('');
      fetchProducts();
    } catch (error) {
      console.error("Erro ao cadastrar produto:", error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>⚙️ Painel Impressão 3D</h1>
      
      <h2>Cadastrar Novo Produto</h2>
      <form onSubmit={handleCreateProduct} style={{ display: 'grid', gap: '10px', marginBottom: '30px' }}>
        <input placeholder="Nome do Produto" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Nome do arquivo .gcode" value={gcode} onChange={e => setGcode(e.target.value)} required />
        <input placeholder="Peso em Filamento (g)" type="number" value={grams} onChange={e => setGrams(e.target.value)} required />
        <input placeholder="Tempo de Impressão (segundos)" type="number" value={time} onChange={e => setTime(e.target.value)} required />
        <input placeholder="Preço de Venda (R$)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Salvar Produto</button>
      </form>

      <h2>Produtos No Catálogo</h2>
      <ul>
        {products.map(p => (
          <li key={p.id} style={{ marginBottom: '10px' }}>
            <strong>{p.name}</strong> - G-code: <code>{p.gcode_filename}</code> | {p.filament_grams}g | R$ {p.sale_price}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;