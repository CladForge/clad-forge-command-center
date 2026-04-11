import { useState, useMemo } from 'react';
import { generateId } from '../data/initialData';

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const STATUS_LABELS = { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };

function generateInvoiceNumber(invoices) {
  const year = new Date().getFullYear();
  const existing = invoices.filter(i => i.invoiceNumber?.startsWith(`INV-${year}`));
  const next = existing.length + 1;
  return `INV-${year}-${String(next).padStart(3, '0')}`;
}

function calcSubtotal(items) {
  return items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
}

function calcTotal(items, taxRate = 0, discount = 0) {
  const sub = calcSubtotal(items);
  const tax = sub * (taxRate / 100);
  return Math.max(sub + tax - discount, 0);
}

function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  return diff;
}

function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Invoices({ clients, projects, settings, invoices, setInvoices }) {
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Auto-detect overdue invoices
  useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    const updated = invoices.map(inv => {
      if (inv.status === 'sent' && inv.dueDate && inv.dueDate < today) {
        changed = true;
        return { ...inv, status: 'overdue' };
      }
      return inv;
    });
    if (changed) setInvoices(updated);
  }, [invoices, setInvoices]);

  // Project budget tracking
  const projectInvoiceTotals = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      if (inv.projectId && inv.status !== 'cancelled') {
        map[inv.projectId] = (map[inv.projectId] || 0) + calcTotal(inv.items, inv.taxRate, inv.discount);
      }
    });
    return map;
  }, [invoices]);

  // Filtering
  const filtered = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch = !search ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.projectTitle?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Metrics
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + calcTotal(i.items, i.taxRate, i.discount), 0);
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paidAmount || calcTotal(i.items, i.taxRate, i.discount)), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const thisMonth = invoices.filter(i => {
    const d = new Date(i.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  function handleDelete(id) {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setViewInvoice(null);
  }

  function handleStatusChange(id, status) {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const updates = { status };
      if (status === 'paid') {
        updates.paidDate = new Date().toISOString().split('T')[0];
        updates.paidAmount = calcTotal(inv.items, inv.taxRate, inv.discount);
      }
      if (status === 'sent' && !inv.sentDate) {
        updates.sentDate = new Date().toISOString().split('T')[0];
      }
      return { ...inv, ...updates };
    }));
  }

  return (
    <div className="invoices">
      {/* Summary Cards */}
      <div className="invoices__summary">
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--warning)' }} />
          <span className="stat-card__label">Outstanding</span>
          <span className="stat-card__value">{formatCurrency(outstanding)}</span>
          <span className="stat-card__sub">{invoices.filter(i => i.status === 'sent').length} sent</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <span className="stat-card__label">Paid</span>
          <span className="stat-card__value">{formatCurrency(paidTotal)}</span>
          <span className="stat-card__sub">{invoices.filter(i => i.status === 'paid').length} invoices</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--danger)' }} />
          <span className="stat-card__label">Overdue</span>
          <span className="stat-card__value">{overdueCount}</span>
          <span className="stat-card__sub">{overdueCount > 0 ? 'Needs attention' : 'All clear'}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <span className="stat-card__label">This Month</span>
          <span className="stat-card__value">{thisMonth}</span>
          <span className="stat-card__sub">invoices created</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar__left">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-chips">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button
                key={s}
                className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
                {s !== 'all' && (
                  <span className="filter-chip__count">
                    {invoices.filter(i => i.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          + New Invoice
        </button>
      </div>

      {/* Invoice List */}
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📄</span>
            <h3>{search || filterStatus !== 'all' ? 'No matching invoices' : 'No invoices yet'}</h3>
            <p>Create your first invoice to start tracking payments</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Project</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const total = calcTotal(inv.items, inv.taxRate, inv.discount);
                const days = daysUntilDue(inv.dueDate);
                const dueLabel = inv.status === 'paid'
                  ? `Paid ${inv.paidDate || ''}`
                  : days === null ? '—'
                  : days < 0 ? `${Math.abs(days)}d overdue`
                  : days === 0 ? 'Due today'
                  : `${days}d left`;

                return (
                  <tr key={inv.id} className="data-table__clickable" onClick={() => setViewInvoice(inv)}>
                    <td>
                      <span className="data-table__mono data-table__bold">{inv.invoiceNumber}</span>
                      <span className="data-table__sub">{inv.issueDate}</span>
                    </td>
                    <td>
                      <span>{inv.clientName || '—'}</span>
                      <span className="data-table__sub">{inv.clientCompany || ''}</span>
                    </td>
                    <td>{inv.projectTitle || '—'}</td>
                    <td className="data-table__mono data-table__bold">{formatCurrency(total)}</td>
                    <td>
                      <span className={`status-pill status-pill--${inv.status}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td>
                      <span className={`due-label ${days !== null && days < 0 && inv.status !== 'paid' ? 'due-label--overdue' : ''}`}>
                        {dueLabel}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns" onClick={e => e.stopPropagation()}>
                        <button className="btn btn--ghost btn--sm" onClick={() => handlePrint(inv, clients, settings)} title="Print/PDF">🖨</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => handleSendEmail(inv, clients, settings)} title="Send Email">✉</button>
                        <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => handleDelete(inv.id)} title="Delete">×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Project Budget Remaining */}
      {projects.filter(p => p.budget > 0 && p.stage !== 'completed').length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header">
            <h3>Project Budget Tracker</h3>
          </div>
          <div className="budget-tracker">
            {projects.filter(p => p.budget > 0).map(project => {
              const invoiced = projectInvoiceTotals[project.id] || 0;
              const remaining = project.budget - invoiced;
              const pct = Math.min((invoiced / project.budget) * 100, 100);
              const client = clients.find(c => c.id === project.clientId);
              return (
                <div key={project.id} className="budget-row">
                  <div className="budget-row__info">
                    <span className="budget-row__title">{project.title}</span>
                    <span className="budget-row__client">{client?.company || '—'}</span>
                  </div>
                  <div className="budget-row__bar-wrap">
                    <div className="budget-row__bar">
                      <div
                        className={`budget-row__fill ${pct >= 100 ? 'budget-row__fill--full' : pct >= 75 ? 'budget-row__fill--warn' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="budget-row__pct">{Math.round(pct)}%</span>
                  </div>
                  <div className="budget-row__amounts">
                    <span className="budget-row__invoiced">{formatCurrency(invoiced)} invoiced</span>
                    <span className={`budget-row__remaining ${remaining <= 0 ? 'budget-row__remaining--zero' : ''}`}>
                      {formatCurrency(Math.max(remaining, 0))} remaining
                    </span>
                  </div>
                  <span className="budget-row__budget">of {formatCurrency(project.budget)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Invoice Detail Modal */}
      {viewInvoice && (
        <InvoiceDetail
          invoice={viewInvoice}
          clients={clients}
          projects={projects}
          settings={settings}
          onClose={() => setViewInvoice(null)}
          onStatusChange={(status) => { handleStatusChange(viewInvoice.id, status); setViewInvoice(prev => ({ ...prev, status })); }}
          onDelete={() => handleDelete(viewInvoice.id)}
          onSendEmail={() => handleSendEmail(viewInvoice, clients, settings)}
        />
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <CreateInvoiceModal
          clients={clients}
          projects={projects}
          invoices={invoices}
          settings={settings}
          projectInvoiceTotals={projectInvoiceTotals}
          onSave={(invoice) => { setInvoices(prev => [invoice, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CREATE INVOICE MODAL
   ═══════════════════════════════════════════ */

function CreateInvoiceModal({ clients, projects, invoices, settings, projectInvoiceTotals, onSave, onClose }) {
  const [form, setForm] = useState({
    projectId: '',
    clientId: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    projectTitle: '',
    invoiceNumber: generateInvoiceNumber(invoices),
    items: [{ description: '', quantity: 1, rate: 0 }],
    taxRate: 0,
    discount: 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    paymentTerms: settings?.defaultPaymentTerms || 'Net 30',
    status: 'draft',
  });

  // When project is selected, auto-populate everything
  function handleProjectChange(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      setForm(f => ({ ...f, projectId: '', clientId: '', clientName: '', clientCompany: '', clientEmail: '', projectTitle: '' }));
      return;
    }

    const client = clients.find(c => c.id === project.clientId);
    const invoiced = projectInvoiceTotals[projectId] || 0;
    const remaining = project.budget - invoiced;

    // Calculate due date from payment terms
    const termDays = parseInt(settings?.defaultPaymentTerms?.replace(/\D/g, '')) || 30;
    const due = new Date();
    due.setDate(due.getDate() + termDays);

    setForm(f => ({
      ...f,
      projectId,
      clientId: client?.id || '',
      clientName: client?.company || '',
      clientCompany: client?.company || '',
      clientEmail: client?.email || '',
      projectTitle: project.title,
      dueDate: due.toISOString().split('T')[0],
      items: remaining > 0
        ? [{ description: `${project.title} — Development Services`, quantity: 1, rate: remaining }]
        : f.items,
    }));
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, rate: 0 }] }));
  }

  function removeItem(index) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  function updateItem(index, field, value) {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) =>
        i === index ? { ...item, [field]: field === 'description' ? value : Number(value) || 0 } : item
      ),
    }));
  }

  function handleSave() {
    if (!form.projectId || !form.invoiceNumber) return;
    onSave({
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString(),
    });
  }

  const subtotal = calcSubtotal(form.items);
  const taxAmount = subtotal * (form.taxRate / 100);
  const total = calcTotal(form.items, form.taxRate, form.discount);
  const selectedProject = projects.find(p => p.id === form.projectId);
  const remaining = selectedProject ? selectedProject.budget - (projectInvoiceTotals[form.projectId] || 0) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Create Invoice</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {/* Project Selection */}
          <div className="inv-project-select">
            <label>Link to Project *</label>
            <select value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
              <option value="">Choose a project...</option>
              {projects.map(p => {
                const client = clients.find(c => c.id === p.clientId);
                const inv = projectInvoiceTotals[p.id] || 0;
                const rem = p.budget - inv;
                return (
                  <option key={p.id} value={p.id}>
                    {p.title} — {client?.company || 'No client'} ({formatCurrency(rem)} remaining)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Auto-populated project info banner */}
          {selectedProject && (
            <div className="inv-project-info">
              <div className="inv-project-info__row">
                <div className="inv-project-info__item">
                  <label>Client</label>
                  <span>{form.clientName} — {form.clientCompany}</span>
                </div>
                <div className="inv-project-info__item">
                  <label>Email</label>
                  <span>{form.clientEmail}</span>
                </div>
              </div>
              <div className="inv-project-info__row">
                <div className="inv-project-info__item">
                  <label>Project Budget</label>
                  <span className="inv-project-info__mono">{formatCurrency(selectedProject.budget)}</span>
                </div>
                <div className="inv-project-info__item">
                  <label>Already Invoiced</label>
                  <span className="inv-project-info__mono">{formatCurrency(projectInvoiceTotals[form.projectId] || 0)}</span>
                </div>
                <div className="inv-project-info__item">
                  <label>Remaining</label>
                  <span className={`inv-project-info__mono ${remaining <= 0 ? 'inv-project-info__danger' : 'inv-project-info__success'}`}>
                    {formatCurrency(Math.max(remaining, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Details */}
          <div className="form-grid" style={{ marginTop: 20 }}>
            <div className="form-group">
              <label>Invoice Number *</label>
              <input type="text" value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Payment Terms</label>
              <select value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
                <option>Due on Receipt</option>
              </select>
            </div>
            <div className="form-group">
              <label>Issue Date</label>
              <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>

          {/* Line Items */}
          <h3 className="form-section-title">Line Items</h3>
          <div className="inv-line-header">
            <span style={{ flex: 3 }}>Description</span>
            <span style={{ flex: 0.6 }}>Qty</span>
            <span style={{ flex: 1 }}>Rate</span>
            <span style={{ flex: 0.8, textAlign: 'right' }}>Amount</span>
            <span style={{ width: 32 }}></span>
          </div>
          {form.items.map((item, i) => (
            <div key={i} className="inv-line">
              <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Service description..." style={{ flex: 3 }} />
              <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1" style={{ flex: 0.6 }} />
              <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} min="0" style={{ flex: 1 }} />
              <span className="inv-line__total" style={{ flex: 0.8 }}>{formatCurrency(item.quantity * item.rate)}</span>
              {form.items.length > 1 && (
                <button className="btn btn--ghost btn--sm" onClick={() => removeItem(i)} style={{ width: 32 }}>×</button>
              )}
            </div>
          ))}
          <button className="btn btn--ghost" onClick={addItem} style={{ marginTop: 8 }}>+ Add Line Item</button>

          {/* Totals */}
          <div className="inv-totals">
            <div className="inv-totals__row">
              <span>Subtotal</span>
              <span className="inv-totals__amount">{formatCurrency(subtotal)}</span>
            </div>
            <div className="inv-totals__row inv-totals__row--input">
              <div className="inv-totals__input-group">
                <label>Tax %</label>
                <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) || 0 }))} min="0" max="100" step="0.5" />
              </div>
              <span className="inv-totals__amount">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="inv-totals__row inv-totals__row--input">
              <div className="inv-totals__input-group">
                <label>Discount $</label>
                <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) || 0 }))} min="0" />
              </div>
              <span className="inv-totals__amount">-{formatCurrency(form.discount)}</span>
            </div>
            <div className="inv-totals__row inv-totals__total">
              <span>Total Due</span>
              <span className="inv-totals__amount">{formatCurrency(total)}</span>
            </div>
            {remaining !== null && total > remaining && remaining > 0 && (
              <div className="inv-totals__warning">
                ⚠ This invoice exceeds the remaining project budget by {formatCurrency(total - remaining)}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Notes / Memo</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes, payment instructions, thank you message..."
              rows={3}
            />
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--secondary" onClick={() => { handleSave(); }}>
            Save as Draft
          </button>
          <button className="btn btn--primary" onClick={() => { setForm(f => ({ ...f, status: 'sent', sentDate: new Date().toISOString().split('T')[0] })); setTimeout(handleSave, 0); }}>
            Save & Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INVOICE DETAIL VIEW
   ═══════════════════════════════════════════ */

function InvoiceDetail({ invoice, clients, projects, settings, onClose, onStatusChange, onDelete, onSendEmail }) {
  const total = calcTotal(invoice.items, invoice.taxRate, invoice.discount);
  const subtotal = calcSubtotal(invoice.items);
  const taxAmount = subtotal * ((invoice.taxRate || 0) / 100);
  const project = projects.find(p => p.id === invoice.projectId);
  const days = daysUntilDue(invoice.dueDate);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>{invoice.invoiceNumber}</h2>
            <span className="modal__subtitle">{invoice.projectTitle}</span>
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {/* Status + Actions bar */}
          <div className="inv-detail-bar">
            <span className={`status-pill status-pill--${invoice.status} status-pill--lg`}>
              {STATUS_LABELS[invoice.status]}
            </span>
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && days !== null && (
              <span className={`due-label ${days < 0 ? 'due-label--overdue' : days <= 3 ? 'due-label--soon' : ''}`}>
                {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days until due`}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <div className="inv-detail-actions">
              {invoice.status === 'draft' && (
                <button className="btn btn--primary btn--sm" onClick={() => { onStatusChange('sent'); onSendEmail(); }}>
                  ✉ Send Invoice
                </button>
              )}
              {invoice.status === 'sent' && (
                <button className="btn btn--primary btn--sm" onClick={() => { onStatusChange('sent'); onSendEmail(); }}>
                  ✉ Resend
                </button>
              )}
              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                <button className="btn btn--secondary btn--sm" onClick={() => onStatusChange('paid')}>
                  ✓ Mark Paid
                </button>
              )}
              <button className="btn btn--ghost btn--sm" onClick={() => handlePrint(invoice, clients, settings)}>
                🖨 Print
              </button>
            </div>
          </div>

          {/* Two-column info */}
          <div className="inv-detail-grid">
            <div className="inv-detail-section">
              <h4>Bill To</h4>
              <p className="inv-detail-name">{invoice.clientName}</p>
              <p>{invoice.clientCompany}</p>
              <p>{invoice.clientEmail}</p>
            </div>
            <div className="inv-detail-section">
              <h4>Invoice Details</h4>
              <div className="inv-detail-meta">
                <span>Issued:</span><span>{invoice.issueDate}</span>
                <span>Due:</span><span>{invoice.dueDate || '—'}</span>
                <span>Terms:</span><span>{invoice.paymentTerms}</span>
                {invoice.sentDate && <><span>Sent:</span><span>{invoice.sentDate}</span></>}
                {invoice.paidDate && <><span>Paid:</span><span>{invoice.paidDate}</span></>}
              </div>
            </div>
          </div>

          {project && (
            <div className="inv-detail-project">
              <h4>Linked Project</h4>
              <span className="inv-detail-project__name">{project.title}</span>
              <span className="inv-detail-project__budget">Budget: {formatCurrency(project.budget)}</span>
            </div>
          )}

          {/* Line Items Table */}
          <table className="data-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: 60 }}>Qty</th>
                <th style={{ width: 100 }}>Rate</th>
                <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.description || '—'}</td>
                  <td className="data-table__mono">{item.quantity}</td>
                  <td className="data-table__mono">{formatCurrency(item.rate)}</td>
                  <td className="data-table__mono" style={{ textAlign: 'right' }}>{formatCurrency(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="inv-detail-totals">
            <div className="inv-detail-totals__row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {invoice.taxRate > 0 && <div className="inv-detail-totals__row"><span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
            {invoice.discount > 0 && <div className="inv-detail-totals__row"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>}
            <div className="inv-detail-totals__row inv-detail-totals__total"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          {invoice.notes && (
            <div className="inv-detail-notes">
              <h4>Notes</h4>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={onDelete}>Delete</button>
          <div style={{ flex: 1 }} />
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button className="btn btn--ghost btn--sm" onClick={() => onStatusChange('cancelled')}>Cancel Invoice</button>
          )}
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SEND EMAIL (mailto:)
   ═══════════════════════════════════════════ */

function handleSendEmail(invoice, clients, settings) {
  const client = clients.find(c => c.id === invoice.clientId);
  const total = calcTotal(invoice.items, invoice.taxRate, invoice.discount);
  const email = client?.email || invoice.clientEmail || '';
  const company = settings?.companyName || 'Clad Forge';
  const owner = settings?.ownerName || '';

  const subject = `Invoice ${invoice.invoiceNumber} from ${company} — ${invoice.projectTitle}`;

  const itemsList = invoice.items
    .map((item, i) => `  ${i + 1}. ${item.description} — ${item.quantity} × ${formatCurrency(item.rate)} = ${formatCurrency(item.quantity * item.rate)}`)
    .join('\n');

  const body = `Hi ${invoice.clientName || client?.company || ''},

Please find the details for Invoice ${invoice.invoiceNumber} below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVOICE ${invoice.invoiceNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${invoice.projectTitle}
Issue Date: ${invoice.issueDate}
Due Date: ${invoice.dueDate || 'Upon receipt'}
Payment Terms: ${invoice.paymentTerms || 'Net 30'}

Line Items:
${itemsList}

${invoice.taxRate > 0 ? `Tax (${invoice.taxRate}%): ${formatCurrency(calcSubtotal(invoice.items) * (invoice.taxRate / 100))}\n` : ''}${invoice.discount > 0 ? `Discount: -${formatCurrency(invoice.discount)}\n` : ''}
TOTAL DUE: ${formatCurrency(total)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${invoice.notes ? `\nNote: ${invoice.notes}\n` : ''}
Please remit payment by ${invoice.dueDate || 'your earliest convenience'}.

If you have any questions about this invoice, please don't hesitate to reach out.

Best regards,
${owner}
${company}
${settings?.companyEmail || ''}
${settings?.companyPhone || ''}`;

  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
}

/* ═══════════════════════════════════════════
   PRINT / PDF EXPORT
   ═══════════════════════════════════════════ */

function handlePrint(invoice, clients, settings) {
  const client = clients.find(c => c.id === invoice.clientId);
  const subtotal = calcSubtotal(invoice.items);
  const taxAmount = subtotal * ((invoice.taxRate || 0) / 100);
  const total = calcTotal(invoice.items, invoice.taxRate, invoice.discount);
  const company = settings?.companyName || 'Clad Forge';

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;color:#1f2937;padding:48px;max-width:800px;margin:0 auto;line-height:1.6;font-size:14px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;margin-bottom:28px;border-bottom:2px solid #b45309}
      .header-left{} .header-right{text-align:right}
      .company{font-family:'Instrument Serif',Georgia,serif;font-size:24px;color:#1f2937;margin-bottom:2px}
      .company-info{font-size:12px;color:#6b7280;line-height:1.5}
      .inv-title{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:600;color:#b45309}
      .inv-meta{font-size:12px;color:#6b7280;margin-top:4px;line-height:1.6}
      .two-col{display:flex;gap:40px;margin-bottom:28px}
      .col{flex:1} .col h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px;font-weight:600}
      .col p{font-size:14px;color:#1f2937;line-height:1.5}
      .col .name{font-weight:600;font-size:15px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;padding:10px 12px;border-bottom:2px solid #e5e7eb;font-weight:600}
      td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px}
      .mono{font-family:'JetBrains Mono',monospace;font-size:13px}
      .right{text-align:right}
      .totals{margin-left:auto;width:280px}
      .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
      .totals-row.total{border-top:2px solid #1f2937;margin-top:8px;padding-top:12px;font-weight:700;font-size:18px}
      .totals-row.total .amt{color:#b45309;font-family:'JetBrains Mono',monospace}
      .amt{font-family:'JetBrains Mono',monospace}
      .notes{margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280}
      .notes h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px;font-weight:600}
      .footer{margin-top:48px;text-align:center;font-size:12px;color:#9ca3af;padding-top:20px;border-top:1px solid #e5e7eb}
      @media print{body{padding:24px}}
    </style></head><body>
    <div class="header">
      <div class="header-left">
        <div class="company">${company}</div>
        <div class="company-info">${settings?.ownerName || ''}<br>${settings?.companyAddress || ''}<br>${settings?.companyEmail || ''}<br>${settings?.companyPhone || ''}</div>
      </div>
      <div class="header-right">
        <div class="inv-title">${invoice.invoiceNumber}</div>
        <div class="inv-meta">Issued: ${invoice.issueDate}<br>Due: ${invoice.dueDate || 'Upon receipt'}<br>Terms: ${invoice.paymentTerms || 'Net 30'}</div>
      </div>
    </div>
    <div class="two-col">
      <div class="col"><h3>Bill To</h3><p class="name">${invoice.clientName || client?.company || ''}</p><p>${client?.email || ''}</p></div>
      <div class="col"><h3>Project</h3><p class="name">${invoice.projectTitle || ''}</p><p>Status: ${invoice.status}</p>${invoice.paidDate ? `<p>Paid: ${invoice.paidDate}</p>` : ''}</div>
    </div>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th class="right">Amount</th></tr></thead><tbody>
    ${invoice.items.map(item => `<tr><td>${item.description}</td><td class="mono">${item.quantity}</td><td class="mono">${formatCurrency(item.rate)}</td><td class="mono right">${formatCurrency(item.quantity * item.rate)}</td></tr>`).join('')}
    </tbody></table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span class="amt">${formatCurrency(subtotal)}</span></div>
      ${invoice.taxRate > 0 ? `<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span class="amt">${formatCurrency(taxAmount)}</span></div>` : ''}
      ${invoice.discount > 0 ? `<div class="totals-row"><span>Discount</span><span class="amt">-${formatCurrency(invoice.discount)}</span></div>` : ''}
      <div class="totals-row total"><span>Total Due</span><span class="amt">${formatCurrency(total)}</span></div>
    </div>
    ${invoice.notes ? `<div class="notes"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
    <div class="footer">${company} — ${settings?.companyAddress || ''} — ${settings?.companyEmail || ''}</div>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
