import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateId, initialSettings } from '../data/initialData';
import InvitePortalUserModal from '../components/InvitePortalUserModal';
import AppCard from '../components/AppCard';
import AppScreenshotsSection from '../components/AppScreenshotsSection';
import { supabase } from '../lib/supabase';

const STATUS_OPTIONS = ['active', 'prospect', 'on-hold', 'inactive'];

function formatCurrency(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

// Display-safe date formatter for things like createdAt that come from
// Postgres as ISO 8601 timestamps (e.g. "2025-09-15T00:00:00+00:00").
// Renders as a short, readable label like "Sep 15, 2025"; falls back to
// the raw string if it can't be parsed.
function formatShortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Clients({ clients, setClients, projects, sows, settings: rawSettings, invoices = [], timeEntries = [], clientUsers = [], setClientUsers, reloadClientUsers, profiles = [], reloadProfiles, applications = [], setApplications, appScreenshots = [], annotationPins = [], markupSets = [], reloadAdminScreenshots, profile }) {
  const settings = { ...initialSettings, ...rawSettings };
  const [viewClientId, setViewClientId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const industries = (settings.customIndustries || '').split(',').map(s => s.trim()).filter(Boolean);

  const emptyClient = {
    company: '', email: '', phone: '',
    industry: settings.defaultIndustry || 'Construction',
    status: 'prospect', notes: '', value: 0, website: '', address: '', contacts: [],
    brandLogoUrl: '',
  };

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, brandLogoUrl: ev.target.result }));
    reader.readAsDataURL(file);
  }

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
    const c = clients.find(cl => cl.id === id);
    if (!window.confirm(`Delete client "${c?.company || 'this client'}"? This cannot be undone.`)) return;
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
        invoices={invoices}
        timeEntries={timeEntries}
        settings={settings}
        industries={industries}
        clientUsers={clientUsers}
        setClientUsers={setClientUsers}
        reloadClientUsers={reloadClientUsers}
        profiles={profiles}
        reloadProfiles={reloadProfiles}
        applications={applications}
        setApplications={setApplications}
        appScreenshots={appScreenshots}
        annotationPins={annotationPins}
        markupSets={markupSets}
        reloadAdminScreenshots={reloadAdminScreenshots}
        profile={profile}
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
          {/* Magnifying-glass icon. The CSS leaves a 40px left padding on
              the input for it via `.clients__search-icon`; without this
              there's just an empty gap. */}
          <svg
            className="clients__search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
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
                <div className="client-card__avatar" style={{ overflow: 'hidden' }}>
                  {client.brandLogoUrl
                    ? <img src={client.brandLogoUrl} alt={client.company} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }} />
                    : client.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="client-card__info">
                  <h3 className="client-card__name">{client.company}</h3>
                  <p className="client-card__company">{client.industry}</p>
                </div>
                <span className={`status-pill status-pill--${client.status}`}>
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
                <div className="form-group form-group--full">
                  <label>Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--surface-muted, #f3f4f6)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {form.brandLogoUrl
                        ? <img src={form.brandLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: '0.7rem', color: 'var(--slate)' }}>No logo</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer', margin: 0 }}>
                        {form.brandLogoUrl ? 'Replace Logo' : 'Upload Logo'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                      </label>
                      {form.brandLogoUrl && (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm(f => ({ ...f, brandLogoUrl: '' }))}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="form-group form-group--full"><label>Company Name *</label><input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" /></div>
                <div className="form-group"><label>Industry</label><select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>{industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}</select></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}</select></div>
                <div className="form-group"><label>Company Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@company.com" /></div>
                <div className="form-group"><label>Company Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="form-group"><label>Website</label><input type="text" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
                <div className="form-group form-group--full"><label>Billing Address</label><textarea value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Suite 100&#10;Austin, TX 78701" rows={2} /></div>
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

function ClientProfile({ client, setClients, projects, sows, invoices: allInvoices = [], timeEntries: allTimeEntries = [], clientUsers = [], setClientUsers, reloadClientUsers, profiles = [], reloadProfiles, applications = [], setApplications, appScreenshots = [], annotationPins = [], markupSets = [], reloadAdminScreenshots, profile, onBack, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('projects');
  const [showContactModal, setShowContactModal] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', title: '', email: '', phone: '', role: 'primary' });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  async function handleRevokePortalUser(cu) {
    if (!window.confirm(
      `Revoke portal access for this user?\n\nThey will no longer be able to sign in to ${client.company}'s portal. Their auth account is preserved (in case they belong to other clients).`
    )) return;
    setRevokingId(cu.id);
    try {
      const { error } = await supabase.from('client_users').delete().eq('id', cu.id);
      if (error) {
        alert('Revoke failed: ' + error.message);
      } else if (setClientUsers) {
        setClientUsers(prev => prev.filter(x => x.id !== cu.id));
      }
    } finally {
      setRevokingId(null);
    }
  }

  async function handleChangePortalRole(cu, newRole) {
    const { error } = await supabase
      .from('client_users')
      .update({ portal_role: newRole })
      .eq('id', cu.id);
    if (error) { alert('Update failed: ' + error.message); return; }
    if (setClientUsers) {
      setClientUsers(prev => prev.map(x => x.id === cu.id ? { ...x, portalRole: newRole } : x));
    }
  }

  // Cross-linked data
  const clientProjects = projects.filter(p => p.clientId === client.id);
  const activeProjects = clientProjects.filter(p => p.stage === 'active');
  const clientProposals = sows.filter(s => s.clientId === client.id);

  const invoices = useMemo(() => {
    return allInvoices.filter(i => i.clientId === client.id);
  }, [allInvoices, client.id]);

  const timeEntries = useMemo(() => {
    const projectIds = clientProjects.map(p => p.id);
    return allTimeEntries.filter(e => projectIds.includes(e.projectId));
  }, [allTimeEntries, clientProjects]);

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
    const ct = contacts.find(x => x.id === contactId);
    if (!window.confirm(`Remove ${ct?.name || 'this person'} from ${client.company}?`)) return;
    setClients(prev => prev.map(c => {
      if (c.id !== client.id) return c;
      return { ...c, contacts: (c.contacts || []).filter(ct => ct.id !== contactId) };
    }));
  }

  const portalUsersForClient = (clientUsers || []).filter(cu => cu.clientId === client.id);
  const clientApplications = (applications || []).filter(a => a.clientId === client.id);

  const TABS = [
    { id: 'projects', label: `Projects (${clientProjects.length})` },
    { id: 'applications', label: `Applications (${clientApplications.length})` },
    { id: 'documents', label: `Financials (${invoices.length + clientProposals.length})` },
    { id: 'people', label: `People (${contacts.length})` },
    { id: 'portal', label: `Portal Access (${portalUsersForClient.length})` },
    { id: 'notes', label: 'Notes' },
  ];

  // Application modal state
  const [showAppModal, setShowAppModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const emptyApp = {
    name: '', description: '', url: '', type: 'website',
    status: 'planning', launchedAt: '', monthlyCost: 0, notes: '',
    thumbnailUrl: '',
  };
  const [appForm, setAppForm] = useState(emptyApp);

  function handleAppThumbnailUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Thumbnail must be under 2MB. Recommended: 1200×675 JPEG, ~150KB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setAppForm(f => ({ ...f, thumbnailUrl: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function openAppCreate() {
    setEditingApp(null);
    setAppForm(emptyApp);
    setShowAppModal(true);
  }
  function openAppEdit(app) {
    setEditingApp(app);
    setAppForm({
      name: app.name || '',
      description: app.description || '',
      url: app.url || '',
      type: app.type || 'website',
      status: app.status || 'planning',
      launchedAt: app.launchedAt || '',
      monthlyCost: app.monthlyCost || 0,
      notes: app.notes || '',
      thumbnailUrl: app.thumbnailUrl || '',
    });
    setShowAppModal(true);
  }
  function saveApp() {
    if (!appForm.name.trim() || !setApplications) return;
    if (editingApp) {
      setApplications(prev => prev.map(a => a.id === editingApp.id ? { ...a, ...appForm } : a));
    } else {
      setApplications(prev => [
        ...prev,
        {
          ...appForm,
          id: generateId(),
          clientId: client.id,
          createdAt: new Date().toISOString(),
          metadata: {},
        },
      ]);
    }
    setShowAppModal(false);
    setEditingApp(null);
  }
  function deleteApp(appId) {
    const a = clientApplications.find(x => x.id === appId);
    if (!window.confirm(`Delete application "${a?.name || ''}"? This cannot be undone — and any recurring expenses linked to it will be unlinked (not deleted).`)) return;
    setApplications(prev => prev.filter(x => x.id !== appId));
  }

  // Markups modal — opened from each app card
  const [markupsAppId, setMarkupsAppId] = useState(null);
  const markupsApp = markupsAppId ? clientApplications.find(a => a.id === markupsAppId) : null;
  const markupsScreenshots = markupsApp ? appScreenshots.filter(s => s.applicationId === markupsApp.id) : [];
  const markupsPins = markupsApp ? annotationPins.filter(p => markupsScreenshots.some(s => s.id === p.screenshotId)) : [];
  const markupsSetsForApp = markupsApp ? markupSets.filter(s => s.applicationId === markupsApp.id) : [];

  return (
    <div className="cp">
      {/* Profile Hero */}
      <div className="cp__hero">
        <div className="cp__hero-top">
          <button className="cp__back" onClick={onBack}>← Back</button>
          <div className="cp__hero-avatar" style={{ overflow: 'hidden' }}>
            {client.brandLogoUrl
              ? <img src={client.brandLogoUrl} alt={client.company} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }} />
              : (client.company || '??').slice(0, 2).toUpperCase()}
          </div>
          <div className="cp__hero-info">
            <h1 className="cp__hero-name">{client.company}</h1>
            <div className="cp__hero-meta">
              <span className={`status-pill status-pill--${client.status}`}>{client.status.replace('-', ' ')}</span>
              <span>{client.industry}</span>
              {client.website && <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>{client.website.replace(/^https?:\/\//, '')}</a>}
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
          <div className="cp__stat"><span className="cp__stat-val">{formatShortDate(client.createdAt)}</span><span className="cp__stat-lbl">Client Since</span></div>
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
                    <div key={project.id} className="cp__project-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
                      <div className="cp__project-header">
                        <h4>
                          {project.projectNumber && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--brand)', marginRight: 6, fontWeight: 500 }}>
                              {project.projectNumber}
                            </span>
                          )}
                          {project.title}
                        </h4>
                        <span className={`status-pill status-pill--stage-${project.stage}`}>
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
              {client.website && <div className="cp__detail-row"><span className="cp__detail-icon">🌐</span><div><span className="cp__detail-label">Website</span><span className="cp__detail-value"><a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer">{client.website.replace(/^https?:\/\//, '')}</a></span></div></div>}
              <div className="cp__detail-row"><span className="cp__detail-icon">🏭</span><div><span className="cp__detail-label">Industry</span><span className="cp__detail-value">{client.industry}</span></div></div>
              <div className="cp__detail-row"><span className="cp__detail-icon">📅</span><div><span className="cp__detail-label">Client Since</span><span className="cp__detail-value">{formatShortDate(client.createdAt)}</span></div></div>
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

      {/* ═══ APPLICATIONS TAB ═══ */}
      {tab === 'applications' && (
        <div className="cp__content">
          <div className="panel">
            <div className="panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Applications</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: '4px 0 0 0' }}>
                  Live products and sites you maintain for {client.company}. Visible to the client in their portal.
                </p>
              </div>
              <button className="btn btn--primary" onClick={openAppCreate}>+ Application</button>
            </div>
            <div style={{ padding: clientApplications.length === 0 ? 0 : '16px 22px 22px' }}>
              {clientApplications.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state__icon">📦</span>
                  <h3>No applications yet</h3>
                  <p>Add the first application this client owns. They&apos;ll see it in their portal.</p>
                </div>
              ) : (
                <div className="app-card-grid">
                  {clientApplications.map(app => {
                    const ssIds = appScreenshots.filter(s => s.applicationId === app.id).map(s => s.id);
                    const total = annotationPins.filter(p => ssIds.includes(p.screenshotId)).length;
                    const openCount = annotationPins.filter(p => ssIds.includes(p.screenshotId) && p.status === 'open').length;
                    return (
                      <AppCard
                        key={app.id}
                        app={app}
                        monthlyCost={app.monthlyCost}
                        onEdit={() => openAppEdit(app)}
                        onDelete={() => deleteApp(app.id)}
                        onMarkups={() => setMarkupsAppId(app.id)}
                        markupCount={total}
                        openMarkupCount={openCount}
                        adminMode
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PORTAL ACCESS TAB ═══ */}
      {tab === 'portal' && (
        <div className="cp__content">
          <div className="panel">
            <div className="panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Portal Access</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: '4px 0 0 0' }}>
                  Invite people from {client.company} to log in and view their projects, invoices, and approvals.
                </p>
              </div>
              <button className="btn btn--primary" onClick={() => setShowInviteModal(true)}>
                + Invite User
              </button>
            </div>
            <div style={{ padding: portalUsersForClient.length === 0 ? 0 : '12px 22px 22px' }}>
              {portalUsersForClient.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state__icon">🔐</span>
                  <h3>No portal users yet</h3>
                  <p>Invite the first user to give {client.company} access to their dedicated portal.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Invited</th>
                      <th>Accepted</th>
                      <th>Last Seen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalUsersForClient.map(cu => {
                      // Look up the name from the profiles table. The profile row
                      // is created by the on_auth_user_created trigger with a
                      // placeholder ('User'); AcceptInvite replaces it with the
                      // real name once the invitee finishes signup.
                      const userProfile = profiles.find(p => p.id === cu.authUserId);
                      const rawName = userProfile?.fullName || '';
                      const isPlaceholder = !rawName || rawName === 'User';
                      const idShort = (cu.authUserId || '').slice(0, 8);
                      return (
                      <tr key={cu.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {isPlaceholder ? (
                              <span style={{ color: 'var(--slate-light)', fontStyle: 'italic' }}>
                                Awaiting registration
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                                {rawName}
                              </span>
                            )}
                            <span
                              className="data-table__mono"
                              style={{ fontSize: '0.7rem', color: 'var(--slate-light)' }}
                              title={cu.authUserId}
                            >
                              {idShort}…
                            </span>
                          </div>
                        </td>
                        <td>
                          <select
                            value={cu.portalRole || 'viewer'}
                            onChange={e => handleChangePortalRole(cu, e.target.value)}
                            style={{ fontSize: '0.82rem' }}
                          >
                            <option value="owner">Owner</option>
                            <option value="billing">Billing</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="data-table__muted">
                          {cu.invitedAt ? new Date(cu.invitedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="data-table__muted">
                          {cu.acceptedAt
                            ? <span style={{ color: 'var(--success)' }}>{new Date(cu.acceptedAt).toLocaleDateString()}</span>
                            : <span style={{ color: 'var(--slate-light)' }}>Pending</span>}
                        </td>
                        <td className="data-table__muted">
                          {cu.lastSeenAt ? new Date(cu.lastSeenAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <button
                            className="btn btn--ghost btn--sm btn--danger-hover"
                            onClick={() => handleRevokePortalUser(cu)}
                            disabled={revokingId === cu.id}
                            title="Revoke access"
                          >
                            {revokingId === cu.id ? '...' : 'Revoke'}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Portal User Modal */}
      {showInviteModal && (
        <InvitePortalUserModal
          client={client}
          onClose={() => setShowInviteModal(false)}
          onInvited={async () => {
            // After an invite, reload both — the new client_users row plus
            // the freshly-created profile (so the name column populates).
            await reloadClientUsers?.();
            await reloadProfiles?.();
          }}
        />
      )}

      {/* Markups modal — admin reviews + resolves client-submitted markup pins.
          Sized to nearly fill the viewport so the screenshot + sidebar have
          real estate to breathe. */}
      {markupsApp && (
        <div className="modal-overlay" onClick={() => setMarkupsAppId(null)}>
          <div
            className="modal modal--wide modal--markups"
            onClick={e => e.stopPropagation()}
            style={{
              width: '95vw',
              maxWidth: 1600,
              height: '94vh',
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal__header" style={{ flexShrink: 0 }}>
              <div>
                <h2>Markups — {markupsApp.name}</h2>
                <span className="modal__subtitle">
                  {markupsScreenshots.length} screenshot{markupsScreenshots.length !== 1 ? 's' : ''}, {markupsPins.length} total pin{markupsPins.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button className="modal__close" onClick={() => setMarkupsAppId(null)}>×</button>
            </div>
            <div className="modal__body" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
              <AppScreenshotsSection
                applicationId={markupsApp.id}
                screenshots={markupsScreenshots}
                pins={markupsPins}
                markupSets={markupsSetsForApp}
                currentUserId={profile?.id}
                isAdmin={true}
                onChange={reloadAdminScreenshots}
              />
            </div>
          </div>
        </div>
      )}

      {/* Application Add/Edit Modal */}
      {showAppModal && (
        <div className="modal-overlay" onClick={() => setShowAppModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingApp ? 'Edit Application' : 'New Application'}</h2>
              <button className="modal__close" onClick={() => setShowAppModal(false)}>×</button>
            </div>
            <div className="modal__body">
              {/* Thumbnail upload — top of form so it's the first thing the
                  admin sees. Stored as base64 data URI to match brand_logo_url. */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label>Thumbnail</label>
                <div className="app-thumb-upload">
                  <div className="app-thumb-upload__preview">
                    {appForm.thumbnailUrl ? (
                      <img src={appForm.thumbnailUrl} alt="Thumbnail preview" />
                    ) : (
                      <div className="app-thumb-upload__placeholder">
                        <span>16:9</span>
                        <span className="app-thumb-upload__placeholder-sub">No thumbnail uploaded</span>
                      </div>
                    )}
                  </div>
                  <div className="app-thumb-upload__controls">
                    <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
                      {appForm.thumbnailUrl ? 'Replace image' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAppThumbnailUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {appForm.thumbnailUrl && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--danger-hover"
                        onClick={() => setAppForm(f => ({ ...f, thumbnailUrl: '' }))}
                      >
                        Remove
                      </button>
                    )}
                    <span className="form-hint">
                      Recommended: 1200×675 JPEG. Max 2MB. Shown to client on the portal.
                    </span>
                  </div>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group form-group--full">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={appForm.name}
                    onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Marketing Site, Internal CRM, Customer Portal"
                    autoFocus
                  />
                </div>
                <div className="form-group form-group--full">
                  <label>Description</label>
                  <textarea
                    value={appForm.description}
                    onChange={e => setAppForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What does this application do? Visible to the client."
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={appForm.type} onChange={e => setAppForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="website">Website</option>
                    <option value="web-app">Web App</option>
                    <option value="mobile-app">Mobile App</option>
                    <option value="api">API</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={appForm.status} onChange={e => setAppForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="planning">Planning</option>
                    <option value="in-development">In Development</option>
                    <option value="staging">Staging</option>
                    <option value="live">Live</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group form-group--full">
                  <label>Live URL</label>
                  <input
                    type="text"
                    value={appForm.url}
                    onChange={e => setAppForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Launched (date)</label>
                  <input
                    type="date"
                    value={appForm.launchedAt}
                    onChange={e => setAppForm(f => ({ ...f, launchedAt: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Monthly cost (base)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={appForm.monthlyCost}
                    onChange={e => setAppForm(f => ({ ...f, monthlyCost: Number(e.target.value) || 0 }))}
                  />
                  <span className="form-hint">
                    Recurring expenses linked to this app are added on top.
                  </span>
                </div>
                <div className="form-group form-group--full">
                  <label>Notes</label>
                  <textarea
                    value={appForm.notes}
                    onChange={e => setAppForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes, runbook, deployment info — also visible to client."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowAppModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveApp} disabled={!appForm.name.trim()}>
                {editingApp ? 'Save Changes' : 'Create Application'}
              </button>
            </div>
          </div>
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
