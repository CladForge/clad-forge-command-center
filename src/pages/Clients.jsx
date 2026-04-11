import { useState, useMemo } from 'react';
import { generateId, initialSettings } from '../data/initialData';

const STATUS_OPTIONS = ['active', 'prospect', 'on-hold', 'inactive'];

function formatCurrency(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

export default function Clients({ clients, setClients, projects, sows, settings: rawSettings }) {
  const settings = { ...initialSettings, ...rawSettings };
  const [viewClientId, setViewClientId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const industries = (settings.customIndustries || '').split(',').map(s => s.trim()).filter(Boolean);

  const emptyClient = {
    name: '', company: '', email: '', phone: '',
    industry: settings.defaultIndustry || 'Construction',
    status: 'prospect', notes: '', value: 0, website: '', contacts: [],
  };

  const [form, setForm] = useState(emptyClient);

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.company.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function openAdd() { setEditingClient(null); setForm(emptyClient); setShowModal(true); }
  function openEdit(client) { setEditingClient(client); setForm({ ...client }); setShowModal(true); }

  function handleSave() {
    if (!form.company.trim()) return;
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...form, id: c.id, contacts: c.contacts || [] } : c));
    } else {
      setClients(prev => [...prev, { ...form, id: generateId(), createdAt: new Date().toISOString().split('T')[0], contacts: [] }]);
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    setClients(prev => prev.filter(c => c.id !== id));
    setViewClientId(null);
  }

  // ═══ CLIENT PROFILE VIEW ═══
  if (viewClientId) {
    const client = clients.find(c => c.id === viewClientId);
    if (!client) { setViewClientId(null); return null; }
    return (
      <ClientProfile
        client={client}
        clients={clients}
        setClients={setClients}
        projects={projects}
        sows={sows}
        settings={settings}
        industries={industries}
        onBack={() => setViewClientId(null)}
        onEdit={() => { openEdit(client); setViewClientId(null); }}
        onDelete={() => handleDelete(client.id)}
      />
    );
  }

  // ═══ LIST VIEW ═══
  return (
    <div className="clients">
      {/* Toolbar */}
      <div className="clients__toolbar">
        <div className="clients__search-wrapper">
          <input type="text" className="clients__search" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="clients__filters">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button key={s} className={`clients__filter-btn ${filterStatus === s ? 'clients__filter-btn--active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'all' ? `All (${clients.length})` : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Client</button>
      </div>

      {/* Client Grid */}
      <div className="clients__grid">
        {filtered.map((client, i) => {
          const clientProjects = projects.filter(p => p.clientId === client.id);
          const activeCount = clientProjects.filter(p => p.stage === 'active').length;
          const totalBudget = clientProjects.reduce((s, p) => s + (p.budget || 0), 0);
          return (
            <div key={client.id} className="client-card" style={{ animationDelay: `${i * 40}ms` }} onClick={() => setViewClientId(client.id)}>
              <div className="client-card__header">
                <div className="client-card__avatar">
                  {client.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="client-card__info">
                  <h3 className="client-card__name">{client.company}</h3>
                  <p className="client-card__company">{client.industry}</p>
                </div>
                <span className={`status-badge status-badge--${client.status}`}>
                  {client.status.replace('-', ' ')}
                </span>
              </div>
              <div className="client-card__stats">
                <div className="client-card__stat">
                  <span className="client-card__stat-val">{formatCurrency(totalBudget)}</span>
                  <span className="client-card__stat-lbl">Value</span>
                </div>
                <div className="client-card__stat">
                  <span className="client-card__stat-val">{clientProjects.length}</span>
                  <span className="client-card__stat-lbl">Projects</span>
                </div>
                <div className="client-card__stat">
                  <span className="client-card__stat-val">{(client.contacts || []).length}</span>
                  <span className="client-card__stat-lbl">People</span>
                </div>
              </div>
              <div className="client-card__footer">
                <span>{activeCount} active project{activeCount !== 1 ? 's' : ''}</span>
                {client.email && <span>{client.email}</span>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="clients__empty">
            <span style={{ fontSize: '2rem', opacity: 0.4 }}>👥</span>
            <p>No clients found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group form-group--full"><label>Company Name *</label><input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" /></div>
                <div className="form-group"><label>Industry</label><select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>{industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}</select></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}</select></div>
                <div className="form-group"><label>Company Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@company.com" /></div>
                <div className="form-group"><label>Company Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="form-group"><label>Website</label><input type="text" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
                <div className="form-group form-group--full"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." /></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>{editingClient ? 'Save Changes' : 'Add Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CLIENT PROFILE PAGE
   ═══════════════════════════════════════════ */

function ClientProfile({ client, setClients, projects, sows, onBack, onEdit, onDelete }) {
  const [tab, setTab] = useState('projects');
  const [showContactModal, setShowContactModal] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', title: '', email: '', phone: '', role: 'primary' });

  // Cross-linked data
  const clientProjects = projects.filter(p => p.clientId === client.id);
  const activeProjects = clientProjects.filter(p => p.stage === 'active');
  const clientProposals = sows.filter(s => s.clientId === client.id);

  const invoices = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('cf-invoices')) || []).filter(i => i.clientId === client.id); } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const timeEntries = useMemo(() => {
    try {
      const entries = JSON.parse(localStorage.getItem('cf-time-entries')) || [];
      const projectIds = clientProjects.map(p => p.id);
      return entries.filter(e => projectIds.includes(e.projectId));
    } catch { return []; }
  }, [client.id, clientProjects]);

  const totalHours = timeEntries.reduce((s, e) => s + (e.hours || 0) + (e.minutes || 0) / 60, 0);
  const invoiceTotal = invoices.reduce((s, inv) => {
    return s + (inv.items || []).reduce((ss, item) => ss + (item.quantity || 0) * (item.rate || 0), 0);
  }, 0);

  const contacts = client.contacts || [];

  // Contact CRUD
  function saveContact() {
    if (!contactForm.name.trim()) return;
    setClients(prev => prev.map(c => {
      if (c.id !== client.id) return c;
      const existingContacts = c.contacts || [];
      if (editContact) {
        return { ...c, contacts: existingContacts.map(ct => ct.id === editContact.id ? { ...contactForm, id: ct.id } : ct) };
      }
      return { ...c, contacts: [...existingContacts, { ...contactForm, id: generateId() }] };
    }));
    setShowContactModal(false);
    setEditContact(null);
    setContactForm({ name: '', title: '', email: '', phone: '', role: 'primary' });
  }

  function deleteContact(contactId) {
    setClients(prev => prev.map(c => {
      if (c.id !== client.id) return c;
      return { ...c, contacts: (c.contacts || []).filter(ct => ct.id !== contactId) };
    }));
  }

  const TABS = [
    { id: 'projects', label: `Projects (${clientProjects.length})` },
    { id: 'documents', label: `Financials (${invoices.length + clientProposals.length})` },
    { id: 'people', label: `People (${contacts.length})` },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="cp">
      {/* Profile Hero */}
      <div className="cp__hero">
        <div className="cp__hero-top">
          <button className="cp__back" onClick={onBack}>← Back</button>
          <div className="cp__hero-avatar">{(client.company || '??').slice(0, 2).toUpperCase()}</div>
          <div className="cp__hero-info">
            <h1 className="cp__hero-name">{client.company}</h1>
            <div className="cp__hero-meta">
              <span className={`status-badge status-badge--${client.status}`}>{client.status.replace('-', ' ')}</span>
              <span>{client.industry}</span>
              {client.website && <a href={client.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>{client.website.replace(/^https?:\/\//, '')}</a>}
            </div>
            <div className="cp__hero-actions">
              {client.email && <a href={`mailto:${client.email}`} className="btn btn--sm cp__hero-btn">✉ Email</a>}
              {client.phone && <a href={`tel:${client.phone}`} className="btn btn--sm cp__hero-btn">📞 Call</a>}
              <button className="btn btn--sm cp__hero-btn" onClick={onEdit}>✎ Edit</button>
              <button className="btn btn--sm cp__hero-btn cp__hero-btn--danger" onClick={onDelete}>✕ Delete</button>
            </div>
          </div>
        </div>
        <div className="cp__hero-stats">
          <div className="cp__stat"><span className="cp__stat-val">{formatCurrency(clientProjects.reduce((s, p) => s + (p.budget || 0), 0))}</span><span className="cp__stat-lbl">Total Budget</span></div>
          <div className="cp__stat"><span className="cp__stat-val">{clientProjects.length}</span><span className="cp__stat-lbl">Total Projects</span></div>
          <div className="cp__stat"><span className="cp__stat-val">{activeProjects.length}</span><span className="cp__stat-lbl">Active Projects</span></div>
          <div className="cp__stat"><span className="cp__stat-val">{formatCurrency(invoiceTotal)}</span><span className="cp__stat-lbl">Invoiced</span></div>
          <div className="cp__stat"><span className="cp__stat-val">{totalHours.toFixed(1)}h</span><span className="cp__stat-lbl">Hours Logged</span></div>
          <div className="cp__stat"><span className="cp__stat-val">{client.createdAt || '—'}</span><span className="cp__stat-lbl">Client Since</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cp__tabs">
        {TABS.map(t => (
          <button key={t.id} className={`cp__tab ${tab === t.id ? 'cp__tab--active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ═══ PROJECTS TAB ═══ */}
      {tab === 'projects' && (
        <div className="cp__content">
          <div className="panel">
            <div className="panel__header"><h3>Projects</h3></div>
            {clientProjects.length === 0 ? (
              <div className="empty-state"><span className="empty-state__icon">📋</span><h3>No projects yet</h3><p>Projects linked to {client.company} will appear here</p></div>
            ) : (
              <div style={{ padding: '16px 22px' }}>
                {clientProjects.sort((a, b) => {
                  const order = { active: 0, review: 1, proposal: 2, lead: 3, 'on-hold': 4, completed: 5 };
                  return (order[a.stage] ?? 6) - (order[b.stage] ?? 6);
                }).map(project => {
                  const budgetUsed = invoices.filter(i => i.projectId === project.id).reduce((s, inv) =>
                    s + (inv.items || []).reduce((ss, item) => ss + (item.quantity || 0) * (item.rate || 0), 0), 0);
                  const pct = project.budget > 0 ? Math.round((budgetUsed / project.budget) * 100) : 0;
                  return (
                    <div key={project.id} className="cp__project-card">
                      <div className="cp__project-header">
                        <h4>{project.title}</h4>
                        <span className={`status-pill status-pill--${project.stage === 'active' ? 'sent' : project.stage === 'completed' ? 'paid' : project.stage === 'on-hold' ? 'draft' : 'sent'}`}>
                          {project.stage}
                        </span>
                      </div>
                      {project.description && <p className="cp__project-desc">{project.description}</p>}
                      {project.budget > 0 && (
                        <div className="cp__project-progress">
                          <div className="cp__project-progress-labels">
                            <span>Budget: {formatCurrency(project.budget)}</span>
                            <span>{pct}% invoiced</span>
                          </div>
                          <div className="cp__project-progress-bar">
                            <div className="cp__project-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="cp__project-footer">
                        {project.deadline && <span>Due: {project.deadline}</span>}
                        {project.budget > 0 && <span>{formatCurrency(project.budget)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ FINANCIALS TAB ═══ */}
      {tab === 'documents' && (
        <div className="cp__content">
          {/* Proposals */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel__header"><h3>Proposals ({clientProposals.length})</h3></div>
            {clientProposals.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}><p>No proposals for this client</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Proposal</th><th>Project</th><th>Value</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {clientProposals.map(prop => {
                    const total = (prop.packages || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0);
                    return (
                      <tr key={prop.id}>
                        <td className="data-table__mono">{prop.proposalNumber || prop.id}</td>
                        <td>{prop.projectTitle}</td>
                        <td className="data-table__mono data-table__bold">{formatCurrency(total)}</td>
                        <td><span className={`status-pill status-pill--${prop.status}`}>{prop.status}</span></td>
                        <td className="data-table__muted">{prop.createdAt?.split('T')[0]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Invoices */}
          <div className="panel">
            <div className="panel__header"><h3>Invoices ({invoices.length})</h3></div>
            {invoices.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}><p>No invoices for this client</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Invoice</th><th>Project</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {invoices.map(inv => {
                    const total = (inv.items || []).reduce((s, item) => s + (item.quantity || 0) * (item.rate || 0), 0);
                    return (
                      <tr key={inv.id}>
                        <td className="data-table__mono">{inv.invoiceNumber}</td>
                        <td>{inv.projectTitle}</td>
                        <td className="data-table__mono data-table__bold">{formatCurrency(total)}</td>
                        <td><span className={`status-pill status-pill--${inv.status}`}>{inv.status}</span></td>
                        <td className="data-table__muted">{inv.issueDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ PEOPLE TAB ═══ */}
      {tab === 'people' && (
        <div className="cp__content">
          <div className="panel">
            <div className="panel__header">
              <h3>People at {client.company}</h3>
              <button className="btn btn--secondary btn--sm" onClick={() => { setEditContact(null); setContactForm({ name: '', title: '', email: '', phone: '', role: 'primary' }); setShowContactModal(true); }}>+ Add Person</button>
            </div>
            {contacts.length === 0 ? (
              <div className="empty-state"><span className="empty-state__icon">👥</span><h3>No people added yet</h3><p>Add team members at this company</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Phone</th><th>Role</th><th></th></tr></thead>
                <tbody>
                  {contacts.map(ct => (
                    <tr key={ct.id}>
                      <td style={{ fontWeight: 500 }}>{ct.name}</td>
                      <td className="data-table__muted">{ct.title || '—'}</td>
                      <td>{ct.email ? <a href={`mailto:${ct.email}`} style={{ color: 'var(--brand)' }}>{ct.email}</a> : '—'}</td>
                      <td>{ct.phone || '—'}</td>
                      <td><span className="cp__role-badge">{ct.role || 'primary'}</span></td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn--ghost btn--sm" onClick={() => { setEditContact(ct); setContactForm({ ...ct }); setShowContactModal(true); }}>✎</button>
                          <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteContact(ct.id)}>×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Company Details */}
          <div className="panel" style={{ marginTop: 20 }}>
            <div className="panel__header"><h3>Company Details</h3></div>
            <div style={{ padding: '16px 22px' }}>
              <div className="cp__detail-row"><span className="cp__detail-icon">🏢</span><div><span className="cp__detail-label">Company</span><span className="cp__detail-value">{client.company}</span></div></div>
              {client.email && <div className="cp__detail-row"><span className="cp__detail-icon">✉</span><div><span className="cp__detail-label">Company Email</span><span className="cp__detail-value"><a href={`mailto:${client.email}`}>{client.email}</a></span></div></div>}
              {client.phone && <div className="cp__detail-row"><span className="cp__detail-icon">📞</span><div><span className="cp__detail-label">Company Phone</span><span className="cp__detail-value">{client.phone}</span></div></div>}
              {client.website && <div className="cp__detail-row"><span className="cp__detail-icon">🌐</span><div><span className="cp__detail-label">Website</span><span className="cp__detail-value"><a href={client.website} target="_blank" rel="noopener noreferrer">{client.website.replace(/^https?:\/\//, '')}</a></span></div></div>}
              <div className="cp__detail-row"><span className="cp__detail-icon">🏭</span><div><span className="cp__detail-label">Industry</span><span className="cp__detail-value">{client.industry}</span></div></div>
              <div className="cp__detail-row"><span className="cp__detail-icon">📅</span><div><span className="cp__detail-label">Client Since</span><span className="cp__detail-value">{client.createdAt || '—'}</span></div></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NOTES TAB ═══ */}
      {tab === 'notes' && (
        <div className="cp__content">
          <div className="panel">
            <div className="panel__header"><h3>Notes</h3></div>
            <div style={{ padding: '16px 22px' }}>
              {client.notes ? (
                <p className="cp__notes">{client.notes}</p>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>No notes for this client. Click Edit to add notes.</p>
              )}
            </div>
          </div>

          {/* Time Log for this client */}
          {timeEntries.length > 0 && (
            <div className="panel" style={{ marginTop: 20 }}>
              <div className="panel__header"><h3>Time Log ({totalHours.toFixed(1)}h total)</h3></div>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Project</th><th>Description</th><th>Duration</th></tr></thead>
                <tbody>
                  {timeEntries.slice(0, 10).map(entry => {
                    const project = projects.find(p => p.id === entry.projectId);
                    return (
                      <tr key={entry.id}>
                        <td className="data-table__muted">{entry.date}</td>
                        <td>{project?.title || '—'}</td>
                        <td>{entry.description || '—'}</td>
                        <td className="data-table__mono">{entry.hours}h {entry.minutes}m</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editContact ? 'Edit Person' : 'Add Person'}</h2>
              <button className="modal__close" onClick={() => setShowContactModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group"><label>Name *</label><input type="text" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label>Title</label><input type="text" value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. CTO, Project Manager" /></div>
                <div className="form-group"><label>Email</label><input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="form-group"><label>Phone</label><input type="tel" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="form-group"><label>Role</label><select value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))}><option value="primary">Primary</option><option value="billing">Billing</option><option value="technical">Technical</option><option value="executive">Executive</option><option value="other">Other</option></select></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowContactModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveContact}>{editContact ? 'Save' : 'Add Person'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
