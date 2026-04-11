import { useState } from 'react';
import { generateId, initialSettings } from '../data/initialData';

const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'declined', 'expired'];
const STATUS_LABELS = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired' };
const STATUS_COLORS = { draft: 'var(--slate)', sent: 'var(--info)', accepted: 'var(--success)', declined: 'var(--danger)', expired: 'var(--slate-light)' };

function formatCurrency(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function calcTotal(packages) { return (packages || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0); }
function calcFullTotal(packages) { return (packages || []).reduce((s, p) => s + (p.price || 0), 0); }

function generateProposalNumber(sows, settings) {
  const prefix = settings?.sowPrefix || 'PROP';
  const year = new Date().getFullYear();
  const existing = sows.filter(s => s.proposalNumber?.startsWith(`${prefix}-${year}`));
  return `${prefix}-${year}-${String(existing.length + 1).padStart(3, '0')}`;
}

export default function Proposals({ clients, projects, sows, setSOWs, settings: rawSettings }) {
  const settings = { ...initialSettings, ...rawSettings };
  const [view, setView] = useState('list'); // list | create | preview
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [previewId, setPreviewId] = useState(null);

  const filtered = sows.filter(s => filterStatus === 'all' || s.status === filterStatus)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalValue = sows.filter(s => s.status === 'accepted').reduce((s, p) => s + calcTotal(p.packages), 0);
  const pendingValue = sows.filter(s => s.status === 'sent').reduce((s, p) => s + calcTotal(p.packages), 0);

  function handleSave(proposal) {
    if (editId) {
      setSOWs(prev => prev.map(s => s.id === editId ? { ...proposal, id: editId } : s));
    } else {
      setSOWs(prev => [proposal, ...prev]);
    }
    setView('list');
    setEditId(null);
  }

  function handleDelete(id) {
    setSOWs(prev => prev.filter(s => s.id !== id));
    setPreviewId(null);
  }

  function handleStatusChange(id, status) {
    setSOWs(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updates = { status };
      if (status === 'accepted') updates.acceptedDate = new Date().toISOString().split('T')[0];
      if (status === 'sent') updates.sentDate = new Date().toISOString().split('T')[0];
      return { ...s, ...updates };
    }));
  }

  function handleEdit(proposal) {
    setEditId(proposal.id);
    setView('create');
  }

  function handleDuplicate(proposal) {
    const dup = {
      ...proposal,
      id: generateId(),
      proposalNumber: generateProposalNumber(sows, settings),
      status: 'draft',
      createdAt: new Date().toISOString(),
      sentDate: '',
      acceptedDate: '',
    };
    setSOWs(prev => [dup, ...prev]);
  }

  // ═══ LIST VIEW ═══
  if (view === 'list' && !previewId) {
    return (
      <div className="proposals">
        {/* Summary */}
        <div className="proposals__summary">
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
            <span className="stat-card__label">Total Proposals</span>
            <span className="stat-card__value">{sows.length}</span>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
            <span className="stat-card__label">Accepted Value</span>
            <span className="stat-card__value">{formatCurrency(totalValue)}</span>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
            <span className="stat-card__label">Pending Value</span>
            <span className="stat-card__value">{formatCurrency(pendingValue)}</span>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--warning)' }} />
            <span className="stat-card__label">Win Rate</span>
            <span className="stat-card__value">
              {sows.length > 0 ? Math.round((sows.filter(s => s.status === 'accepted').length / sows.filter(s => s.status !== 'draft').length) * 100 || 0) : 0}%
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="filter-chips">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button key={s} className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
                {s !== 'all' && <span className="filter-chip__count">{sows.filter(p => p.status === s).length}</span>}
              </button>
            ))}
          </div>
          <button className="btn btn--primary" onClick={() => { setEditId(null); setView('create'); }}>
            + New Proposal
          </button>
        </div>

        {/* Proposal Cards */}
        {filtered.length === 0 ? (
          <div className="panel">
            <div className="empty-state">
              <span className="empty-state__icon">📋</span>
              <h3>No proposals yet</h3>
              <p>Create your first proposal to start winning projects</p>
            </div>
          </div>
        ) : (
          <div className="proposals__grid">
            {filtered.map((proposal, i) => {
              const client = clients.find(c => c.id === proposal.clientId);
              const total = calcTotal(proposal.packages);
              const pkgCount = (proposal.packages || []).length;
              const optCount = (proposal.packages || []).filter(p => p.optional).length;
              return (
                <div key={proposal.id} className="proposal-card" style={{ animationDelay: `${i * 40}ms` }} onClick={() => setPreviewId(proposal.id)}>
                  <div className="proposal-card__top">
                    <div className="proposal-card__header">
                      <span className="proposal-card__number">{proposal.proposalNumber || proposal.id}</span>
                      <span className={`status-pill status-pill--${proposal.status}`}>{STATUS_LABELS[proposal.status]}</span>
                    </div>
                    <h3 className="proposal-card__title">{proposal.projectTitle}</h3>
                    <p className="proposal-card__client">{client?.company || '—'}</p>
                    {proposal.description && (
                      <p className="proposal-card__desc">{proposal.description}</p>
                    )}
                  </div>
                  <div className="proposal-card__packages">
                    {(proposal.packages || []).slice(0, 3).map((pkg, j) => (
                      <div key={j} className={`proposal-card__pkg ${pkg.optional ? 'proposal-card__pkg--optional' : ''}`}>
                        <span>{pkg.name}</span>
                        <span className="proposal-card__pkg-price">{formatCurrency(pkg.price)}</span>
                      </div>
                    ))}
                    {pkgCount > 3 && <span className="proposal-card__more">+{pkgCount - 3} more</span>}
                  </div>
                  <div className="proposal-card__footer">
                    <div className="proposal-card__meta">
                      <span>{pkgCount} package{pkgCount !== 1 ? 's' : ''}{optCount > 0 ? ` · ${optCount} optional` : ''}</span>
                      <span>{proposal.createdAt?.split('T')[0]}</span>
                    </div>
                    <div className="proposal-card__total">
                      <span className="proposal-card__total-label">Total</span>
                      <span className="proposal-card__total-value">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══ PREVIEW VIEW ═══
  if (previewId) {
    const proposal = sows.find(s => s.id === previewId);
    if (!proposal) { setPreviewId(null); return null; }
    return (
      <ProposalPreview
        proposal={proposal}
        clients={clients}
        settings={settings}
        onBack={() => setPreviewId(null)}
        onEdit={() => { setPreviewId(null); handleEdit(proposal); }}
        onDelete={() => handleDelete(proposal.id)}
        onStatusChange={(status) => handleStatusChange(proposal.id, status)}
        onDuplicate={() => { handleDuplicate(proposal); setPreviewId(null); }}
        onSendEmail={() => sendProposalEmail(proposal, clients, settings)}
        onPrint={() => printProposal(proposal, clients, settings)}
      />
    );
  }

  // ═══ CREATE / EDIT VIEW ═══
  const editData = editId ? sows.find(s => s.id === editId) : null;
  return (
    <ProposalBuilder
      initial={editData}
      clients={clients}
      projects={projects}
      sows={sows}
      settings={settings}
      onSave={handleSave}
      onCancel={() => { setView('list'); setEditId(null); }}
    />
  );
}

/* ═══════════════════════════════════════════
   PROPOSAL BUILDER (Create / Edit)
   ═══════════════════════════════════════════ */

function ProposalBuilder({ initial, clients, projects, sows, settings, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    packages: initial.packages || initial.scopeItems?.map((s) => ({
      id: generateId(), name: s.title, description: s.description, price: 0, optional: false, items: []
    })) || [makePackage()],
  } : {
    proposalNumber: generateProposalNumber(sows, settings),
    clientId: '',
    projectId: '',
    projectTitle: '',
    description: '',
    packages: [makePackage()],
    timeline: { startDate: '', endDate: '' },
    terms: settings.defaultSowTerms || '',
    notes: '',
    validUntil: getDefaultExpiry(),
    status: 'draft',
  });

  function makePackage() {
    return { id: generateId(), name: '', description: '', price: 0, optional: false, items: [{ text: '', included: true }] };
  }

  function updateForm(updates) { setForm(f => ({ ...f, ...updates })); }

  function handleProjectChange(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const client = clients.find(c => c.id === project.clientId);
    updateForm({
      projectId,
      clientId: client?.id || '',
      projectTitle: project.title,
    });
  }

  function handleClientChange(clientId) {
    updateForm({ clientId });
  }

  // Package CRUD
  function addPackage() {
    setForm(f => ({ ...f, packages: [...f.packages, makePackage()] }));
  }

  function updatePackage(pkgId, updates) {
    setForm(f => ({
      ...f,
      packages: f.packages.map(p => p.id === pkgId ? { ...p, ...updates } : p),
    }));
  }

  function removePackage(pkgId) {
    setForm(f => ({ ...f, packages: f.packages.filter(p => p.id !== pkgId) }));
  }

  function movePackage(index, direction) {
    setForm(f => {
      const arr = [...f.packages];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return f;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return { ...f, packages: arr };
    });
  }

  // Scope items within a package
  function addItem(pkgId) {
    updatePackage(pkgId, {
      items: [...(form.packages.find(p => p.id === pkgId)?.items || []), { text: '', included: true }]
    });
  }

  function updateItem(pkgId, idx, updates) {
    const pkg = form.packages.find(p => p.id === pkgId);
    if (!pkg) return;
    updatePackage(pkgId, {
      items: pkg.items.map((item, i) => i === idx ? { ...item, ...updates } : item)
    });
  }

  function removeItem(pkgId, idx) {
    const pkg = form.packages.find(p => p.id === pkgId);
    if (!pkg) return;
    updatePackage(pkgId, { items: pkg.items.filter((_, i) => i !== idx) });
  }

  function handleSave(status = 'draft') {
    if (!form.projectTitle.trim()) return;
    onSave({
      ...form,
      id: initial?.id || generateId(),
      status,
      createdAt: initial?.createdAt || new Date().toISOString(),
      ...(status === 'sent' ? { sentDate: new Date().toISOString().split('T')[0] } : {}),
    });
  }

  const total = calcTotal(form.packages);
  const fullTotal = calcFullTotal(form.packages);
  const client = clients.find(c => c.id === form.clientId);

  return (
    <div className="prop-builder">
      {/* Header */}
      <div className="prop-builder__header">
        <div>
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>← Back to Proposals</button>
          <h2 className="prop-builder__title">{initial ? 'Edit Proposal' : 'New Proposal'}</h2>
        </div>
        <div className="prop-builder__actions">
          <button className="btn btn--ghost" onClick={() => handleSave('draft')}>Save Draft</button>
          <button className="btn btn--primary" onClick={() => handleSave('sent')}>Save & Mark Sent</button>
        </div>
      </div>

      <div className="prop-builder__body">
        {/* Left: Form */}
        <div className="prop-builder__form">
          {/* Basics */}
          <div className="prop-section">
            <h3 className="prop-section__title">Proposal Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Proposal Number</label>
                <input type="text" value={form.proposalNumber} onChange={e => updateForm({ proposalNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Valid Until</label>
                <input type="date" value={form.validUntil} onChange={e => updateForm({ validUntil: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Link to Project</label>
                <select value={form.projectId || ''} onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">Select project (optional)...</option>
                  {projects.map(p => {
                    const c = clients.find(c2 => c2.id === p.clientId);
                    return <option key={p.id} value={p.id}>{p.title} — {c?.company || ''}</option>;
                  })}
                </select>
              </div>
              <div className="form-group">
                <label>Client</label>
                <select value={form.clientId} onChange={e => handleClientChange(e.target.value)}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div className="form-group form-group--full">
                <label>Project Title *</label>
                <input type="text" value={form.projectTitle} onChange={e => updateForm({ projectTitle: e.target.value })} placeholder="e.g., Fleet Dashboard Development" />
              </div>
              <div className="form-group form-group--full">
                <label>Executive Summary</label>
                <textarea value={form.description} onChange={e => updateForm({ description: e.target.value })} placeholder="High-level overview of what this proposal covers..." rows={3} />
              </div>
            </div>
          </div>

          {/* Packages / Line Items */}
          <div className="prop-section">
            <div className="prop-section__header">
              <h3 className="prop-section__title">Packages & Line Items</h3>
              <button className="btn btn--secondary btn--sm" onClick={addPackage}>+ Add Package</button>
            </div>

            {form.packages.map((pkg, pkgIdx) => (
              <div key={pkg.id} className={`prop-package ${pkg.optional ? 'prop-package--optional' : ''}`}>
                <div className="prop-package__header">
                  <div className="prop-package__num">{pkgIdx + 1}</div>
                  <div className="prop-package__fields">
                    <input
                      type="text"
                      className="prop-package__name"
                      value={pkg.name}
                      onChange={e => updatePackage(pkg.id, { name: e.target.value })}
                      placeholder="Package name (e.g., UI/UX Design)"
                    />
                    <div className="prop-package__price-row">
                      <label>Price $</label>
                      <input
                        type="number"
                        value={pkg.price}
                        onChange={e => updatePackage(pkg.id, { price: Number(e.target.value) || 0 })}
                        min="0"
                        className="prop-package__price-input"
                      />
                      <label className="prop-package__optional-toggle">
                        <input
                          type="checkbox"
                          checked={pkg.optional}
                          onChange={e => updatePackage(pkg.id, { optional: e.target.checked })}
                        />
                        <span>Optional add-on</span>
                      </label>
                    </div>
                  </div>
                  <div className="prop-package__controls">
                    <button className="btn btn--ghost btn--sm" onClick={() => movePackage(pkgIdx, -1)} disabled={pkgIdx === 0} title="Move up">↑</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => movePackage(pkgIdx, 1)} disabled={pkgIdx === form.packages.length - 1} title="Move down">↓</button>
                    {form.packages.length > 1 && (
                      <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => removePackage(pkg.id)} title="Remove">×</button>
                    )}
                  </div>
                </div>

                <div className="prop-package__body">
                  <textarea
                    className="prop-package__desc"
                    value={pkg.description}
                    onChange={e => updatePackage(pkg.id, { description: e.target.value })}
                    placeholder="Describe what's included in this package..."
                    rows={2}
                  />

                  {/* Scope items */}
                  <div className="prop-package__items">
                    <span className="prop-package__items-label">Deliverables / Scope:</span>
                    {(pkg.items || []).map((item, itemIdx) => (
                      <div key={itemIdx} className="prop-package__item">
                        <span className="prop-package__item-bullet">•</span>
                        <input
                          type="text"
                          value={item.text}
                          onChange={e => updateItem(pkg.id, itemIdx, { text: e.target.value })}
                          placeholder="Deliverable or scope item..."
                        />
                        {(pkg.items || []).length > 1 && (
                          <button className="btn btn--ghost btn--sm" onClick={() => removeItem(pkg.id, itemIdx)}>×</button>
                        )}
                      </div>
                    ))}
                    <button className="btn btn--ghost btn--sm" onClick={() => addItem(pkg.id)} style={{ marginTop: 4 }}>+ Add item</button>
                  </div>
                </div>

                <div className="prop-package__footer">
                  {pkg.optional && <span className="prop-package__optional-badge">Optional</span>}
                  <span className="prop-package__total">{formatCurrency(pkg.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="prop-section">
            <h3 className="prop-section__title">Timeline</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.timeline?.startDate || ''} onChange={e => updateForm({ timeline: { ...form.timeline, startDate: e.target.value } })} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.timeline?.endDate || ''} onChange={e => updateForm({ timeline: { ...form.timeline, endDate: e.target.value } })} />
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="prop-section">
            <h3 className="prop-section__title">Terms & Conditions</h3>
            <textarea value={form.terms} onChange={e => updateForm({ terms: e.target.value })} rows={5} />
          </div>

          {/* Notes */}
          <div className="prop-section">
            <h3 className="prop-section__title">Internal Notes</h3>
            <textarea value={form.notes} onChange={e => updateForm({ notes: e.target.value })} rows={3} placeholder="Private notes — not shown to client..." />
          </div>
        </div>

        {/* Right: Live Summary */}
        <div className="prop-builder__sidebar">
          <div className="prop-summary">
            <h4 className="prop-summary__title">Pricing Summary</h4>

            {form.packages.filter(p => p.name || p.price > 0).map(pkg => (
              <div key={pkg.id} className={`prop-summary__row ${pkg.optional ? 'prop-summary__row--optional' : ''}`}>
                <span>{pkg.name || 'Untitled'}{pkg.optional ? ' *' : ''}</span>
                <span className="prop-summary__price">{formatCurrency(pkg.price)}</span>
              </div>
            ))}

            {form.packages.some(p => p.optional) && (
              <div className="prop-summary__note">* Optional — client can exclude</div>
            )}

            <div className="prop-summary__divider" />

            {fullTotal !== total && (
              <div className="prop-summary__row prop-summary__row--sub">
                <span>If all options included</span>
                <span className="prop-summary__price">{formatCurrency(fullTotal)}</span>
              </div>
            )}

            <div className="prop-summary__total">
              <span>Proposal Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {client && (
              <div className="prop-summary__client">
                <span className="prop-summary__client-label">Prepared for</span>
                <span className="prop-summary__client-name">{client.company}</span>
                {(client.contacts || [])[0] && <span className="prop-summary__client-company">{client.contacts[0].name}</span>}
              </div>
            )}

            {form.validUntil && (
              <div className="prop-summary__expiry">
                Valid until {form.validUntil}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PROPOSAL PREVIEW
   ═══════════════════════════════════════════ */

function ProposalPreview({ proposal, clients, settings, onBack, onEdit, onDelete, onStatusChange, onDuplicate, onSendEmail, onPrint }) {
  const client = clients.find(c => c.id === proposal.clientId);
  const total = calcTotal(proposal.packages);
  const fullTotal = calcFullTotal(proposal.packages);
  const requiredPackages = (proposal.packages || []).filter(p => !p.optional);
  const optionalPackages = (proposal.packages || []).filter(p => p.optional);

  return (
    <div className="prop-preview">
      {/* Action bar */}
      <div className="prop-preview__bar">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }} />
        <span className={`status-pill status-pill--${proposal.status} status-pill--lg`}>
          {STATUS_LABELS[proposal.status]}
        </span>
        <div className="prop-preview__bar-actions">
          {proposal.status === 'draft' && (
            <button className="btn btn--primary btn--sm" onClick={() => { onStatusChange('sent'); onSendEmail(); }}>✉ Send Proposal</button>
          )}
          {proposal.status === 'sent' && (
            <>
              <button className="btn btn--secondary btn--sm" onClick={() => onStatusChange('accepted')}>✓ Mark Accepted</button>
              <button className="btn btn--ghost btn--sm" onClick={onSendEmail}>✉ Resend</button>
            </>
          )}
          <button className="btn btn--ghost btn--sm" onClick={onPrint}>🖨 Print</button>
          <button className="btn btn--ghost btn--sm" onClick={onEdit}>Edit</button>
          <button className="btn btn--ghost btn--sm" onClick={onDuplicate}>Duplicate</button>
          <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {/* Document */}
      <div className="prop-document">
        {/* Header */}
        <div className="prop-document__header">
          <div>
            <span className="prop-document__company">{settings.companyName}</span>
            <h1 className="prop-document__title">Proposal</h1>
            <span className="prop-document__number">{proposal.proposalNumber}</span>
          </div>
          <div className="prop-document__header-right">
            <span className="prop-document__date">Prepared {proposal.createdAt?.split('T')[0]}</span>
            {proposal.validUntil && <span className="prop-document__valid">Valid until {proposal.validUntil}</span>}
          </div>
        </div>

        {/* Client + Project */}
        <div className="prop-document__info">
          <div className="prop-document__info-col">
            <h4>Prepared For</h4>
            <p className="prop-document__client-name">{client?.company || '—'}</p>
            {(client?.contacts || [])[0] && <p>{client.contacts[0].name}</p>}
            <p>{client?.email || ''}</p>
          </div>
          <div className="prop-document__info-col">
            <h4>Project</h4>
            <p className="prop-document__client-name">{proposal.projectTitle}</p>
            {proposal.timeline?.startDate && (
              <p>{proposal.timeline.startDate} — {proposal.timeline.endDate || 'TBD'}</p>
            )}
          </div>
        </div>

        {/* Summary */}
        {proposal.description && (
          <div className="prop-document__section">
            <h3>Executive Summary</h3>
            <p>{proposal.description}</p>
          </div>
        )}

        {/* Packages */}
        <div className="prop-document__section">
          <h3>Scope & Pricing</h3>

          {requiredPackages.length > 0 && (
            <div className="prop-document__packages">
              {requiredPackages.map((pkg, i) => (
                <PackageCard key={pkg.id || i} pkg={pkg} index={i + 1} />
              ))}
            </div>
          )}

          {optionalPackages.length > 0 && (
            <>
              <h4 className="prop-document__optional-header">Optional Add-Ons</h4>
              <p className="prop-document__optional-desc">The following packages can be added or removed based on your needs.</p>
              <div className="prop-document__packages">
                {optionalPackages.map((pkg, i) => (
                  <PackageCard key={pkg.id || i} pkg={pkg} index={requiredPackages.length + i + 1} optional />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="prop-document__pricing">
          <div className="prop-document__pricing-header">
            <h3>Investment</h3>
          </div>
          <div className="prop-document__pricing-body">
            {(proposal.packages || []).map((pkg, i) => (
              <div key={i} className={`prop-document__pricing-row ${pkg.optional ? 'prop-document__pricing-row--optional' : ''}`}>
                <span>{pkg.name || `Package ${i + 1}`}{pkg.optional ? ' (optional)' : ''}</span>
                <span className="prop-document__pricing-amount">{formatCurrency(pkg.price)}</span>
              </div>
            ))}
            <div className="prop-document__pricing-total">
              <span>Total Investment</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {fullTotal !== total && (
              <div className="prop-document__pricing-note">
                With all optional add-ons: {formatCurrency(fullTotal)}
              </div>
            )}
          </div>
        </div>

        {/* Terms */}
        {proposal.terms && (
          <div className="prop-document__section">
            <h3>Terms & Conditions</h3>
            <p className="prop-document__terms">{proposal.terms}</p>
          </div>
        )}

        {/* Signature blocks */}
        <div className="prop-document__signatures">
          <div className="prop-document__sig">
            <span className="prop-document__sig-label">Provider</span>
            <div className="prop-document__sig-line" />
            <span>{settings.ownerName}, {settings.companyName}</span>
          </div>
          <div className="prop-document__sig">
            <span className="prop-document__sig-label">Client</span>
            <div className="prop-document__sig-line" />
            <span>{(client?.contacts || [])[0]?.name || '___________'}, {client?.company || '___________'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, index, optional }) {
  return (
    <div className={`pkg-card ${optional ? 'pkg-card--optional' : ''}`}>
      <div className="pkg-card__header">
        <span className="pkg-card__num">{index}</span>
        <div className="pkg-card__info">
          <h4>{pkg.name || 'Untitled Package'}</h4>
          {pkg.description && <p>{pkg.description}</p>}
        </div>
        <span className="pkg-card__price">{formatCurrency(pkg.price)}</span>
      </div>
      {(pkg.items || []).filter(it => it.text).length > 0 && (
        <ul className="pkg-card__items">
          {pkg.items.filter(it => it.text).map((item, i) => (
            <li key={i}>{item.text}</li>
          ))}
        </ul>
      )}
      {optional && <span className="pkg-card__optional-tag">Optional Add-On</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function getDefaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function sendProposalEmail(proposal, clients, settings) {
  const client = clients.find(c => c.id === proposal.clientId);
  const total = calcTotal(proposal.packages);
  const email = client?.email || '';
  const company = settings?.companyName || 'Clad Forge';

  const subject = `Proposal ${proposal.proposalNumber} from ${company} — ${proposal.projectTitle}`;

  const pkgList = (proposal.packages || []).map((pkg, i) =>
    `  ${i + 1}. ${pkg.name}${pkg.optional ? ' (optional)' : ''} — ${formatCurrency(pkg.price)}`
  ).join('\n');

  const body = `Hi ${(client?.contacts || [])[0]?.name || client?.company || ''},

Thank you for the opportunity to work together. Please find our proposal for ${proposal.projectTitle} below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPOSAL ${proposal.proposalNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${proposal.description || ''}

Packages:
${pkgList}

TOTAL INVESTMENT: ${formatCurrency(total)}

${proposal.validUntil ? `This proposal is valid until ${proposal.validUntil}.\n` : ''}
We'd love to discuss this further at your convenience. Please don't hesitate to reach out with any questions.

Best regards,
${settings?.ownerName || ''}
${company}
${settings?.companyEmail || ''}
${settings?.companyPhone || ''}`;

  window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
}

function printProposal(proposal, clients, settings) {
  const client = clients.find(c => c.id === proposal.clientId);
  const total = calcTotal(proposal.packages);
  const fullTotal = calcFullTotal(proposal.packages);
  const company = settings?.companyName || 'Clad Forge';

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Proposal ${proposal.proposalNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;color:#1f2937;padding:48px;max-width:800px;margin:0 auto;line-height:1.7;font-size:14px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #b45309;padding-bottom:24px;margin-bottom:32px}
      .company{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px}
      h1{font-family:'Instrument Serif',Georgia,serif;font-size:32px;font-weight:400;margin:4px 0}
      .number{font-family:'JetBrains Mono',monospace;font-size:13px;color:#b45309}
      .meta{font-size:12px;color:#6b7280;text-align:right;line-height:1.6}
      .two-col{display:flex;gap:40px;margin-bottom:28px}
      .col{flex:1} .col h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px}
      .col .name{font-weight:600;font-size:15px}
      h3{font-family:'Instrument Serif',Georgia,serif;font-size:20px;font-weight:400;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
      .desc{font-size:14px;color:#4b5563;margin-bottom:28px;line-height:1.7}
      .pkg{border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden}
      .pkg.optional{border-style:dashed;border-color:#d97706}
      .pkg-head{display:flex;align-items:center;padding:16px 20px;gap:16px;background:#f9fafb}
      .pkg-num{width:28px;height:28px;border-radius:50%;background:#b45309;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
      .pkg.optional .pkg-num{background:#d97706}
      .pkg-info{flex:1} .pkg-info h4{font-size:15px;font-weight:600;margin-bottom:2px} .pkg-info p{font-size:13px;color:#6b7280}
      .pkg-price{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;color:#b45309}
      .pkg-items{padding:12px 20px 16px;list-style:none}
      .pkg-items li{padding:4px 0;font-size:13px;color:#4b5563;padding-left:16px;position:relative}
      .pkg-items li::before{content:'•';position:absolute;left:0;color:#b45309;font-weight:700}
      .opt-tag{display:inline-block;padding:2px 8px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;border-radius:4px;margin:0 20px 12px}
      .pricing{background:#f9fafb;border-radius:10px;padding:24px;margin:28px 0}
      .pricing-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #e5e7eb}
      .pricing-row.optional{color:#6b7280;font-style:italic}
      .pricing-row:last-of-type{border-bottom:none}
      .pricing-total{display:flex;justify-content:space-between;padding:14px 0 0;border-top:2px solid #1f2937;margin-top:8px;font-size:18px;font-weight:700}
      .pricing-total span:last-child{color:#b45309;font-family:'JetBrains Mono',monospace}
      .pricing-note{font-size:12px;color:#6b7280;margin-top:8px;text-align:right}
      .terms{font-size:13px;color:#6b7280;line-height:1.7;white-space:pre-wrap}
      .sigs{display:flex;gap:40px;margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb}
      .sig{flex:1} .sig-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:48px;display:block}
      .sig-line{border-top:1px solid #1f2937;padding-top:8px;font-size:13px;color:#6b7280}
      @media print{body{padding:24px}}
    </style></head><body>
    <div class="header"><div><div class="company">${company}</div><h1>Proposal</h1><div class="number">${proposal.proposalNumber}</div></div>
    <div class="meta">Prepared ${proposal.createdAt?.split('T')[0]}<br>${proposal.validUntil ? `Valid until ${proposal.validUntil}` : ''}</div></div>
    <div class="two-col"><div class="col"><h4>Prepared For</h4><p class="name">${client?.company || ''}</p>${(client?.contacts || [])[0] ? `<p>${client.contacts[0].name}</p>` : ''}<p>${client?.email || ''}</p></div>
    <div class="col"><h4>Project</h4><p class="name">${proposal.projectTitle}</p>${proposal.timeline?.startDate ? `<p>${proposal.timeline.startDate} — ${proposal.timeline.endDate || 'TBD'}</p>` : ''}</div></div>
    ${proposal.description ? `<p class="desc">${proposal.description}</p>` : ''}
    <h3>Scope & Pricing</h3>
    ${(proposal.packages || []).map((pkg, i) => `
      <div class="pkg ${pkg.optional ? 'optional' : ''}">
        <div class="pkg-head"><div class="pkg-num">${i + 1}</div><div class="pkg-info"><h4>${pkg.name}</h4>${pkg.description ? `<p>${pkg.description}</p>` : ''}</div><div class="pkg-price">${formatCurrency(pkg.price)}</div></div>
        ${pkg.optional ? '<div class="opt-tag">Optional Add-On</div>' : ''}
        ${(pkg.items || []).filter(it => it.text).length > 0 ? `<ul class="pkg-items">${pkg.items.filter(it => it.text).map(it => `<li>${it.text}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    <div class="pricing"><h3 style="border:none;padding:0;margin-bottom:12px">Investment</h3>
    ${(proposal.packages || []).map(pkg => `<div class="pricing-row ${pkg.optional ? 'optional' : ''}"><span>${pkg.name}${pkg.optional ? ' (optional)' : ''}</span><span>${formatCurrency(pkg.price)}</span></div>`).join('')}
    <div class="pricing-total"><span>Total</span><span>${formatCurrency(total)}</span></div>
    ${fullTotal !== total ? `<div class="pricing-note">With all options: ${formatCurrency(fullTotal)}</div>` : ''}
    </div>
    ${proposal.terms ? `<h3>Terms & Conditions</h3><p class="terms">${proposal.terms}</p>` : ''}
    <div class="sigs"><div class="sig"><span class="sig-label">Provider</span><div class="sig-line">${settings?.ownerName || ''}, ${company}</div></div>
    <div class="sig"><span class="sig-label">Client</span><div class="sig-line">${(client?.contacts || [])[0]?.name || '___________'}, ${client?.company || '___________'}</div></div></div>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
