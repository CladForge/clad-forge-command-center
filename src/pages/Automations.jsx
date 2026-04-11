import { useState, useMemo } from 'react';
import { generateId } from '../data/initialData';

const TRIGGER_TYPES = [
  { value: 'new_client', label: 'New Client Added', icon: '👤' },
  { value: 'deal_stage_change', label: 'Deal Stage Changed', icon: '📊' },
  { value: 'project_milestone', label: 'Project Milestone', icon: '🎯' },
  { value: 'invoice_overdue', label: 'Invoice Overdue', icon: '💰' },
  { value: 'invoice_paid', label: 'Invoice Paid', icon: '✅' },
  { value: 'onboarding_received', label: 'Onboarding Form Received', icon: '📋' },
  { value: 'no_contact', label: 'No Client Contact (days)', icon: '❤️' },
  { value: 'scheduled', label: 'Scheduled (recurring)', icon: '⏰' },
];

const ACTION_TYPES = [
  { value: 'create_notification', label: 'Create Notification' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'update_status', label: 'Update Entity Status' },
  { value: 'create_event', label: 'Create Calendar Event' },
  { value: 'ai_generate', label: 'AI Generate Content' },
];

const PRESET_AUTOMATIONS = [
  {
    name: 'Client Welcome',
    description: 'When a new client is added, create a notification and schedule a follow-up',
    triggerType: 'new_client',
    triggerConfig: {},
    actions: [
      { type: 'create_notification', config: { text: 'New client added — schedule intro call' } },
      { type: 'create_event', config: { title: 'Follow up with new client', daysFromNow: 3 } },
    ],
    icon: '📧',
  },
  {
    name: 'Invoice Follow-Up',
    description: 'Send a reminder when an invoice becomes overdue',
    triggerType: 'invoice_overdue',
    triggerConfig: {},
    actions: [
      { type: 'create_notification', config: { text: 'Invoice overdue — follow up with client' } },
      { type: 'create_event', config: { title: 'Invoice follow-up', daysFromNow: 1 } },
    ],
    icon: '💰',
  },
  {
    name: 'Deal Won Conversion',
    description: 'When a deal is won, notify the team and create a kickoff event',
    triggerType: 'deal_stage_change',
    triggerConfig: { toStage: 'won' },
    actions: [
      { type: 'create_notification', config: { text: 'Deal won! Start onboarding process' } },
      { type: 'create_event', config: { title: 'Project kickoff meeting', daysFromNow: 5 } },
    ],
    icon: '🏆',
  },
  {
    name: 'Deadline Warning',
    description: 'Alert 7 days before a project deadline',
    triggerType: 'project_milestone',
    triggerConfig: { daysBefore: 7 },
    actions: [
      { type: 'create_notification', config: { text: 'Project deadline approaching in 7 days' } },
    ],
    icon: '⏰',
  },
  {
    name: 'Client Health Check',
    description: 'Flag clients with no activity for 14 days',
    triggerType: 'no_contact',
    triggerConfig: { days: 14 },
    actions: [
      { type: 'create_notification', config: { text: 'No contact with client for 14 days' } },
      { type: 'create_event', config: { title: 'Client check-in', daysFromNow: 1 } },
    ],
    icon: '❤️',
  },
  {
    name: 'Onboarding Alert',
    description: 'Notify when a new onboarding form is submitted',
    triggerType: 'onboarding_received',
    triggerConfig: {},
    actions: [
      { type: 'create_notification', config: { text: 'New client onboarding form received — review and convert' } },
    ],
    icon: '📋',
  },
];

const emptyForm = {
  name: '',
  description: '',
  triggerType: 'new_client',
  triggerConfig: {},
  actions: [{ type: 'create_notification', config: { text: '' } }],
};

