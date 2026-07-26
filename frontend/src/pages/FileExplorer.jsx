import { useState, useEffect, useRef } from 'react';
import api, { API_URL } from '../api';
import ThingiverseIcon from '../components/ThingiverseIcon';
import STLViewer from '../components/STLViewer';

export default function FileExplorer() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterSliced, setFilterSliced] = useState('all');
  const [contextMenu, setContextMenu] = useState(null);
  const [linkingGcode, setLinkingGcode] = useState(null);
  const [replacingGcode, setReplacingGcode] = useState(null);
  const [viewingStl, setViewingStl] = useState(null);
  const [uploadFiles, setUploadFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
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
      setLoading(true);
      setError(null);
      const res = await api.get(`${API_URL}/stl/projects`);
      setProjects(res.data);
    } catch {
      setError('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (const f of uploadFiles) {
      formData.append('files', f);
    }
    try {
      await api.post(`${API_URL}/stl/upload`, formData);
      showMessage('Upload concluído!');
      setUploadFiles(null);
      loadProjects();
    } catch {
      showMessage('Erro no upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({ x, y, project });
  };

  const handleDownloadStl = async (e, project) => {
    if (e) e.stopPropagation();
    try {
      const resp = await api.get(`${API_URL}/stl/projects/${project.id}/download/stl`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.headers['content-disposition']?.match(/filename="?(.+?)"?$/)?.[1] || `${project.name}.stl`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Download iniciado!');
    } catch {
      showMessage('Erro ao baixar STL', 'error');
    }
    setContextMenu(null);
  };

  const handleDownloadGcode = async (e, project) => {
    if (e) e.stopPropagation();
    try {
      const resp = await api.get(`${API_URL}/stl/projects/${project.id}/download/gcode`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.headers['content-disposition']?.match(/filename="?(.+?)"?$/)?.[1] || `${project.name}.gcode`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('GCode baixado!');
    } catch {
      showMessage('Nenhum GCode para baixar', 'error');
    }
    setContextMenu(null);
  };

  const handleLinkGcode = async (e, project) => {
    if (e) e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`${API_URL}/stl/projects/${project.id}/link-gcode`, formData);
      showMessage('GCode vinculado!');
      loadProjects();
    } catch {
      showMessage('Erro ao vincular GCode', 'error');
    }
    setLinkingGcode(null);
    setContextMenu(null);
  };

  const handleUnlinkGcode = async (project) => {
    const gcode = project.files.find(f => f.file_type === 'gcode');
    if (!gcode) return;
    if (!confirm(`Remover GCode "${gcode.filename}" do projeto "${project.title || project.name}"?`)) return;
    try {
      await api.delete(`${API_URL}/stl/projects/${project.id}/files/${gcode.id}`);
      showMessage('GCode desvinculado!');
      loadProjects();
    } catch {
      showMessage('Erro ao desvincular GCode', 'error');
    }
    setContextMenu(null);
  };

  const handleReplaceGcode = async (e, project) => {
    if (e) e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.put(`${API_URL}/stl/projects/${project.id}/gcode`, formData);
      showMessage('GCode substituído!');
      loadProjects();
    } catch {
      showMessage('Erro ao substituir GCode', 'error');
    }
    setReplacingGcode(null);
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
      await api.post(`${API_URL}/jobs/queue`, null, { params: { filename: gcode.filename } });
      showMessage('Adicionado à fila do Moonraker!');
    } catch {
      showMessage('Erro ao adicionar à fila', 'error');
    }
    setContextMenu(null);
  };

  const handleSendToPrinter = async (e, project, startImmediately = false) => {
    e.stopPropagation();
    try {
      const resp = await api.post(`${API_URL}/stl/projects/${project.id}/send-to-printer?start=${startImmediately}`);
      showMessage(resp.data.detail);
    } catch {
      showMessage('Erro ao enviar para impressora', 'error');
    }
  };

  const handleDeleteProject = async (e, project) => {
    if (e) e.stopPropagation();
    if (!confirm(`Remover projeto "${project.title || project.name}" permanentemente?`)) return;
    try {
      await api.delete(`${API_URL}/stl/projects/${project.id}`);
      showMessage('Projeto removido!');
      loadProjects();
    } catch {
      showMessage('Erro ao remover projeto', 'error');
    }
    setContextMenu(null);
  };

  const handleEditProject = async (id, title, description) => {
    try {
      const resp = await api.patch(`${API_URL}/stl/projects/${id}`, { title, description });
      showMessage(resp.data.info_pending === false && title ? 'Projeto atualizado! Produto criado automaticamente.' : 'Projeto atualizado!');
      setEditing(null);
      loadProjects();
    } catch {
      showMessage('Erro ao atualizar', 'error');
    }
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

  if (loading) return <p>Carregando...</p>;

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

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>
          <button onClick={loadProjects} style={{ marginTop: '8px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}>Tentar novamente</button>
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m-4-4l4 4 4-4M8 8l4-4 4 4"/></svg>
          Upload Manual
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: '6px', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Arquivos STL ou ZIP</span>
            <input
              type="file" accept=".stl,.zip" multiple
              onChange={e => setUploadFiles(Array.from(e.target.files))}
              style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>.stl ou .zip com STLs dentro</span>
          </label>
          {uploadFiles && (
            <div style={{ fontSize: '13px', color: 'var(--text)', padding: '8px 0' }}>
              {uploadFiles.length} arquivo(s)
            </div>
          )}
          <button onClick={handleUpload} disabled={!uploadFiles || uploading} style={{
            padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: !uploadFiles || uploading ? 'var(--border-h)' : 'var(--accent)',
            color: '#fff', cursor: !uploadFiles || uploading ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px',
          }}>
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </button>
        </div>
      </div>

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
        <span style={{ fontSize: '13px', color: 'var(--text)', padding: '8px 0' }}>
          {filtered.length} projeto(s)
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontSize: '14px' }}>Nenhum projeto encontrado.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <ThingiverseIcon size={14} />
            <span style={{ flex: 1 }}>Projetos</span>
            <span style={{ textAlign: 'center', width: '80px' }}>Arquivos</span>
          </div>
          {filtered.map(p => (
            <div key={p.id}
              onContextMenu={e => handleContextMenu(e, p)}>
              <ProjectRow project={p} onEdit={setEditing} onDelete={handleDeleteProject}
                onDownloadStl={handleDownloadStl} onDownloadGcode={handleDownloadGcode} onLinkGcode={handleLinkGcode}
                onSendToPrinter={handleSendToPrinter} onViewStl={handleViewStl} />
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditProjectModal
          project={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditProject}
        />
      )}

      {contextMenu && (
        <div ref={menuRef} style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          zIndex: 200, minWidth: '180px', padding: '4px', fontSize: '13px',
        }} onClick={e => e.stopPropagation()}>
          <MenuItem label="Baixar STL" icon="M12 4v16m-4-4l4 4 4-4" onClick={() => handleDownloadStl(null, contextMenu.project)} />
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
              onClick={() => handleDownloadGcode(null, contextMenu.project)} />
          )}
          {contextMenu.project.files.some(f => f.file_type === 'gcode') && (
            <MenuItem label="Enviar para fila" icon="M5 12h14m-7-7l7 7-7 7"
              onClick={() => handleSendToQueue(contextMenu.project)} />
          )}
          {contextMenu.project.files.some(f => f.file_type === 'gcode') && (
            <MenuItem label="Substituir GCode" icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              onClick={() => {
                setReplacingGcode(contextMenu.project.id);
                setTimeout(() => document.getElementById(`replace-gcode-${contextMenu.project.id}`)?.click(), 0);
              }}
            />
          )}
          {contextMenu.project.files.some(f => f.file_type === 'gcode') && (
            <MenuItem label="Desvincular GCode" icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              onClick={() => handleUnlinkGcode(contextMenu.project)} />
          )}
          <MenuItem label="Excluir projeto" icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            onClick={() => handleDeleteProject(null, contextMenu.project)} />
        </div>
      )}

      {linkingGcode && (
        <input type="file" accept=".gcode"
          id={`gcode-${linkingGcode}`}
          style={{ display: 'none' }}
          onChange={e => {
            const proj = projects.find(p => p.id === linkingGcode);
            if (proj) handleLinkGcode(e, proj);
          }}
        />
      )}

      {replacingGcode && (
        <input type="file" accept=".gcode"
          id={`replace-gcode-${replacingGcode}`}
          style={{ display: 'none' }}
          onChange={e => {
            const proj = projects.find(p => p.id === replacingGcode);
            if (proj) handleReplaceGcode(e, proj);
          }}
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

function ProjectRow({ project, onEdit, onDelete, onDownloadStl, onDownloadGcode, onLinkGcode, onSendToPrinter, onViewStl }) {
  const hasStl = project.files.some(f => f.file_type === 'stl');
  const hasGcode = project.files.some(f => f.file_type === 'gcode');
  const [linkingId, setLinkingId] = useState(null);

  return (
    <div
      onClick={() => onEdit(project)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: project.info_pending ? 'rgba(239,68,68,0.04)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = project.info_pending ? 'rgba(239,68,68,0.04)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.title || project.name}
            </strong>
            {project.source === 'thingiverse' && (
              <ThingiverseIcon size={14} />
            )}
            {project.info_pending && (
              <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: '600' }}>
                Informações pendentes
              </span>
            )}
            {!hasGcode && (
              <span style={{
                fontSize: '11px', padding: '1px 6px', borderRadius: '3px',
                background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                fontWeight: '600',
              }}>
                Não fatiado
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span>{project.files.length} arquivo(s)</span>
            <span>{hasStl ? 'STL' : ''}{hasStl && hasGcode ? ' + ' : ''}{hasGcode ? 'GCode' : ''}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        {hasStl && (
          <button onClick={e => onDownloadStl(e, project)} title="Baixar STL" style={{
            padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m-4-4l4 4 4-4M8 8l4-4 4 4"/></svg>
          </button>
        )}
        {hasStl && (
          <button onClick={e => { e.stopPropagation(); onViewStl(project); }} title="Visualizar 3D" style={{
            padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
          </button>
        )}
        {hasGcode && (
          <button onClick={e => onDownloadGcode(e, project)} title="Baixar GCode" style={{
            padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--success)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m-4-4l4 4 4-4"/></svg>
          </button>
        )}
        {hasGcode && (
          <>
            <button onClick={e => onSendToPrinter(e, project, false)} title="Enviar para fila" style={{
              padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)',
              background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14v4h12v-4"/><circle cx="18" cy="16" r="1"/></svg>
            </button>
            <button onClick={e => onSendToPrinter(e, project, true)} title="Imprimir agora" style={{
              padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)',
              background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--success)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </>
        )}
        {!hasGcode && (
          <>
            <button onClick={() => setLinkingId(project.id)} title="Vincular GCode" style={{
              padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--warning)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </button>
            {linkingId === project.id && (
              <input type="file" accept=".gcode" style={{ width: '100px', fontSize: '11px' }}
                onChange={e => { onLinkGcode(e, project); setLinkingId(null); }} />
            )}
          </>
        )}
        <button onClick={e => { e.stopPropagation(); onEdit(project); }} style={{
          padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--text)',
        }}>
          Editar
        </button>
        <button onClick={e => onDelete(e, project)} style={{
          padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)',
          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)',
        }}>
          Excluir
        </button>
      </div>
    </div>
  );
}

function EditProjectModal({ project, onClose, onSave }) {
  const [title, setTitle] = useState(project.title || project.name);
  const [description, setDescription] = useState(project.description || '');
  const [viewingStl, setViewingStl] = useState(null);
  const gcodeInputRef = useRef(null);
  const linkingStlRef = useRef(null);

  const stlFiles = project.files.filter(f => f.file_type === 'stl');

  const gcodeByStlId = {};
  project.files.filter(f => f.file_type === 'gcode' && f.stl_file_id).forEach(g => {
    gcodeByStlId[g.stl_file_id] = g;
  });

  const allStlsHaveGcode = stlFiles.every(f => gcodeByStlId[f.id]);

  const handleLinkGcodeStl = async (e, stlId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`${API_URL}/stl/projects/${project.id}/link-gcode?stl_file_id=${stlId}`, formData);
      alert('GCode vinculado!');
      window.location.reload();
    } catch {
      alert('Erro ao vincular GCode');
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
        width: '90vw', maxWidth: '540px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Editar Projeto</h2>
        </div>
        <div style={{ padding: '24px', overflow: 'auto', display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Título</span>
            <input value={title} onChange={e => setTitle(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </label>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Descrição</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', resize: 'vertical' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '14px', margin: '0 0 10px', color: 'var(--text-h)' }}>
              Arquivos ({project.files.length})
            </h3>
            {stlFiles.map(f => {
              const gcode = gcodeByStlId[f.id];
              return (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px', marginTop: '4px',
                  background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gcode ? 'var(--success)' : 'var(--text)'} strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span style={{ flex: 1, color: 'var(--text-h)' }}>{f.filename}</span>
                  {gcode ? (
                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>✓ {gcode.filename}</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600' }}>Sem GCode</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setViewingStl(f.id); }} title="Visualizar 3D" style={{
                    padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
                  </button>
                  {!gcode && (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      linkingStlRef.current = f.id;
                      gcodeInputRef.current.value = '';
                      gcodeInputRef.current.click();
                    }} title="Vincular GCode" style={{
                      padding: '2px 8px', borderRadius: '3px', border: '1px solid var(--accent)',
                      background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)',
                    }}>
                      + GCode
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
          {!allStlsHaveGcode && stlFiles.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--danger)', flex: 1 }}>Vincule GCode a todos os STLs para criar o produto</span>
          )}
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: '14px',
          }}>Cancelar</button>
          <button onClick={() => onSave(project.id, title, description)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
          }}>Salvar</button>
        </div>
      </div>

      <input type="file" accept=".gcode" ref={gcodeInputRef} style={{ display: 'none' }}
        onChange={e => {
          const stlId = linkingStlRef.current;
          linkingStlRef.current = null;
          if (stlId) handleLinkGcodeStl(e, stlId);
        }}
      />

      {viewingStl && (
        <STLViewer
          url={`${API_URL}/stl/projects/${project.id}/files/${viewingStl}/view`}
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
