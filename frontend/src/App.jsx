import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Thingiverse from './pages/Thingiverse';
import Settings from './pages/Settings';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'products', label: 'Produtos', icon: '📦' },
  { id: 'orders', label: 'Pedidos', icon: '🛒' },
  { id: 'printers', label: 'Impressoras', icon: '🖨️' },
  { id: 'filament', label: 'Filamento', icon: '🧵' },
  { id: 'thingiverse', label: 'Thingiverse', icon: '⬇️' },
  { id: 'settings', label: 'Configurações', icon: '⚙️' },
];

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'thingiverse':
        return <Thingiverse />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div>
            <h1>{menuItems.find(m => m.id === currentPage)?.label}</h1>
            <p style={{ color: 'var(--text)', marginTop: '12px' }}>Em breve.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--sans)' }}>
      <aside style={{
        width: '220px',
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '20px 16px',
          fontWeight: '700',
          fontSize: '18px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-h)',
        }}>
          Arsenal 3D
        </div>

        <nav style={{ padding: '8px', flex: 1 }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '2px',
                background: currentPage === item.id ? 'var(--accent-bg)' : 'transparent',
                color: currentPage === item.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: currentPage === item.id ? '600' : '400',
                textAlign: 'left',
                fontSize: '14px',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px',
        background: 'var(--bg)',
      }}>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
