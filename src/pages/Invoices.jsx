import { useState } from 'react';
import { generateId } from '../data/initialData';
import { useLocalStorage } from '../hooks/useLocalStorage';

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

const emptyInvoice = {
  clientId: '',
  projectTitle: '',
  invoiceNumber: '',
  items: [{ description: '', quantity: 1, rate: 0 }],
  status: 'draft',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
};

export default function Invoices({ clients }) {
  const [invoices, setInvoices] = useLocalStorage('cf-invoices', []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyInvoice);
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = invoices.filter(inv =>
    filterStatus === 'all' || inv.status === filterStatus
  );

  const totalOutstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + getTotal(i.items), 0);
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + getTotal(i.items), 0);

  function getTotal(items) {
    return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
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
    if (!form.clientId || !form.invoiceNumber) return;
    setInvoices(prev => [...prev, {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString().split('T')[0],
    }]);
    setForm(emptyInvoice);
    setShowModal(false);
  }

  function updateStatus(id, status) {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
  }

  function handleDelete(id) {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  }

  function handlePrint(invoice) {
    const client = clients.find(c => c.id === invoice.clientId);
    const total = getTotal(invoice.items);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;500&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;color:#1f2937;padding:48px;max-width:800px;margin:0 auto;line-height:1.6}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #b45309;padding-bottom:24px;margin-bottom:32px}
        .header h1{font-family:'Playfair Display',serif;font-size:28px;font-weight:400}
        .company{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
        .inv-num{font-size:24px;font-weight:600;color:#b45309;text-align:right}
        .inv-meta{font-size:13px;color:#6b7280;text-align:right;margin-top:4px}
        .section{margin-bottom:24px}
        .section h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#b45309;margin-bottom:12px;font-weight:600}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:14px}
        th{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;background:#f9fafb}
        .total-row td{border-top:2px solid #1f2937;font-weight:700;font-size:16px}
        .total-amount{color:#b45309;font-size:20px}
        .notes{font-size:13px;color:#6b7280;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb}
        @media print{body{padding:24px}}
      </style></head><body>
      <div class="header">
        <div><div class="company">Clad Forge</div><h1>Invoice</h1></div>
        <div><div class="inv-num">${invoice.invoiceNumber}</div><div class="inv-meta">${invoice.issueDate}${invoice.dueDate ? ` — Due: ${invoice.dueDate}` : ''}</div></div>
      </div>
      <div class="section"><h2>Bill To</h2><p><strong>${client?.name || 'N/A'}</strong><br>${client?.company || ''}<br>${client?.email || ''}</p></div>
      <div class="section"><h2>Items</h2><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
      ${invoice.items.map(item => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.rate.toLocaleString()}</td><td>$${(item.quantity * item.rate).toLocaleString()}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3">Total</td><td class="total-amount">$${total.toLocaleString()}</td></tr>
      </tbody></table></div>
      ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <div className="invoices">
      {/* Summary cards */}
      <div className="invoices__summary">
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--warning)' }} />
          <span className="stat-card__label">Outstanding</span>
          <span className="stat-card__value">${totalOutstanding.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <span className="stat-card__label">Paid</span>
          <span className="stat-card__value">${totalPaid.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <span className="stat-card__label">Total Invoices</span>
          <span className="stat-card__value">{invoices.length}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--danger)' }} />
          <span className="stat-card__label">Overdue</span>
          <span className="stat-card__value">{invoices.filter(i => i.status === 'overdue').length}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="filter-chips">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
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
            <h3>No invoices yet</h3>
            <p>Create your first invoice to start tracking payments</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Project</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                const total = getTotal(inv.items);
                return (
                  <tr key={inv.id}>
                    <td className="data-table__mono">{inv.invoiceNumber}</td>
                    <td>{client?.company || 'Unknown'}</td>
                    <td>{inv.projectTitle}</td>
                    <td className="data-table__mono data-table__bold">${total.toLocaleString()}</td>
                    <td>
                      <select
                        className={`status-select status-select--${inv.status}`}
                        value={inv.status}
                        onChange={e => updateStatus(inv.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="data-table__muted">{inv.issueDate}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn--ghost btn--sm" onClick={() => handlePrint(inv)} title="Print">🖨</button>
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

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>New Invoice</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Invoice Number *</label>
                  <input
                    type="text"
                    value={form.invoiceNumber}
                    onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                    placeholder="INV-001"
                  />
                </div>
                <div className="form-group">
                  <label>Client *</label>
                  <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Project</label>
                  <input type="text" value={form.projectTitle} onChange={e => setForm(f => ({ ...f, projectTitle: e.target.value }))} placeholder="Project name" />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <h3 className="form-section-title">Line Items</h3>
              {form.items.map((item, i) => (
                <div key={i} className="invoice-line">
                  <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" style={{ flex: 3 }} />
                  <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="Qty" style={{ flex: 0.5 }} min="1" />
                  <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} placeholder="Rate" style={{ flex: 1 }} min="0" />
                  <span className="invoice-line__total">${(item.quantity * item.rate).toLocaleString()}</span>
                  {form.items.length > 1 && (
                    <button className="btn btn--ghost btn--sm" onClick={() => removeItem(i)}>×</button>
                  )}
                </div>
              ))}
              <button className="btn btn--ghost" onClick={addItem} style={{ marginTop: 8 }}>+ Add Line Item</button>

              <div className="invoice-total">
                <span>Total</span>
                <span className="invoice-total__amount">${getTotal(form.items).toLocaleString()}</span>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, additional notes..." rows={3} />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