export default function Automations({ automations = [], setAutomations }) {
  const [expanded, setExpanded] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const activeCount = automations.filter(a => a.status === 'active').length;
  const pausedCount = automations.filter(a => a.status === 'paused').length;
  const totalRuns = automations.reduce((s, a) => s + (a.runCount || 0), 0);

  function toggleStatus(id) {
    if (!setAutomations) return;
    setAutomations(prev => prev.map(a =>
      a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a
    ));
  }

  function deleteAutomation(id) {
    if (!confirm('Delete this automation?')) return;
    if (!setAutomations) return;
    setAutomations(prev => prev.filter(a => a.id !== id));
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setWizardStep(1);
    setShowModal(true);
  }

  function openEdit(auto) {
    setEditing(auto);
    setForm({
      name: auto.name,
      description: auto.description || '',
      triggerType: auto.triggerType,
      triggerConfig: auto.triggerConfig || {},
      actions: auto.actions?.length ? auto.actions : [{ type: 'create_notification', config: { text: '' } }],
    });
    setWizardStep(1);
    setShowModal(true);
  }

  function usePreset(preset) {
    setEditing(null);
    setForm({
      name: preset.name,
      description: preset.description,
      triggerType: preset.triggerType,
      triggerConfig: preset.triggerConfig,
      actions: preset.actions,
    });
    setWizardStep(3);
    setShowModal(true);
  }

  function addAction() {
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'create_notification', config: { text: '' } }] }));
  }

  function removeAction(idx) {
    setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== idx) }));
  }

  function updateAction(idx, field, value) {
    setForm(f => ({
      ...f,
      actions: f.actions.map((a, i) => i === idx ? (field === 'type' ? { type: value, config: {} } : { ...a, config: { ...a.config, [field]: value } }) : a),
    }));
  }

  function handleSave() {
    if (!form.name.trim() || !setAutomations) return;
    if (editing) {
      setAutomations(prev => prev.map(a => a.id === editing.id ? {
        ...a,
        name: form.name,
        description: form.description,
        triggerType: form.triggerType,
        triggerConfig: form.triggerConfig,
        actions: form.actions,
      } : a));
    } else {
      setAutomations(prev => [{
        id: generateId(),
        ...form,
        status: 'active',
        runCount: 0,
        lastRunAt: null,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    }
    setShowModal(false);
  }

  const triggerLabel = (type) => TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  const triggerIcon = (type) => TRIGGER_TYPES.find(t => t.value === type)?.icon || '⚡';

  return (
    <div className="automations">
      <div className="automations-header">
        <div>
          <h2 className="automations-title">Automations</h2>
          <p className="automations-subtitle">Workflows that run automatically so you don't have to</p>
        </div>
        <button className="btn btn--primary" onClick={openAdd}>+ New Automation</button>
      </div>

      {/* Stats */}
      <div className="automations-stats">
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--success)' }} /><div className="stat-card__label">Active</div><div className="stat-card__value">{activeCount}</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--warning)' }} /><div className="stat-card__label">Paused</div><div className="stat-card__value">{pausedCount}</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--brand)' }} /><div className="stat-card__label">Total Runs</div><div className="stat-card__value">{totalRuns}</div></div>
      </div>

      {/* Presets (show when no automations exist) */}
      {automations.length === 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel__header"><h3>Quick Start Templates</h3></div>
          <div className="panel__body" style={{ padding: 16 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate)', marginBottom: 12 }}>Get started with these pre-built automations:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {PRESET_AUTOMATIONS.map((p, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }} onClick={() => usePreset(p)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                    <strong style={{ fontSize: '0.88rem' }}>{p.name}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{p.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Automation list */}
      <div className="automations-list">
        {automations.map(w => (
          <div key={w.id} className={`automation-card ${expanded === w.id ? 'automation-card--expanded' : ''}`}>
            <div className="automation-card-header" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
              <span className="automation-icon">{triggerIcon(w.triggerType)}</span>
              <div className="automation-info">
                <h4 className="automation-name">{w.name}</h4>
                <p className="automation-trigger">Trigger: {triggerLabel(w.triggerType)}</p>
              </div>
              <span className="automation-runs">{w.runCount || 0} runs</span>
              <span className={`badge ${w.status === 'active' ? 'badge--success' : 'badge--warning'}`}>
                {w.status}
              </span>
              <button
                className={`btn btn--sm ${w.status === 'active' ? 'btn--ghost' : 'btn--primary'}`}
                onClick={e => { e.stopPropagation(); toggleStatus(w.id); }}
              >
                {w.status === 'active' ? 'Pause' : 'Activate'}
              </button>
              <span className="automation-chevron">{expanded === w.id ? '▲' : '▼'}</span>
            </div>
            {expanded === w.id && (
              <div className="automation-steps">
                {w.description && (
                  <div style={{ padding: '0 0 10px', fontSize: '0.82rem', color: 'var(--slate)' }}>{w.description}</div>
                )}
                {(w.actions || []).map((action, i) => (
                  <div key={i} className="automation-step">
                    <div className="automation-step-num">{i + 1}</div>
                    <span>{ACTION_TYPES.find(a => a.value === action.type)?.label || action.type}: {action.config?.text || action.config?.title || JSON.stringify(action.config)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => openEdit(w)}>Edit</button>
                  <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteAutomation(w.id)}>Delete</button>
                </div>
                {w.lastRunAt && (
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--slate)' }}>
                    Last run: {new Date(w.lastRunAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Wizard Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editing ? 'Edit Automation' : 'New Automation'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal__body">
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, justifyContent: 'center' }}>
                {['Trigger', 'Actions', 'Name & Save'].map((label, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: wizardStep === i + 1 ? 1 : 0.4 }} onClick={() => setWizardStep(i + 1)}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: wizardStep === i + 1 ? 'var(--brand)' : 'var(--surface)', color: wizardStep === i + 1 ? '#000' : 'var(--slate)',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: wizardStep === i + 1 ? 600 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Trigger */}
              {wizardStep === 1 && (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.82rem', fontWeight: 500 }}>When this happens:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {TRIGGER_TYPES.map(t => (
                      <div
                        key={t.value}
                        onClick={() => setForm(f => ({ ...f, triggerType: t.value }))}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: `1px solid ${form.triggerType === t.value ? 'var(--brand)' : 'var(--border)'}`,
                          background: form.triggerType === t.value ? 'var(--brand-wash)' : 'var(--surface)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span style={{ marginRight: 6 }}>{t.icon}</span>
                        {t.label}
                      </div>
                    ))}
                  </div>
                  {form.triggerType === 'no_contact' && (
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label>Days without contact</label>
                      <input type="number" value={form.triggerConfig.days || 14} onChange={e => setForm(f => ({ ...f, triggerConfig: { ...f.triggerConfig, days: parseInt(e.target.value) } }))} />
                    </div>
                  )}
                  {form.triggerType === 'deal_stage_change' && (
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label>To stage</label>
                      <select value={form.triggerConfig.toStage || ''} onChange={e => setForm(f => ({ ...f, triggerConfig: { ...f.triggerConfig, toStage: e.target.value } }))}>
                        <option value="">Any stage</option>
                        <option value="contacted">Contacted</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Actions */}
              {wizardStep === 2 && (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.82rem', fontWeight: 500 }}>Then do these things:</label>
                  {form.actions.map((action, i) => (
                    <div key={i} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: 'var(--surface)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--brand)' }}>Step {i + 1}</span>
                        <select value={action.type} onChange={e => updateAction(i, 'type', e.target.value)} style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--ink)', fontSize: '0.8rem' }}>
                          {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        {form.actions.length > 1 && (
                          <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => removeAction(i)}>Remove</button>
                        )}
                      </div>
                      {(action.type === 'create_notification' || action.type === 'send_email') && (
                        <input
                          value={action.config.text || ''}
                          onChange={e => updateAction(i, 'text', e.target.value)}
                          placeholder={action.type === 'send_email' ? 'Email subject/content...' : 'Notification message...'}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--ink)', fontSize: '0.82rem' }}
                        />
                      )}
                      {action.type === 'create_event' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={action.config.title || ''}
                            onChange={e => updateAction(i, 'title', e.target.value)}
                            placeholder="Event title..."
                            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--ink)', fontSize: '0.82rem' }}
                          />
                          <input
                            type="number"
                            value={action.config.daysFromNow || 1}
                            onChange={e => updateAction(i, 'daysFromNow', parseInt(e.target.value))}
                            placeholder="Days from now"
                            style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--ink)', fontSize: '0.82rem' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn btn--ghost btn--sm" onClick={addAction} style={{ marginTop: 4 }}>+ Add Action</button>
                </div>
              )}

              {/* Step 3: Name & Save */}
              {wizardStep === 3 && (
                <div>
                  <div className="form-group">
                    <label>Automation Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Client Welcome" />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this automation do?" />
                  </div>
                  <div className="panel" style={{ marginTop: 16 }}>
                    <div className="panel__body" style={{ padding: 16 }}>
                      <div style={{ fontSize: '0.82rem' }}>
                        <strong>Trigger:</strong> {triggerLabel(form.triggerType)}
                        {Object.keys(form.triggerConfig).length > 0 && (
                          <span style={{ color: 'var(--slate)' }}> ({JSON.stringify(form.triggerConfig)})</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', marginTop: 8 }}>
                        <strong>Actions ({form.actions.length}):</strong>
                        {form.actions.map((a, i) => (
                          <div key={i} style={{ marginLeft: 16, marginTop: 4, color: 'var(--slate)' }}>
                            {i + 1}. {ACTION_TYPES.find(t => t.value === a.type)?.label || a.type}
                            {a.config?.text && `: "${a.config.text}"`}
                            {a.config?.title && `: "${a.config.title}"`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal__footer">
              {wizardStep > 1 && (
                <button className="btn btn--secondary" onClick={() => setWizardStep(s => s - 1)}>Back</button>
              )}
              <div style={{ flex: 1 }} />
              {wizardStep < 3 ? (
                <button className="btn btn--primary" onClick={() => setWizardStep(s => s + 1)}>Next</button>
              ) : (
                <button className="btn btn--primary" onClick={handleSave} disabled={!form.name.trim()}>
                  {editing ? 'Save Changes' : 'Create Automation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
