import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import STLViewer from '../components/STLViewer';

export default function FileExplorer() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterSliced, setFilterSliced] = useState('all');
  const [contextMenu, setContextMenu] = useState(null);
  const [linkingGcode, setLinkingGcode] = useState(null);
  const [viewingStl, setViewingStl] = useState(null);
  const [message, setMessage] = useState(null);

  const menuRef = useRef(null);

  useEffect(() => {
    loadProjects();
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadProjects = async () => {
    try {
      const res = await axios.get(`${API_URL}/stl/projects`);
      setProjects(res.data);
    } catch {
      console.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({ x, y, project });
  };

  const handleDownloadStl = async (project) => {
    try {
      const resp = await axios.get(`${API_URL}/stl/projects/${project.id}/download/stl`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.headers['content-disposition']?.match(/filename="?(.+?)"?$/)?.[1] || `${project.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Download iniciado!');
    } catch {
      showMessage('Erro ao baixar STL', 'error');
    }
    setContextMenu(null);
  };

  const handleDownloadGcode = async (project) => {
    try {
      const resp = await axios.get(`${API_URL}/stl/projects/${project.id}/download/gcode`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.headers['content-disposition']?.match(/filename="?(.+?)"?$/)?.[1] || `${project.name}_gcode.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('GCode baixado!');
    } catch {
      showMessage('Nenhum GCode para baixar', 'error');
    }
    setContextMenu(null);
  };

  const handleLinkGcode = async (e, project) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/stl/projects/${project.id}/link-gcode`, formData);
      showMessage('GCode vinculado!');
      loadProjects();
    } catch {
      showMessage('Erro ao vincular GCode', 'error');
    }
    setLinkingGcode(null);
    setContextMenu(null);
  };

  const handleSendToQueue = async (project) => {
    const gcode = project.files.find(f => f.file_type === 'gcode');
    if (!gcode) {
      showMessage('Projeto não possui GCode vinculado', 'error');
      setContextMenu(null);
      return;
    }
    try {
      await axios.post(`${API_URL}/jobs/queue`, null, { params: { filename: gcode.filename } });
      showMessage('Adicionado à fila do Moonraker!');
    } catch {
      showMessage('Erro ao adicionar à fila', 'error');
    }
    setContextMenu(null);
  };

  const handleDeleteProject = async (project) => {
    if (!confirm(`Remover projeto "${project.title || project.name}" permanentemente?`)) return;
    try {
      await axios.delete(`${API_URL}/stl/projects/${project.id}`);
      showMessage('Projeto removido!');
      loadProjects();
    } catch {
      showMessage('Erro ao remover projeto', 'error');
    }
    setContextMenu(null);
  };

  const handleViewStl = (project) => {
    const stl = project.files.find(f => f.file_type === 'stl');
    if (!stl) return;
    setViewingStl({ projectId: project.id, fileId: stl.id });
    setContextMenu(null);
  };

  let filtered = projects;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.title && p.title.toLowerCase().includes(q)));
  }
  if (filterSource !== 'all') {
    filtered = filtered.filter(p => p.source === filterSource);
  }
  if (filterSliced !== 'all') {
    const hasGcode = p => p.files.some(f => f.file_type === 'gcode');
    filtered = filtered.filter(p => filterSliced === 'sliced' ? hasGcode(p) : !hasGcode(p));
  }

  return (
    <div>
      <h1>Explorador de Arquivos</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
        Navegue, filtre e gerencie seus arquivos STL e GCode
      </p>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          marginBottom: '16px', fontSize: '14px', fontWeight: '500',
        }}>{message.text}</div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: '4px', minWidth: '200px', flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>Buscar</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome do projeto..."
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '4px', minWidth: '140px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>Origem</span>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg)' }}>
            <option value="all">Todas</option>
            <option value="upload">Upload</option>
            <option value="thingiverse">Thingiverse</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: '4px', minWidth: '140px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>Status</span>
          <select value={filterSliced} onChange={e => setFilterSliced(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg)' }}>
            <option value="all">Todos</option>
            <option value="unsliced">Não fatiado</option>
            <option value="sliced">Fatiado</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontSize: '14px' }}>Nenhum projeto encontrado.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ flex: 3 }}>Projeto</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Arquivos</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Status</span>
          </div>
          {filtered.map(p => (
            <div key={p.id}
              onContextMenu={e => handleContextMenu(e, p)}
              style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', cursor: 'context-menu',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {p.title || p.name}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                    {p.source === 'thingiverse' ? 'Thingiverse' : 'Upload'}
                    {p.info_pending ? ' • pendente' : ''}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '13px', color: 'var(--text)' }}>
                {p.files.filter(f => f.file_type === 'stl').length} STL
                {p.files.some(f => f.file_type === 'gcode') && (
                  <span style={{ marginLeft: '4px' }}>+ {p.files.filter(f => f.file_type === 'gcode').length} GCode</span>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {p.files.some(f => f.file_type === 'gcode') ? (
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', fontWeight: '600' }}>
                    Fatiado
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontWeight: '600' }}>
                    Não fatiado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div ref={menuRef} style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          zIndex: 200, minWidth: '180px', padding: '4px', fontSize: '13px',
        }} onClick={e => e.stopPropagation()}>
          <MenuItem label="Baixar STL" icon="M12 4v16m-4-4l4 4 4-4" onClick={() => handleDownloadStl(contextMenu.project)} />
          {contextMenu.project.files.some(f => f.file_type === 'stl') && (
            <MenuItem label="Visualizar 3D" icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z"
              onClick={() => handleViewStl(contextMenu.project)} />
          )}
          <MenuItem label="Vincular GCode" icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            onClick={() => {
              setLinkingGcode(contextMenu.project.id);
              setTimeout(() => document.getElementById(`gcode-${contextMenu.project.id}`)?.click(), 0);
            }}
          />
          {contextMenu.project.files.some(f => f.file_type === 'gcode') && (
            <MenuItem label="Baixar GCode" icon="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              onClick={() => handleDownloadGcode(contextMenu.project)} />
          )}
          {contextMenu.project.files.some(f => f.file_type === 'gcode') && (
            <MenuItem label="Enviar para fila" icon="M5 12h14m-7-7l7 7-7 7"
              onClick={() => handleSendToQueue(contextMenu.project)} />
          )}
          <MenuItem label="Excluir projeto" icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            onClick={() => handleDeleteProject(contextMenu.project)} />
        </div>
      )}

      {linkingGcode && (
        <input type="file" accept=".gcode"
          id={`gcode-${linkingGcode}`}
          style={{ display: 'none' }}
          onChange={e => handleLinkGcode(e, contextMenu?.project)}
        />
      )}

      {viewingStl && (
        <STLViewer
          url={`${API_URL}/stl/projects/${viewingStl.projectId}/files/${viewingStl.fileId}/view`}
          onClose={() => setViewingStl(null)}
        />
      )}
    </div>
  );
}

function MenuItem({ label, icon, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
      padding: '8px 12px', border: 'none', borderRadius: '4px',
      background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? 'var(--border-h)' : 'var(--text-h)',
      fontSize: '13px', textAlign: 'left', transition: 'background 0.1s',
      opacity: disabled ? '0.5' : '1',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--bg-muted)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d={icon} />
      </svg>
      {label}
    </button>
  );
}
