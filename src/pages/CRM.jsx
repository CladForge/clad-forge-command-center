import { useState, useMemo } from 'react';
import { generateId } from '../data/initialData';

const STAGES = [
  { id: 'lead', label: 'Lead', color: '#9ca3af', prob: 10 },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6', prob: 25 },
  { id: 'proposal', label: 'Proposal', color: '#d97706', prob: 50 },
  { id: 'negotiation', label: 'Negotiation', color: '#8b5cf6', prob: 75 },
  { id: 'won', label: 'Won', color: '#059669', prob: 100 },
  { id: 'lost', label: 'Lost', color: '#dc2626', prob: 0 },
];

const PRIORITY_STYLES = {
  hot: { background: 'rgba(220,38,38,0.15)', color: '#ef4444' },
  warm: { background: 'rgba(217,119,6,0.15)', color: '#d97706' },
  cold: { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
};

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'follow-up'];

const fmt = v => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

const emptyDeal = {
  title: '', company: '', contactName: '', contactEmail: '', contactPhone: '', contactTitle: '',
  stage: 'lead', source: '', value: 0, priority: 'warm',
  expectedCloseDate: '', nextStep: '',
};

const emptyPartner = {
  name: '', title: '', company: '', industry: '', email: '', phone: '', location: '', notes: '',
};

const emptyActivity = {
  title: '', type: 'call', description: '', activityDate: '',
};

