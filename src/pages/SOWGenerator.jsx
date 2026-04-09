import { useState, useRef } from 'react';
import { generateId } from '../data/initialData';

const STEPS = ['Client & Project', 'Scope', 'Deliverables', 'Budget & Timeline', 'Terms', 'Preview'];

const emptySOW = {
  clientId: '',
  projectTitle: '',
  description: '',
  scopeItems: [{ title: '', description: '' }],
  deliverables: [{ title: '', dueDate: '' }],
  timeline: { startDate: '', endDate: '' },
  budget: 0,
  terms: 'Payment schedule: 30% upon signing, 30% at midpoint delivery, 40% upon final delivery. All work remains property of Clad Forge until final payment is received. Includes 30 days of post-delivery support.',
  status: 'draft',
};

export default function SOWGenerator({ clients, sows, setSOWs, settings }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptySOW);
  const [saved, setSaved] = useState(false);
  const previewRef = useRef(null);

  const selectedClient = clients.find(c => c.id === form.clientId);

  function updateForm(updates) {
    setForm(prev => ({ ...prev, ...updates }));
  }

  function addScopeItem() {
    setForm(prev => ({
      ...prev,
      scopeItems: [...prev.scopeItems, { title: '', description: '' }],
    }));
  }

  function removeScopeItem(index) {
    setForm(prev => ({
      ...prev,
      scopeItems: prev.scopeItems.filter((_, i) => i !== index),
    }));
  }

  function updateScopeItem(index, field, value) {
    setForm(prev => ({
      ...prev,
      scopeItems: prev.scopeItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addDeliverable() {
    setForm(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, { title: '', dueDate: '' }],
    }));
  }

  function removeDeliverable(index) {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
    }));
  }

  function updateDeliverable(index, field, value) {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function handleSave() {
    const sow = {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSOWs(prev => [...prev, sow]);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SOW — ${form.projectTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Space Grotesk', sans-serif; color: #1a1a1a; padding: 48px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          .header { border-bottom: 3px solid #ff8c00; padding-bottom: 24px; margin-bottom: 32px; }
          .header h1 { font-size: 28px; color: #0a0a0a; }
          .header .company { font-family: 'IBM Plex Mono', monospace; color: #ff8c00; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
          .header .subtitle { color: #666; font-size: 14px; }
          .section { margin-bottom: 28px; }
          .section h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #ff8c00; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 16px; }
          .section p { color: #444; font-size: 14px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-item label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; }
          .info-item span { font-size: 14px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
          th { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; background: #f9f9f9; }
          .budget { font-size: 24px; font-weight: 700; color: #ff8c00; font-family: 'IBM Plex Mono', monospace; }
          .terms { font-size: 13px; color: #666; line-height: 1.7; white-space: pre-wrap; }
          .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; }
          .sig-block { flex: 1; }
          .sig-block h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 48px; }
          .sig-line { border-top: 1px solid #333; padding-top: 8px; font-size: 13px; color: #666; max-width: 220px; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${settings?.companyName || 'Clad Forge'}</div>
          <h1>Statement of Work</h1>
          <div class="subtitle">${form.projectTitle} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <div class="section">
          <h2>Client Information</h2>
          <div class="info-grid">
            <div class="info-item"><label>Client</label><span>${selectedClient?.name || 'N/A'}</span></div>
            <div class="info-item"><label>Company</label><span>${selectedClient?.company || 'N/A'}</span></div>
            <div class="info-item"><label>Email</label><span>${selectedClient?.email || 'N/A'}</span></div>
            <div class="info-item"><label>Phone</label><span>${selectedClient?.phone || 'N/A'}</span></div>
          </div>
        </div>

        <div class="section">
          <h2>Project Overview</h2>
          <p>${form.description}</p>
        </div>

        <div class="section">
          <h2>Scope of Work</h2>
          <table>
            <thead><tr><th>#</th><th>Item</th><th>Description</th></tr></thead>
            <tbody>
              ${form.scopeItems.filter(s => s.title).map((s, i) => `<tr><td>${i + 1}</td><td>${s.title}</td><td>${s.description}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Deliverables</h2>
          <table>
            <thead><tr><th>#</th><th>Deliverable</th><th>Due Date</th></tr></thead>
            <tbody>
              ${form.deliverables.filter(d => d.title).map((d, i) => `<tr><td>${i + 1}</td><td>${d.title}</td><td>${d.dueDate || 'TBD'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Timeline & Budget</h2>
          <div class="info-grid">
            <div class="info-item"><label>Start Date</label><span>${form.timeline.startDate || 'TBD'}</span></div>
            <div class="info-item"><label>End Date</label><span>${form.timeline.endDate || 'TBD'}</span></div>
          </div>
          <div style="margin-top: 16px;">
            <div class="info-item"><label>Total Budget</label></div>
            <div class="budget">$${form.budget.toLocaleString()}</div>
          </div>
        </div>

        <div class="section">
          <h2>Terms & Conditions</h2>
          <p class="terms">${form.terms}</p>
        </div>

        ${settings?.sowFooter ? `<div class="section"><p class="terms" style="font-style: italic;">${settings.sowFooter}</p></div>` : ''}

        <div class="footer">
          <div class="sig-block">
            <h3>Provider</h3>
            <div class="sig-line">${settings?.ownerName || 'Courtland Adaire'}, ${settings?.companyName || 'Clad Forge'}</div>
          </div>
          <div class="sig-block">
            <h3>Client</h3>
            <div class="sig-line">${selectedClient?.name || '_______________'}, ${selectedClient?.company || '_______________'}</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  function handleNewSOW() {
    setForm(emptySOW);
    setStep(0);
    setSaved(false);
  }

  return (
    <div className="sow">
      {/* Progress Steps */}
      <div className="sow__progress">
        {STEPS.map((s, i) => (
          <button
            key={s}
            className={`sow__step ${i === step ? 'sow__step--active' : ''} ${i < step ? 'sow__step--done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="sow__step-num">{i < step ? '✓' : i + 1}</span>
            <span className="sow__step-label">{s}</span>
          </button>
        ))}
        <div className="sow__progress-bar">
          <div
            className="sow__progress-fill"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="sow__content">
        {step === 0 && (
          <div className="sow__section" key="step0">
            <h3 className="sow__section-title">Client & Project Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Select Client *</label>
                <select value={form.clientId} onChange={e => updateForm({ clientId: e.target.value })}>
                  <option value="">Choose a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  value={form.projectTitle}
                  onChange={e => updateForm({ projectTitle: e.target.value })}
                  placeholder="e.g., Fleet Dashboard Development"
                />
              </div>
              <div className="form-group form-group--full">
                <label>Project Description</label>
                <textarea
                  value={form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                  placeholder="Describe the project objectives, goals, and high-level requirements..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="sow__section" key="step1">
            <h3 className="sow__section-title">Scope of Work</h3>
            <p className="sow__section-desc">Define the work items included in this project.</p>
            {form.scopeItems.map((item, i) => (
              <div key={i} className="sow__scope-item">
                <div className="sow__scope-num">{i + 1}</div>
                <div className="sow__scope-fields">
                  <input
                    type="text"
                    value={item.title}
                    onChange={e => updateScopeItem(i, 'title', e.target.value)}
                    placeholder="Scope item title"
                  />
                  <textarea
                    value={item.description}
                    onChange={e => updateScopeItem(i, 'description', e.target.value)}
                    placeholder="Describe this scope item..."
                    rows={2}
                  />
                </div>
                {form.scopeItems.length > 1 && (
                  <button className="sow__scope-remove" onClick={() => removeScopeItem(i)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn--ghost sow__add-btn" onClick={addScopeItem}>
              + Add Scope Item
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="sow__section" key="step2">
            <h3 className="sow__section-title">Deliverables</h3>
            <p className="sow__section-desc">List the deliverables and their target dates.</p>
            {form.deliverables.map((item, i) => (
              <div key={i} className="sow__deliverable-item">
                <div className="sow__scope-num">{i + 1}</div>
                <div className="sow__deliverable-fields">
                  <input
                    type="text"
                    value={item.title}
                    onChange={e => updateDeliverable(i, 'title', e.target.value)}
                    placeholder="Deliverable title"
                  />
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={e => updateDeliverable(i, 'dueDate', e.target.value)}
                  />
                </div>
                {form.deliverables.length > 1 && (
                  <button className="sow__scope-remove" onClick={() => removeDeliverable(i)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn--ghost sow__add-btn" onClick={addDeliverable}>
              + Add Deliverable
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="sow__section" key="step3">
            <h3 className="sow__section-title">Budget & Timeline</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={form.timeline.startDate}
                  onChange={e => updateForm({ timeline: { ...form.timeline, startDate: e.target.value } })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={form.timeline.endDate}
                  onChange={e => updateForm({ timeline: { ...form.timeline, endDate: e.target.value } })}
                />
              </div>
              <div className="form-group">
                <label>Total Budget ($)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => updateForm({ budget: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <select
                  value={settings?.defaultPaymentTerms || 'Net 30'}
                  disabled
                >
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                </select>
              </div>
            </div>
            {form.budget > 0 && (
              <div className="sow__budget-preview">
                <div className="sow__budget-total">
                  <span>Total Project Budget</span>
                  <span className="sow__budget-amount">${form.budget.toLocaleString()}</span>
                </div>
                <div className="sow__budget-breakdown">
                  <div className="sow__budget-item">
                    <span>Upon Signing (30%)</span>
                    <span>${Math.round(form.budget * 0.3).toLocaleString()}</span>
                  </div>
                  <div className="sow__budget-item">
                    <span>Midpoint (30%)</span>
                    <span>${Math.round(form.budget * 0.3).toLocaleString()}</span>
                  </div>
                  <div className="sow__budget-item">
                    <span>Final Delivery (40%)</span>
                    <span>${Math.round(form.budget * 0.4).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="sow__section" key="step4">
            <h3 className="sow__section-title">Terms & Conditions</h3>
            <div className="form-group">
              <label>Contract Terms</label>
              <textarea
                value={form.terms}
                onChange={e => updateForm({ terms: e.target.value })}
                rows={8}
                placeholder="Enter terms and conditions..."
              />
            </div>
            {settings?.sowFooter && (
              <div className="sow__footer-preview">
                <label>Standard Footer (from Settings)</label>
                <p>{settings.sowFooter}</p>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="sow__section sow__preview" key="step5" ref={previewRef}>
            <div className="sow__preview-header">
              <div>
                <span className="sow__preview-company">{settings?.companyName || 'CLAD FORGE'}</span>
                <h3 className="sow__preview-title">Statement of Work</h3>
                <span className="sow__preview-subtitle">{form.projectTitle || 'Untitled Project'}</span>
              </div>
              <div className="sow__preview-actions">
                <button className="btn btn--primary" onClick={handleSave} disabled={saved}>
                  {saved ? '✓ Saved' : 'Save SOW'}
                </button>
                <button className="btn btn--secondary" onClick={handlePrint}>
                  Print / Export PDF
                </button>
                <button className="btn btn--ghost" onClick={handleNewSOW}>
                  New SOW
                </button>
              </div>
            </div>

            <div className="sow__preview-body">
              <div className="sow__preview-section">
                <h4>Client</h4>
                <p>{selectedClient ? `${selectedClient.name} — ${selectedClient.company}` : 'No client selected'}</p>
              </div>

              <div className="sow__preview-section">
                <h4>Description</h4>
                <p>{form.description || 'No description provided'}</p>
              </div>

              <div className="sow__preview-section">
                <h4>Scope of Work</h4>
                {form.scopeItems.filter(s => s.title).map((s, i) => (
                  <div key={i} className="sow__preview-item">
                    <strong>{i + 1}. {s.title}</strong>
                    <p>{s.description}</p>
                  </div>
                ))}
              </div>

              <div className="sow__preview-section">
                <h4>Deliverables</h4>
                {form.deliverables.filter(d => d.title).map((d, i) => (
                  <div key={i} className="sow__preview-item sow__preview-deliverable">
                    <span>{d.title}</span>
                    <span className="sow__preview-date">{d.dueDate || 'TBD'}</span>
                  </div>
                ))}
              </div>

              <div className="sow__preview-section sow__preview-budget-section">
                <h4>Budget</h4>
                <span className="sow__preview-budget">${form.budget.toLocaleString()}</span>
              </div>

              <div className="sow__preview-section">
                <h4>Timeline</h4>
                <p>{form.timeline.startDate || 'TBD'} — {form.timeline.endDate || 'TBD'}</p>
              </div>

              <div className="sow__preview-section">
                <h4>Terms</h4>
                <p className="sow__preview-terms">{form.terms}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="sow__nav">
        <button
          className="btn btn--ghost"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
        >
          ← Previous
        </button>
        <span className="sow__nav-indicator">
          Step {step + 1} of {STEPS.length}
        </span>
        <button
          className="btn btn--primary"
          onClick={() => setStep(s => s + 1)}
          disabled={step === STEPS.length - 1}
        >
          Next →
        </button>
      </div>

      {/* Saved SOWs list */}
      {sows.length > 0 && (
        <div className="sow__saved">
          <h3 className="sow__saved-title">Saved Statements of Work</h3>
          <div className="sow__saved-list">
            {sows.map(sow => {
              const client = clients.find(c => c.id === sow.clientId);
              return (
                <div key={sow.id} className="sow__saved-item">
                  <div className="sow__saved-info">
                    <h4>{sow.projectTitle}</h4>
                    <p>{client?.company || 'Unknown'} — ${sow.budget.toLocaleString()}</p>
                  </div>
                  <div className="sow__saved-meta">
                    <span className={`status-badge status-badge--${sow.status === 'draft' ? 'prospect' : sow.status === 'sent' ? 'on-hold' : 'active'}`}>
                      {sow.status}
                    </span>
                    <span className="sow__saved-date">{sow.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
