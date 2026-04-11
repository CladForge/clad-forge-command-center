import { useState, useMemo } from 'react';
import { generateId } from '../data/initialData';

const SPECIALTIES = [
  { value: 'web-design', label: 'Web Design' },
  { value: 'development', label: 'Development' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'copywriting', label: 'Copywriting' },
  { value: 'photography', label: 'Photography' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = ['active', 'preferred', 'inactive'];

function getSpecialtyLabel(value) {
  const found = SPECIALTIES.find(s => s.value === value);
  return found ? found.label : value;
}

export default function Contractors({ contractors, setContractors, projects }) {
  const [viewContractorId, setViewContractorId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  const emptyContractor = {
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    specialty: 'other',
    rate: '',
    status: 'active',
    website: '',
    notes: '',
    dateAdded: new Date().toISOString().split('T')[0],
    assignedProjects: [],
  };

  const [form, setForm] = useState(emptyContractor);

  const filtered = useMemo(() => {
    return contractors.filter(c => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchSearch = !search
        || fullName.includes(search.toLowerCase())
        || (c.company || '').toLowerCase().includes(search.toLowerCase())
        || (c.email || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchSpecialty = filterSpecialty === 'all' || c.specialty === filterSpecialty;
      return matchSearch && matchStatus && matchSpecialty;
    });
  }, [contractors, search, filterStatus, filterSpecialty]);

  function openAdd() {
    setEditingContractor(null);
    setForm(emptyContractor);
    setShowModal(true);
  }

  function openEdit(contractor) {
    setEditingContractor(contractor);
    setForm({ ...contractor });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    if (editingContractor) {
      setContractors(prev => prev.map(c =>
        c.id === editingContractor.id ? { ...form, id: c.id } : c
      ));
    } else {
      setContractors(prev => [...prev, {
        ...form,
        id: generateId(),
        createdAt: new Date().toISOString(),
        dateAdded: new Date().toISOString().split('T')[0],
        assignedProjects: [],
      }]);
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this contractor?')) return;
    setContractors(prev => prev.filter(c => c.id !== id));
    setViewContractorId(null);
  }

  // ═══ CONTRACTOR PROFILE VIEW ═══
  if (viewContractorId) {
    const contractor = contractors.find(c => c.id === viewContractorId);
    if (!contractor) { setViewContractorId(null); return null; }
    const assignedProjectsList = (contractor.assignedProjects || [])
      .map(pid => projects.find(p => p.id === pid))
      .filter(Boolean);

    return (
      <div className="clients">
        <div className="clients__toolbar">
          <button className="btn btn--ghost" onClick={() => setViewContractorId(null)}>← Back to Contractors</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" onClick={() => { openEdit(contractor); setViewContractorId(null); }}>Edit</button>
            <button className="btn btn--ghost" style={{ color: 'var(--danger, #dc2626)' }} onClick={() => handleDelete(contractor.id)}>Delete</button>
          </div>
        </div>

        <div className="cp__hero">
          <div className="cp__hero-top">
            <div className="client-card__avatar" style={{ width: 64, height: 64, fontSize: '1.4rem' }}>
              {(contractor.firstName?.[0] || '').toUpperCase()}{(contractor.lastName?.[0] || '').toUpperCase()}
            </div>
            <div className="cp__hero-info">
              <h1 className="cp__hero-name">{contractor.firstName} {contractor.lastName}</h1>
              <div className="cp__hero-meta">
                <span className={`status-badge status-badge--${contractor.status}`}>
                  {contractor.status}
                </span>
                <span>{getSpecialtyLabel(contractor.specialty)}</span>
                {contractor.company && <span>{contractor.company}</span>}
              </div>
            </div>
          </div>
          <div className="cp__hero-stats">
            <div className="cp__stat">
              <span className="cp__stat-val">{contractor.rate ? `$${contractor.rate}/hr` : '--'}</span>
              <span className="cp__stat-lbl">Rate</span>
            </div>
            <div className="cp__stat">
              <span className="cp__stat-val">{assignedProjectsList.length}</span>
              <span className="cp__stat-lbl">Projects</span>
            </div>
            <div className="cp__stat">
              <span className="cp__stat-val">{contractor.dateAdded || '--'}</span>
              <span className="cp__stat-lbl">Date Added</span>
            </div>
          </div>
        </div>

        <div className="cp__content">
          {/* Contact Info */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel__header"><h3>Contact Information</h3></div>
            <div style={{ padding: '16px 22px' }}>
              {contractor.email && (
                <div className="cp__detail-row">
                  <div><span className="cp__detail-label">Email</span><span className="cp__detail-value"><a href={`mailto:${contractor.email}`}>{contractor.email}</a></span></div>
                </div>
              )}
              {contractor.phone && (
                <div className="cp__detail-row">
                  <div><span className="cp__detail-label">Phone</span><span className="cp__detail-value">{contractor.phone}</span></div>
                </div>
              )}
              {contractor.website && (
                <div className="cp__detail-row">
                  <div><span className="cp__detail-label">Website</span><span className="cp__detail-value"><a href={contractor.website} target="_blank" rel="noopener noreferrer">{contractor.website}</a></span></div>
                </div>
              )}
              {contractor.company && (
                <div className="cp__detail-row">
                  <div><span className="cp__detail-label">Company</span><span className="cp__detail-value">{contractor.company}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Projects */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel__header"><h3>Assigned Projects ({assignedProjectsList.length})</h3></div>
            {assignedProjectsList.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <p>No projects assigned to this contractor</p>
              </div>
            ) : (
              <div style={{ padding: '16px 22px' }}>
                {assignedProjectsList.map(project => (
                  <div key={project.id} className="cp__project-card">
                    <div className="cp__project-header">
                      <h4>{project.title}</h4>
                      <span className={`status-pill status-pill--${project.stage === 'active' ? 'sent' : project.stage === 'completed' ? 'paid' : 'draft'}`}>
                        {project.stage}
                      </span>
                    </div>
                    {project.description && <p className="cp__project-desc">{project.description}</p>}
                    <div className="cp__project-footer">
                      {project.deadline && <span>Due: {project.deadline}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="panel">
            <div className="panel__header"><h3>Notes</h3></div>
            <div style={{ padding: '16px 22px' }}>
              {contractor.notes ? (
                <p className="cp__notes">{contractor.notes}</p>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>No notes for this contractor. Click Edit to add notes.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ LIST VIEW ═══
  return (
    <div className="clients">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Contractors</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: '0.9rem' }}>
          Manage your external service providers and freelancers
        </p>
      </div>

      {/* Toolbar */}
      <div className="clients__toolbar">
        <div className="clients__search-wrapper">
          <input
            type="text"
            className="clients__search search-input"
            placeholder="Search contractors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="clients__filters">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`clients__filter-btn ${filterStatus === s ? 'clients__filter-btn--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? `All (${contractors.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="search-input"
          value={filterSpecialty}
          onChange={e => setFilterSpecialty(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="all">All Specialties</option>
          {SPECIALTIES.map(sp => (
            <option key={sp.value} value={sp.value}>{sp.label}</option>
          ))}
        </select>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Contractor</button>
      </div>

      {/* Contractor Grid */}
      <div className="clients__grid client-grid">
        {filtered.map((contractor, i) => {
          const assignedCount = (contractor.assignedProjects || []).length;
          return (
            <div
              key={contractor.id}
              className="client-card"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => setViewContractorId(contractor.id)}
            >
              <div className="client-card__header">
                <div className="client-card__avatar client-card-avatar">
                  {(contractor.firstName?.[0] || '').toUpperCase()}{(contractor.lastName?.[0] || '').toUpperCase()}
                </div>
                <div className="client-card__info">
                  <h3 className="client-card__name">{contractor.firstName} {contractor.lastName}</h3>
                  {contractor.company && <p className="client-card__company">{contractor.company}</p>}
                </div>
                <span className={`status-badge status-badge--${contractor.status}`}>
                  {contractor.status}
                </span>
              </div>
              <div className="client-card__stats">
                <div className="client-card__stat">
                  <span className="client-card__stat-val">{getSpecialtyLabel(contractor.specialty)}</span>
                  <span className="client-card__stat-lbl">Specialty</span>
                </div>
                <div className="client-card__stat">
                  <span className="client-card__stat-val">{contractor.rate ? `$${contractor.rate}/hr` : '--'}</span>
                  <span className="client-card__stat-lbl">Rate</span>
                </div>
                <div className="client-card__stat">
                  <span className="client-card__stat-val">{assignedCount}</span>
                  <span className="client-card__stat-lbl">Projects</span>
                </div>
              </div>
              <div className="client-card__footer">
                <span>{contractor.email}</span>
                <div className="action-btns" onClick={e => e.stopPropagation()}>
                  <button className="btn btn--ghost btn--sm" onClick={() => { openEdit(contractor); }}>Edit</button>
                  <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => handleDelete(contractor.id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="clients__empty">
            <span style={{ fontSize: '2rem', opacity: 0.4 }}>🔧</span>
            <p>{contractors.length === 0 ? 'No contractors yet' : 'No contractors found'}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingContractor ? 'Edit Contractor' : 'Add New Contractor'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Smith" />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Freelance LLC" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
                <div className="form-group">
                  <label>Specialty</label>
                  <select value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                    {SPECIALTIES.map(sp => (
                      <option key={sp.value} value={sp.value}>{sp.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hourly Rate ($)</label>
                  <input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="75" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Website</label>
                  <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes about this contractor..." />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>
                {editingContractor ? 'Save Changes' : 'Add Contractor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
