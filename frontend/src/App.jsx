import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import StlFiles from './pages/StlFiles';
import FileExplorer from './pages/FileExplorer';
import Settings from './pages/Settings';
import Printers from './pages/Printers';
import Jobs from './pages/Jobs';
import Filament from './pages/Filament';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'D', svg: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'products', label: 'Produtos', icon: 'P', svg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'stl', label: 'Arquivos STL', icon: 'S', svg: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z M12 3v6a1 1 0 001 1h6' },
  { id: 'explorer', label: 'Explorador', icon: 'E', svg: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { id: 'orders', label: 'Pedidos', icon: 'O', svg: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'printers', label: 'Impressoras', icon: 'I', svg: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' },
  { id: 'filament', label: 'Filamento', icon: 'F', svg: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 'settings', label: 'Configurações', icon: 'C', svg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'stl':
        return <StlFiles />;
      case 'explorer':
        return <FileExplorer />;
      case 'printers':
        return <Printers />;
      case 'filament':
        return <Filament />;
      case 'jobs':
        return <Jobs />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div style={{ padding: '32px' }}>
            <h1>{menuItems.find(m => m.id === currentPage)?.label}</h1>
            <p style={{ color: 'var(--text)', marginTop: '8px' }}>Em breve.</p>
          </div>
        );
      }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{
        width: '240px',
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '20px 20px',
          fontWeight: '700',
          fontSize: '18px',
          letterSpacing: '-0.5px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-h)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Storker
        </div>

        <nav style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: currentPage === item.id ? 'var(--accent-bg)' : 'transparent',
                color: currentPage === item.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: currentPage === item.id ? '600' : '400',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (currentPage !== item.id) { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-h)'; }}}
              onMouseLeave={e => { if (currentPage !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={currentPage === item.id ? 'var(--accent)' : 'var(--text)'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }}>
                <path d={item.svg} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: '12px',
          color: 'var(--text)',
          textAlign: 'center',
        }}>
          Storker v0.1
        </div>
      </aside>

      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px',
        background: 'var(--bg-muted)',
      }}>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
