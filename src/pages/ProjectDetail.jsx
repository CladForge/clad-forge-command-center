import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateId } from '../data/initialData';

const STAGES = [
  { id: 'lead', label: 'Lead', color: '#666' },
  { id: 'proposal', label: 'Proposal', color: '#ffcc00' },
  { id: 'active', label: 'Active', color: '#ff8c00' },
  { id: 'review', label: 'Review', color: '#5ac8fa' },
  { id: 'completed', label: 'Completed', color: '#34c759' },
  { id: 'on-hold', label: 'On Hold', color: '#999' },
];

function formatCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ProjectDetail({ projects, setProjects, clients, sows, invoices, timeEntries, documents }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);

  const [newDeliverable, setNewDeliverable] = useState('');
  const [newUpdate, setNewUpdate] = useState('');
  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const client = useMemo(() => clients.find(c => c.id === project?.clientId), [clients, project]);

  const projectInvoices = useMemo(
    () => (invoices || []).filter(inv => inv.projectId === id),
    [invoices, id]
  );
  const projectTime = useMemo(
    () => (timeEntries || []).filter(e => e.projectId === id),
    [timeEntries, id]
  );
  const linkedProposal = useMemo(
    () => (sows || []).find(s => s.id === project?.proposalId) || null,
    [sows, project]
  );
  const availableProposals = useMemo(
    () => (sows || []).filter(s => !project?.clientId || s.clientId === project.clientId),
    [sows, project]
  );
  const projectDocs = useMemo(
    () => (documents || []).filter(d => d.projectId === id),
    [documents, id]
  );

  if (!project) {
    return (
      <div className="empty-state" style={{ padding: 60 }}>
        <h3>Project not found</h3>
        <button className="btn btn--primary" onClick={() => navigate('/pipeline')} style={{ marginTop: 16 }}>Back to Pipeline</button>
      </div>
    );
  }

  const stage = STAGES.find(s => s.id === project.stage) || STAGES[0];
  const deliverables = project.deliverables || [];
  const updates = project.updates || [];
  const completedCount = deliverables.filter(d => d.done).length;
  const deliverableProgress = deliverables.length > 0 ? Math.round((completedCount / deliverables.length) * 100) : 0;

  const invoicedTotal = projectInvoices.reduce((s, inv) =>
    s + (inv.items || []).reduce((ss, item) => ss + (item.quantity || 0) * (item.rate || 0), 0), 0);
  const budgetUsed = project.budget > 0 ? Math.round((invoicedTotal / project.budget) * 100) : 0;

  const totalHours = projectTime.reduce((s, e) => s + (e.hours || 0) + (e.minutes || 0) / 60, 0);

  const dday = daysUntil(project.deadline);

  function updateProject(patch) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function addDeliverable() {
    if (!newDeliverable.trim()) return;
    const next = [...deliverables, { id: generateId(), text: newDeliverable.trim(), done: false }];
    updateProject({ deliverables: next });
    setNewDeliverable('');
  }

  function toggleDeliverable(did) {
    const next = deliverables.map(d => d.id === did ? { ...d, done: !d.done } : d);
    updateProject({ deliverables: next });
  }

  function removeDeliverable(did) {
    updateProject({ deliverables: deliverables.filter(d => d.id !== did) });
  }

  function addUpdate() {
    if (!newUpdate.trim()) return;
    const entry = {
      id: generateId(),
      text: newUpdate.trim(),
      createdAt: new Date().toISOString(),
    };
    updateProject({ updates: [entry, ...updates] });
    setNewUpdate('');
  }

  function removeUpdate(uid) {
    updateProject({ updates: updates.filter(u => u.id !== uid) });
  }

  function saveScope() {
    updateProject({ scopeOfWork: scopeDraft });
    setEditingScope(false);
  }

  function openScopeEditor() {
    setScopeDraft(project.scopeOfWork || '');
    setEditingScope(true);
  }

  function buildScopeFromProposal(prop) {
    const parts = [];
    if (prop.description) parts.push(prop.description);
    (prop.packages || []).forEach(pkg => {
      const header = pkg.name ? `## ${pkg.name}${pkg.optional ? ' (optional)' : ''}` : '';
      const body = pkg.description || '';
      if (header || body) parts.push([header, body].filter(Boolean).join('\n'));
    });
    return parts.join('\n\n');
  }

  function buildDeliverablesFromProposal(prop) {
    const items = [];
    (prop.packages || []).forEach(pkg => {
      (pkg.items || []).forEach(it => {
        const text = it.text?.trim();
        if (!text) return;
        const prefix = pkg.name ? `${pkg.name}: ` : '';
        items.push({ id: generateId(), text: `${prefix}${text}`, done: false });
      });
    });
    return items;
  }

  function linkProposal(propId) {
    if (!propId) {
      updateProject({ proposalId: '' });
      return;
    }
    const prop = (sows || []).find(s => s.id === propId);
    if (!prop) return;
    const hasExistingContent = (project.scopeOfWork || '').trim() || (project.deliverables || []).length > 0;
    const shouldAutofill = !hasExistingContent
      || window.confirm('Autofill Scope of Work and Deliverables from this proposal? This will replace any existing content.');
    const patch = { proposalId: propId };
    if (shouldAutofill) {
      patch.scopeOfWork = buildScopeFromProposal(prop);
      patch.deliverables = buildDeliverablesFromProposal(prop);
    }
    updateProject(patch);
  }

  function unlinkProposal() {
    updateProject({ proposalId: '' });
  }

  function openEditModal() {
    setEditForm({
      projectNumber: project.projectNumber || '',
      title: project.title || '',
      clientId: project.clientId || '',
      stage: project.stage || 'lead',
      budget: project.budget || 0,
      deadline: project.deadline || '',
      description: project.description || '',
    });
    setShowEditModal(true);
  }

  function saveEditModal() {
    if (!editForm.title.trim()) return;
    updateProject({
      projectNumber: editForm.projectNumber.trim(),
      title: editForm.title.trim(),
      clientId: editForm.clientId,
      stage: editForm.stage,
      budget: parseInt(editForm.budget) || 0,
      deadline: editForm.deadline,
      description: editForm.description,
    });
    setShowEditModal(false);
  }

  function deleteProject() {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    navigate('/pipeline');
  }

  return (
    <div className="pd">
      {/* Header */}
      <div className="panel" style={{ marginBottom: 20, overflow: 'hidden' }}>
        {/* Top bar: back + actions + linked proposal */}
        <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>← Back</button>
            <button className="btn btn--secondary btn--sm" onClick={openEditModal}>Edit Project</button>
            <button className="btn btn--ghost btn--sm" onClick={deleteProject} title="Delete project">Delete</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {linkedProposal ? (
              <>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Linked proposal:</span>
                <span
                  onClick={() => navigate('/proposals')}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand)', cursor: 'pointer' }}
                >
                  {linkedProposal.proposalNumber || linkedProposal.id}
                </span>
                <button className="btn btn--ghost btn--sm" onClick={unlinkProposal} title="Unlink proposal">Unlink</button>
              </>
            ) : (
              <>
                <label style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Link proposal:</label>
                <select
                  value=""
                  onChange={e => linkProposal(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.8rem' }}
                >
                  <option value="">Select proposal...</option>
                  {availableProposals.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.proposalNumber || p.id} — {p.projectTitle || 'Untitled'}
                    </option>
                  ))}
                  {availableProposals.length === 0 && <option disabled>No proposals available</option>}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Main header area */}
        <div style={{ padding: '22px 22px 18px' }}>
          {project.projectNumber && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 6 }}>
              {project.projectNumber}
            </div>
          )}
          <h1 style={{ margin: '0 0 10px', fontSize: '1.75rem', lineHeight: 1.2 }}>{project.title}</h1>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--slate)' }}>
            <span className="status-badge" style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}55` }}>
              {stage.label}
            </span>
            {client && (
              <span>
                Client: <span style={{ color: 'var(--brand)', cursor: 'pointer' }} onClick={() => navigate('/clients')}>{client.company}</span>
              </span>
            )}
            {project.deadline && (
              <span>
                Due {project.deadline}
                {dday !== null && (
                  <span style={{ color: dday < 0 ? '#ef4444' : dday < 14 ? '#f59e0b' : 'var(--slate)', fontWeight: 500, marginLeft: 4 }}>
                    ({dday < 0 ? `${Math.abs(dday)}d overdue` : dday === 0 ? 'today' : `${dday}d left`})
                  </span>
                )}
              </span>
            )}
            {project.budget > 0 && (
              <span>{formatCurrency(project.budget)}</span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <label style={{ fontSize: '0.8rem' }}>Stage:</label>
              <select
                value={project.stage}
                onChange={e => updateProject({ stage: e.target.value })}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.8rem' }}
              >
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-card__label">Budget</span>
          <span className="stat-card__value">{formatCurrency(project.budget)}</span>
          {project.budget > 0 && <span className="stat-card__trend">{budgetUsed}% invoiced</span>}
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Invoiced</span>
          <span className="stat-card__value">{formatCurrency(invoicedTotal)}</span>
          <span className="stat-card__trend">{projectInvoices.length} invoice{projectInvoices.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Hours Logged</span>
          <span className="stat-card__value">{totalHours.toFixed(1)}h</span>
          <span className="stat-card__trend">{projectTime.length} entr{projectTime.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Deadline</span>
          <span className="stat-card__value">{project.deadline || '—'}</span>
          {dday !== null && (
            <span className="stat-card__trend" style={{ color: dday < 0 ? '#ef4444' : dday < 14 ? '#f59e0b' : 'var(--slate)' }}>
              {dday < 0 ? `${Math.abs(dday)}d overdue` : dday === 0 ? 'Today' : `${dday}d remaining`}
            </span>
          )}
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Deliverables</span>
          <span className="stat-card__value">{completedCount}/{deliverables.length}</span>
          <span className="stat-card__trend">{deliverableProgress}% complete</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* Description */}
          {project.description && (
            <div className="panel">
              <div className="panel__header"><h3>Description</h3></div>
              <div style={{ padding: '16px 22px', color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {project.description}
              </div>
            </div>
          )}

          {/* Scope of Work */}
          <div className="panel">
            <div className="panel__header">
              <h3>Scope of Work</h3>
              {!editingScope && (
                <button className="btn btn--ghost btn--sm" onClick={openScopeEditor}>
                  {project.scopeOfWork ? 'Edit' : '+ Add Scope'}
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px' }}>
              {editingScope ? (
                <>
                  <textarea
                    value={scopeDraft}
                    onChange={e => setScopeDraft(e.target.value)}
                    rows={8}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical' }}
                    placeholder="Describe the scope: objectives, milestones, assumptions, out-of-scope items..."
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn--primary btn--sm" onClick={saveScope}>Save</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditingScope(false)}>Cancel</button>
                  </div>
                </>
              ) : project.scopeOfWork ? (
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  {project.scopeOfWork}
                </p>
              ) : (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                  No scope documented yet. Click "+ Add Scope" to define objectives, milestones, and out-of-scope items.
                </p>
              )}
            </div>
          </div>

          {/* Deliverables */}
          <div className="panel">
            <div className="panel__header">
              <h3>Deliverables ({completedCount}/{deliverables.length})</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{deliverableProgress}%</span>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {deliverables.length > 0 && (
                <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--brand)', height: '100%', width: `${deliverableProgress}%`, transition: 'width 0.3s' }} />
                </div>
              )}
              {deliverables.length === 0 && (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: 14 }}>
                  No deliverables yet. Add items below to track progress.
                </p>
              )}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {deliverables.map(d => (
                  <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!d.done}
                      onChange={() => toggleDeliverable(d.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--brand)' }}
                    />
                    <span style={{ flex: 1, fontSize: '0.9rem', textDecoration: d.done ? 'line-through' : 'none', color: d.done ? 'var(--slate)' : 'var(--ink)' }}>
                      {d.text}
                    </span>
                    <button className="btn btn--ghost btn--sm" onClick={() => removeDeliverable(d.id)} title="Remove">×</button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  type="text"
                  value={newDeliverable}
                  onChange={e => setNewDeliverable(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDeliverable()}
                  placeholder="Add a deliverable..."
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.9rem' }}
                />
                <button className="btn btn--primary btn--sm" onClick={addDeliverable}>Add</button>
              </div>
            </div>
          </div>

          {/* Update Log */}
          <div className="panel">
            <div className="panel__header"><h3>Update Log ({updates.length})</h3></div>
            <div style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  value={newUpdate}
                  onChange={e => setNewUpdate(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addUpdate()}
                  placeholder="Post an update..."
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.9rem' }}
                />
                <button className="btn btn--primary btn--sm" onClick={addUpdate}>Post</button>
              </div>
              {updates.length === 0 ? (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                  No updates yet. Post status notes, milestones, or client communications here.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {updates.map(u => (
                    <div key={u.id} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: '3px solid var(--brand)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>
                          {new Date(u.createdAt).toLocaleString()}
                        </span>
                        <button className="btn btn--ghost btn--sm" onClick={() => removeUpdate(u.id)} title="Remove">×</button>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{u.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* Linked Proposal */}
          <div className="panel">
            <div className="panel__header"><h3>Proposal</h3></div>
            <div style={{ padding: '12px 16px' }}>
              {linkedProposal ? (
                <div
                  onClick={() => navigate('/proposals')}
                  style={{ padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
                      {linkedProposal.proposalNumber || linkedProposal.id}
                    </span>
                    <span className={`status-pill status-pill--${linkedProposal.status}`} style={{ fontSize: '0.7rem' }}>{linkedProposal.status}</span>
                  </div>
                  {linkedProposal.projectTitle && (
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>{linkedProposal.projectTitle}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: 4 }}>
                    {linkedProposal.createdAt?.split('T')[0]}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                  No proposal linked. Use "Link proposal" at the top to attach one and autofill scope + deliverables.
                </p>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="panel">
            <div className="panel__header"><h3>Invoices ({projectInvoices.length})</h3></div>
            <div style={{ padding: '12px 16px' }}>
              {projectInvoices.length === 0 ? (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                  No invoices for this project yet.
                </p>
              ) : (
                projectInvoices.map(inv => {
                  const total = (inv.items || []).reduce((s, item) => s + (item.quantity || 0) * (item.rate || 0), 0);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => navigate('/invoices')}
                      style={{ padding: 10, marginBottom: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{inv.invoiceNumber}</span>
                        <span className={`status-pill status-pill--${inv.status}`} style={{ fontSize: '0.7rem' }}>{inv.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate)', marginTop: 4 }}>
                        <span>{inv.issueDate || inv.createdAt?.split('T')[0]}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="panel">
            <div className="panel__header"><h3>Documents ({projectDocs.length})</h3></div>
            <div style={{ padding: '12px 16px' }}>
              {projectDocs.length === 0 ? (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                  No documents attached.
                </p>
              ) : (
                projectDocs.map(d => (
                  <div key={d.id} style={{ padding: 10, marginBottom: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: 2 }}>{d.type}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Time */}
          {projectTime.length > 0 && (
            <div className="panel">
              <div className="panel__header"><h3>Recent Time</h3></div>
              <div style={{ padding: '12px 16px' }}>
                {projectTime.slice(0, 5).map(e => (
                  <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--slate)', fontSize: '0.75rem' }}>{e.date}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{e.hours}h {e.minutes}m</span>
                    </div>
                    {e.description && <div style={{ color: 'var(--slate)', fontSize: '0.8rem', marginTop: 2 }}>{e.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEditModal && editForm && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Edit Project</h2>
              <button className="modal__close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Project Number</label>
                  <input
                    type="text"
                    value={editForm.projectNumber}
                    onChange={e => setEditForm(f => ({ ...f, projectNumber: e.target.value }))}
                    placeholder="PRJ-2026-001"
                  />
                </div>
                <div className="form-group">
                  <label>Project Title *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Website Redesign"
                  />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select value={editForm.clientId} onChange={e => setEditForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">No client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Stage</label>
                  <select value={editForm.stage} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}>
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget ($)</label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
                <div className="form-group form-group--full">
                  <label>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="High-level project summary..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveEditModal}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