export default function CRM({ deals, setDeals, crmActivities, setCrmActivities, channelPartners, setChannelPartners, clients }) {
  const [activeTab, setActiveTab] = useState('leads');
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');

  // Deal state
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [dealForm, setDealForm] = useState(emptyDeal);
  const [viewDealId, setViewDealId] = useState(null);

  // DnD state
  const [dragId, setDragId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Activity state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState(emptyActivity);

  // Partner state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState(emptyPartner);

  // ---- KPI calculations ----
  const kpis = useMemo(() => {
    const wonDeals = (deals || []).filter(d => d.stage === 'won');
    const lostDeals = (deals || []).filter(d => d.stage === 'lost');
    const openDeals = (deals || []).filter(d => d.stage !== 'lost');
    const forecastDeals = (deals || []).filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const pipelineValue = openDeals.reduce((s, d) => s + Number(d.value || 0), 0);
    const closedWon = wonDeals.reduce((s, d) => s + Number(d.value || 0), 0);
    const forecast = forecastDeals.reduce((s, d) => {
      const stage = STAGES.find(st => st.id === d.stage);
      const prob = stage ? stage.prob : Number(d.probability || 0);
      return s + Number(d.value || 0) * prob / 100;
    }, 0);
    const winRate = wonDeals.length + lostDeals.length > 0
      ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100)
      : 0;
    return { pipelineValue, closedWon, forecast, winRate };
  }, [deals]);

  // ---- Filtered deals ----
  const filteredDeals = useMemo(() => {
    if (!search) return deals || [];
    const q = search.toLowerCase();
    return (deals || []).filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.company?.toLowerCase().includes(q) ||
      d.contactName?.toLowerCase().includes(q)
    );
  }, [deals, search]);

  // ---- Drag and drop ----
  function handleDragStart(e, dealId) {
    setDragId(dealId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, stageId) {
    e.preventDefault();
    setDragOverStage(stageId);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  function handleDrop(e, stageId) {
    e.preventDefault();
    if (dragId) {
      setDeals(prev => prev.map(d => {
        if (d.id !== dragId) return d;
        const updates = { ...d, stage: stageId };
        if (stageId === 'won') updates.wonAt = new Date().toISOString();
        if (stageId === 'lost') updates.lostAt = new Date().toISOString();
        return updates;
      }));
    }
    setDragId(null);
    setDragOverStage(null);
  }

  // ---- Deal CRUD ----
  function openAddDeal() {
    setEditingDeal(null);
    setDealForm(emptyDeal);
    setShowDealModal(true);
  }

  function openEditDeal(deal) {
    setEditingDeal(deal);
    setDealForm({ ...deal });
    setShowDealModal(true);
  }

  function handleSaveDeal() {
    if (!dealForm.title.trim()) return;
    if (editingDeal) {
      setDeals(prev => prev.map(d => d.id === editingDeal.id ? { ...dealForm, id: d.id } : d));
    } else {
      setDeals(prev => [...prev, {
        ...dealForm,
        id: generateId(),
        createdAt: new Date().toISOString().split('T')[0],
      }]);
    }
    setShowDealModal(false);
  }

  function handleDeleteDeal(id) {
    setDeals(prev => prev.filter(d => d.id !== id));
    if (viewDealId === id) setViewDealId(null);
  }

  // ---- Activity CRUD ----
  function openAddActivity() {
    setActivityForm({ ...emptyActivity, activityDate: new Date().toISOString().split('T')[0] });
    setShowActivityModal(true);
  }

  function handleSaveActivity() {
    if (!activityForm.title.trim()) return;
    setCrmActivities(prev => [...prev, {
      ...activityForm,
      id: generateId(),
      dealId: viewDealId,
      createdAt: new Date().toISOString(),
    }]);
    setShowActivityModal(false);
  }

  // ---- Partner CRUD ----
  function openAddPartner() {
    setEditingPartner(null);
    setPartnerForm(emptyPartner);
    setShowPartnerModal(true);
  }

  function openEditPartner(partner) {
    setEditingPartner(partner);
    setPartnerForm({ ...partner });
    setShowPartnerModal(true);
  }

  function handleSavePartner() {
    if (!partnerForm.name.trim()) return;
    if (editingPartner) {
      setChannelPartners(prev => prev.map(p => p.id === editingPartner.id ? { ...partnerForm, id: p.id } : p));
    } else {
      setChannelPartners(prev => [...prev, {
        ...partnerForm,
        id: generateId(),
        createdAt: new Date().toISOString().split('T')[0],
      }]);
    }
    setShowPartnerModal(false);
  }

  function handleDeletePartner(id) {
    setChannelPartners(prev => prev.filter(p => p.id !== id));
  }

  // =============== DEAL DETAIL VIEW ===============
  if (viewDealId) {
    const deal = (deals || []).find(d => d.id === viewDealId);
    if (!deal) { setViewDealId(null); return null; }
    const dealActivities = (crmActivities || []).filter(a => a.dealId === viewDealId).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const stage = STAGES.find(s => s.id === deal.stage);

    return (
      <div className="crm">
        <button className="btn btn--ghost" onClick={() => setViewDealId(null)} style={{ marginBottom: 16 }}>
          &larr; Back to Deals
        </button>

        <div className="panel">
          <div className="panel__header">
            <h2>{deal.title}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary btn--sm" onClick={() => openEditDeal(deal)}>Edit</button>
              <button className="btn btn--danger btn--sm" onClick={() => handleDeleteDeal(deal.id)}>Delete</button>
            </div>
          </div>
          <div className="panel__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p><strong>Company:</strong> {deal.company || '--'}</p>
                <p><strong>Contact:</strong> {deal.contactName || '--'}</p>
                <p><strong>Email:</strong> {deal.contactEmail || '--'}</p>
                <p><strong>Phone:</strong> {deal.contactPhone || '--'}</p>
                <p><strong>Title:</strong> {deal.contactTitle || '--'}</p>
              </div>
              <div>
                <p><strong>Value:</strong> {fmt(deal.value)}</p>
                <p><strong>Stage:</strong>{' '}
                  <span className="status-badge" style={{ background: stage?.color + '22', color: stage?.color }}>
                    {stage?.label || deal.stage}
                  </span>
                </p>
                <p><strong>Priority:</strong>{' '}
                  <span style={{ ...PRIORITY_STYLES[deal.priority], padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    {deal.priority || '--'}
                  </span>
                </p>
                <p><strong>Source:</strong> {deal.source || '--'}</p>
                <p><strong>Expected Close:</strong> {deal.expectedCloseDate || '--'}</p>
                <p><strong>Next Step:</strong> {deal.nextStep || '--'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel__header">
            <h3>Activities</h3>
            <button className="btn btn--primary btn--sm" onClick={openAddActivity}>+ Add Activity</button>
          </div>
          <div className="panel__body">
            {dealActivities.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No activities yet.</p>}
            {dealActivities.map(a => (
              <div key={a.id} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong>{a.title}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.activityDate || a.createdAt?.split('T')[0]}</span>
                </div>
                <span className="status-badge" style={{ fontSize: 11, marginBottom: 4, display: 'inline-block' }}>{a.type}</span>
                {a.description && <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>{a.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Modal */}
        {showActivityModal && (
          <div className="modal-overlay" onClick={() => setShowActivityModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal__header">
                <h2>Add Activity</h2>
                <button className="modal__close" onClick={() => setShowActivityModal(false)}>&times;</button>
              </div>
              <div className="modal__body">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" value={activityForm.title} onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))} placeholder="Activity title" />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={activityForm.type} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value }))}>
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={activityForm.activityDate} onChange={e => setActivityForm(f => ({ ...f, activityDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={activityForm.description} onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Details..." />
                </div>
              </div>
              <div className="modal__footer">
                <button className="btn btn--ghost" onClick={() => setShowActivityModal(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSaveActivity}>Save Activity</button>
              </div>
            </div>
          </div>
        )}

        {/* Deal Edit Modal (reused) */}
        {showDealModal && renderDealModal()}
      </div>
    );
  }

  // =============== RENDER HELPERS ===============

  function renderDealCard(deal, isDraggable) {
    const stage = STAGES.find(s => s.id === deal.stage);
    return (
      <div
        key={deal.id}
        style={isDraggable ? {
          background: 'var(--surface-elevated)', borderRadius: 6, padding: 12, marginBottom: 8,
          cursor: 'grab', border: '1px solid var(--border)',
          opacity: dragId === deal.id ? 0.5 : 1,
        } : undefined}
        className={!isDraggable ? 'client-card' : undefined}
        draggable={isDraggable}
        onDragStart={isDraggable ? e => handleDragStart(e, deal.id) : undefined}
        onClick={() => setViewDealId(deal.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <strong style={{ fontSize: 14 }}>{deal.title}</strong>
          {deal.priority && (
            <span style={{ ...PRIORITY_STYLES[deal.priority], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
              {deal.priority}
            </span>
          )}
        </div>
        {deal.company && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{deal.company}</div>}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>{fmt(deal.value)}</div>
        {!isDraggable && stage && (
          <span className="status-badge" style={{ background: stage.color + '22', color: stage.color, fontSize: 11 }}>
            {stage.label}
          </span>
        )}
        {deal.expectedCloseDate && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Close: {deal.expectedCloseDate}</div>
        )}
      </div>
    );
  }

  function renderKanban() {
    return (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {STAGES.map(stage => {
          const isTerminal = stage.id === 'won' || stage.id === 'lost';
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const totalVal = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
          return (
            <div
              key={stage.id}
              style={{
                flex: isTerminal ? '0 0 180px' : 1, minWidth: 220,
                background: 'var(--surface)', borderRadius: 8, padding: 12,
                border: dragOverStage === stage.id ? '2px dashed var(--accent)' : '2px solid transparent',
                transition: 'border-color 0.2s',
              }}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color, display: 'inline-block' }} />
                  <strong style={{ fontSize: 13 }}>{stage.label}</strong>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stageDeals.length} &middot; {fmt(totalVal)}</span>
              </div>
              <div>
                {stageDeals.map(deal => renderDealCard(deal, true))}
                {stageDeals.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, fontStyle: 'italic' }}>
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderGrid() {
    return (
      <div className="client-grid">
        {filteredDeals.map(deal => renderDealCard(deal, false))}
        {filteredDeals.length === 0 && <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No deals found.</p>}
      </div>
    );
  }

  function renderTable() {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Company</th>
              <th>Value</th>
              <th>Stage</th>
              <th>Priority</th>
              <th>Expected Close</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map(deal => {
              const stage = STAGES.find(s => s.id === deal.stage);
              return (
                <tr key={deal.id} onClick={() => setViewDealId(deal.id)} style={{ cursor: 'pointer' }}>
                  <td className="data-table__bold">{deal.title}</td>
                  <td>{deal.company}</td>
                  <td className="data-table__mono">{fmt(deal.value)}</td>
                  <td>
                    <span className="status-badge" style={{ background: stage?.color + '22', color: stage?.color }}>
                      {stage?.label || deal.stage}
                    </span>
                  </td>
                  <td>
                    {deal.priority && (
                      <span style={{ ...PRIORITY_STYLES[deal.priority], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {deal.priority}
                      </span>
                    )}
                  </td>
                  <td>{deal.expectedCloseDate || '--'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEditDeal(deal)}>Edit</button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDeleteDeal(deal.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredDeals.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No deals found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderDealModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowDealModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal__header">
            <h2>{editingDeal ? 'Edit Deal' : 'New Deal'}</h2>
            <button className="modal__close" onClick={() => setShowDealModal(false)}>&times;</button>
          </div>
          <div className="modal__body">
            <div className="form-grid">
              <div className="form-group">
                <label>Deal Title *</label>
                <input type="text" value={dealForm.title} onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))} placeholder="Deal title" />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input type="text" value={dealForm.company} onChange={e => setDealForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" />
              </div>
              <div className="form-group">
                <label>Contact Name</label>
                <input type="text" value={dealForm.contactName} onChange={e => setDealForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Contact name" />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={dealForm.contactEmail} onChange={e => setDealForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input type="text" value={dealForm.contactPhone} onChange={e => setDealForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="Phone number" />
              </div>
              <div className="form-group">
                <label>Contact Title</label>
                <input type="text" value={dealForm.contactTitle} onChange={e => setDealForm(f => ({ ...f, contactTitle: e.target.value }))} placeholder="Job title" />
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select value={dealForm.stage} onChange={e => setDealForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Source</label>
                <input type="text" value={dealForm.source} onChange={e => setDealForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g., Referral, Website" />
              </div>
              <div className="form-group">
                <label>Value ($)</label>
                <input type="number" value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={dealForm.priority} onChange={e => setDealForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
              <div className="form-group">
                <label>Expected Close Date</label>
                <input type="date" value={dealForm.expectedCloseDate} onChange={e => setDealForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Next Step</label>
                <input type="text" value={dealForm.nextStep} onChange={e => setDealForm(f => ({ ...f, nextStep: e.target.value }))} placeholder="Next action item" />
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setShowDealModal(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSaveDeal}>{editingDeal ? 'Save Changes' : 'Create Deal'}</button>
          </div>
        </div>
      </div>
    );
  }

  // =============== TAB: LEAD TRACKER ===============
  function renderLeadTracker() {
    return (
      <>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: '#d97706' }} />
            <div className="stat-card__label">Pipeline Value</div>
            <div className="stat-card__value">{fmt(kpis.pipelineValue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: '#059669' }} />
            <div className="stat-card__label">Closed Won</div>
            <div className="stat-card__value">{fmt(kpis.closedWon)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: '#8b5cf6' }} />
            <div className="stat-card__label">Forecast</div>
            <div className="stat-card__value">{fmt(kpis.forecast)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: '#3b82f6' }} />
            <div className="stat-card__label">Win Rate</div>
            <div className="stat-card__value">{kpis.winRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search deals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 200 }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {['kanban', 'grid', 'table'].map(mode => (
                <button
                  key={mode}
                  className={`filter-chip ${viewMode === mode ? 'filter-chip--active' : ''}`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn--primary" onClick={openAddDeal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Deal
          </button>
        </div>

        {/* View */}
        {viewMode === 'kanban' && renderKanban()}
        {viewMode === 'grid' && renderGrid()}
        {viewMode === 'table' && renderTable()}

        {/* Deal Modal */}
        {showDealModal && renderDealModal()}
      </>
    );
  }

  // =============== TAB: ACTIVE CLIENTS ===============
  function renderActiveClients() {
    const activeClients = (clients || []).filter(c => c.status === 'active');
    return (
      <div className="client-grid">
        {activeClients.map(client => (
          <div key={client.id} className="client-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <strong style={{ fontSize: 15 }}>{client.name}</strong>
              <span className="status-badge status-badge--active">Active</span>
            </div>
            {client.company && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{client.company}</div>}
            {client.industry && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{client.industry}</div>}
            {client.value > 0 && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{fmt(client.value)}</div>}
          </div>
        ))}
        {activeClients.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No active clients.</p>
        )}
      </div>
    );
  }

  // =============== TAB: CHANNEL PARTNERS ===============
  function renderChannelPartners() {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn--primary" onClick={openAddPartner}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Partner
          </button>
        </div>

        <div className="client-grid">
          {(channelPartners || []).map(partner => (
            <div key={partner.id} className="client-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{partner.name}</strong>
                  {partner.title && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{partner.title}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => openEditPartner(partner)}>Edit</button>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDeletePartner(partner.id)}>Del</button>
                </div>
              </div>
              {partner.company && <div style={{ fontSize: 13, marginBottom: 4 }}>{partner.company}</div>}
              {partner.industry && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{partner.industry}</div>}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {partner.email && <span>{partner.email}</span>}
                {partner.phone && <span>{partner.phone}</span>}
                {partner.location && <span>{partner.location}</span>}
              </div>
              {partner.notes && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  {partner.notes}
                </div>
              )}
            </div>
          ))}
          {(channelPartners || []).length === 0 && (
            <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No channel partners yet.</p>
          )}
        </div>

        {/* Partner Modal */}
        {showPartnerModal && (
          <div className="modal-overlay" onClick={() => setShowPartnerModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal__header">
                <h2>{editingPartner ? 'Edit Partner' : 'Add Partner'}</h2>
                <button className="modal__close" onClick={() => setShowPartnerModal(false)}>&times;</button>
              </div>
              <div className="modal__body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" value={partnerForm.name} onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner name" />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" value={partnerForm.title} onChange={e => setPartnerForm(f => ({ ...f, title: e.target.value }))} placeholder="Job title" />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <input type="text" value={partnerForm.company} onChange={e => setPartnerForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" />
                  </div>
                  <div className="form-group">
                    <label>Industry</label>
                    <input type="text" value={partnerForm.industry} onChange={e => setPartnerForm(f => ({ ...f, industry: e.target.value }))} placeholder="Industry" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={partnerForm.phone} onChange={e => setPartnerForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
                  </div>
                  <div className="form-group form-group--full">
                    <label>Location</label>
                    <input type="text" value={partnerForm.location} onChange={e => setPartnerForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State" />
                  </div>
                  <div className="form-group form-group--full">
                    <label>Notes</label>
                    <textarea value={partnerForm.notes} onChange={e => setPartnerForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notes about this partner..." />
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <button className="btn btn--ghost" onClick={() => setShowPartnerModal(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSavePartner}>{editingPartner ? 'Save Changes' : 'Add Partner'}</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // =============== MAIN RENDER ===============
  return (
    <div className="crm">
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button className={`filter-chip ${activeTab === 'leads' ? 'filter-chip--active' : ''}`} onClick={() => setActiveTab('leads')}>
          Lead Tracker
        </button>
        <button className={`filter-chip ${activeTab === 'clients' ? 'filter-chip--active' : ''}`} onClick={() => setActiveTab('clients')}>
          Active Clients
        </button>
        <button className={`filter-chip ${activeTab === 'partners' ? 'filter-chip--active' : ''}`} onClick={() => setActiveTab('partners')}>
          Channel Partners
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'leads' && renderLeadTracker()}
      {activeTab === 'clients' && renderActiveClients()}
      {activeTab === 'partners' && renderChannelPartners()}
    </div>
  );
}
