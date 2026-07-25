import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import ThingiverseIcon from '../components/ThingiverseIcon';

export default function StlFiles() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [uploadFiles, setUploadFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadProjects(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadProjects = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/stl/projects`);
      setProjects(res.data);
    } catch (err) {
      setError('Erro ao carregar projetos');
      console.error(err);
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
      await axios.post(`${API_URL}/stl/upload`, formData);
      showMessage('Upload concluído!');
      setUploadFiles(null);
      loadProjects();
    } catch {
      showMessage('Erro no upload', 'error');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleEditProject = async (id, title, description) => {
    try {
      await axios.patch(`${API_URL}/stl/projects/${id}`, { title, description });
      showMessage('Projeto atualizado!');
      setEditing(null);
      loadProjects();
    } catch {
      showMessage('Erro ao atualizar', 'error');
    }
  };

  const thingiverseProjects = projects.filter(p => p.source === 'thingiverse');
  const uploadedProjects = projects.filter(p => p.source === 'upload');

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Arquivos STL</h1>
      <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
        Gerencie seus arquivos STL e projetos de impressão 3D
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
        <div>
          <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>
          <button onClick={loadProjects} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}>Tentar novamente</button>
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m-4-4l4 4 4-4M8 8l4-4 4 4"/></svg>
          Upload Manual
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: '6px', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>Arquivos STL</span>
            <input
              type="file" accept=".stl" multiple
              onChange={e => setUploadFiles(Array.from(e.target.files))}
              style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
            />
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

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Meus Uploads ({uploadedProjects.length})</h2>
        </div>
        {uploadedProjects.length === 0 ? (
          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
            Nenhum upload ainda. Use o formulário acima.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '4px', padding: '12px' }}>
            {uploadedProjects.map(p => (
              <ProjectRow key={p.id} project={p} onEdit={setEditing} />
            ))}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ThingiverseIcon size={18} />
          <h2 style={{ margin: 0, fontSize: '16px' }}>Thingiverse ({thingiverseProjects.length})</h2>
        </div>
        {thingiverseProjects.length === 0 ? (
          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
            Nenhum modelo sincronizado. Vá em Configurações para configurar.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '4px', padding: '12px' }}>
            {thingiverseProjects.map(p => (
              <ProjectRow key={p.id} project={p} onEdit={setEditing} />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditProjectModal
          project={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditProject}
        />
      )}
    </div>
  );
}

function ProjectRow({ project, onEdit }) {
  const hasStl = project.files.some(f => f.file_type === 'stl');
  const hasGcode = project.files.some(f => f.file_type === 'gcode');

  return (
    <div
      onClick={() => onEdit(project)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderRadius: 'var(--radius-sm)',
        background: project.info_pending ? 'rgba(239,68,68,0.04)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = project.info_pending ? 'rgba(239,68,68,0.04)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
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
          <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px', display: 'flex', gap: '12px' }}>
            <span>{project.files.length} arquivo(s)</span>
            <span>{hasStl ? 'STL' : ''}{hasStl && hasGcode ? ' + ' : ''}{hasGcode ? 'GCode' : ''}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onEdit(project); }} style={{
          padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--text)',
        }}>
          Editar
        </button>
      </div>
    </div>
  );
}

function EditProjectModal({ project, onClose, onSave }) {
  const [title, setTitle] = useState(project.title || project.name);
  const [description, setDescription] = useState(project.description || '');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
        width: '90vw', maxWidth: '500px',
        boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Editar Projeto</h2>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
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
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', resize: 'vertical' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </label>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
    </div>
  );
}
