import { useState, useMemo } from 'react';
import { generateId } from '../data/initialData';

const DOC_TYPES = [
  { value: 'contract', label: 'Contract', icon: '📄' },
  { value: 'invoice', label: 'Invoice', icon: '💰' },
  { value: 'proposal', label: 'Proposal', icon: '📋' },
  { value: 'report', label: 'Report', icon: '📊' },
  { value: 'other', label: 'Other', icon: '📎' },
];

const TYPE_COLORS = {
  contract: 'var(--info)',
  invoice: 'var(--success)',
  proposal: 'var(--brand)',
  report: 'var(--purple)',
  other: 'var(--slate)',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

const emptyForm = {
  name: '', type: 'other', clientId: '', projectId: '', fileUrl: '', fileSize: 0, notes: '', status: 'active',
};

export default function Documents({ documents, setDocuments, clients, projects }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const matchType = filterType === 'all' || doc.type === filterType;
      const matchClient = filterClient === 'all' || doc.clientId === filterClient;
      const matchSearch = !search ||
        doc.name?.toLowerCase().includes(search.toLowerCase()) ||
        doc.notes?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchClient && matchSearch;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [documents, filterType, filterClient, search]);

  const clientName = (id) => {
    const c = clients.find(c => c.id === id);
    return c ? c.company || c.name : '—';
  };

  const projectTitle = (id) => {
    const p = projects.find(p => p.id === id);
    return p ? p.title : '—';
  };

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(doc) {
    setEditing(doc);
    setForm({
      name: doc.name || '',
      type: doc.type || 'other',
      clientId: doc.clientId || '',
      projectId: doc.projectId || '',
      fileUrl: doc.fileUrl || '',
      fileSize: doc.fileSize || 0,
      notes: doc.notes || '',
      status: doc.status || 'active',
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editing) {
      setDocuments(prev => prev.map(d => d.id === editing.id ? { ...d, ...form } : d));
    } else {
      setDocuments(prev => [{ id: generateId(), ...form, createdAt: new Date().toISOString() }, ...prev]);
    }
    setShowModal(false);
  }

  function handleDelete(doc) {
    if (!confirm(`Delete document "${doc.name}"?`)) return;
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
  }

  // Stats
  const typeCounts = useMemo(() => {
    const m = {};
    documents.forEach(d => { m[d.type] = (m[d.type] || 0) + 1; });
    return m;
  }, [documents]);

  return (
    <div className="documents-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Documents</h2>
          <p className="page-subtitle">{documents.length} document{documents.length !== 1 ? 's' : ''} stored</p>
        </div>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Document</button>
      </div>

      {/* Stats */}
      <div className="reports-kpis" style={{ marginBottom: 20 }}>
        {DOC_TYPES.map(t => (
          <div key={t.value} className="stat-card" onClick={() => setFilterType(filterType === t.value ? 'all' : t.value)} style={{ cursor: 'pointer' }}>
            <div className="stat-card__accent" style={{ background: TYPE_COLORS[t.value] }} />
            <div className="stat-card__label">{t.icon} {t.label}s</div>
            <div className="stat-card__value">{typeCounts[t.value] || 0}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="search-input"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div className="filter-chips">
          <button className={`filter-chip ${filterType === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilterType('all')}>All Types</button>
          {DOC_TYPES.map(t => (
            <button key={t.value} className={`filter-chip ${filterType === t.value ? 'filter-chip--active' : ''}`} onClick={() => setFilterType(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.82rem' }}
        >
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="panel">
          <div className="panel__body" style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>
            No documents found. Click "+ Add Document" to get started.
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel__body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <span className="data-table__bold">{doc.name}</span>
                      {doc.notes && <span className="data-table__sub">{doc.notes.slice(0, 60)}</span>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: `${TYPE_COLORS[doc.type]}22`,
                        color: TYPE_COLORS[doc.type],
                      }}>
                        {DOC_TYPES.find(t => t.value === doc.type)?.label || 'Other'}
                      </span>
                    </td>
                    <td>{doc.clientId ? clientName(doc.clientId) : '—'}</td>
                    <td className="data-table__muted">{doc.projectId ? projectTitle(doc.projectId) : '—'}</td>
                    <td className="data-table__mono">{formatSize(doc.fileSize)}</td>
                    <td className="data-table__muted">{formatDate(doc.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">Open</a>
                        )}
                        <button className="btn btn--ghost btn--sm" onClick={() => openEdit(doc)}>Edit</button>
                        <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => handleDelete(doc)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editing ? 'Edit Document' : 'Add Document'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Document Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Service Agreement" />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Project</label>
                  <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>File URL</label>
                  <input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>{editing ? 'Save Changes' : 'Add Document'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
