import { useState, useMemo } from 'react';
import { generateId, initialSettings } from '../data/initialData';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const CATEGORY_OPTIONS = [
  'Maintenance', 'Hosting', 'Support', 'Subscription', 'Retainer', 'License', 'Other',
];

const STATUS_OPTIONS = ['active', 'paused', 'cancelled'];

function formatCurrency(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getNextDue(startDate, frequency) {
  if (!startDate) return '';
  const now = new Date();
  let d = new Date(startDate + 'T00:00:00');
  const intervals = { weekly: 7, monthly: 30, quarterly: 91, 'semi-annual': 182, annual: 365 };
  const days = intervals[frequency] || 30;
  while (d < now) d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getMonthlyEquivalent(amount, frequency) {
  const multipliers = { weekly: 4.33, monthly: 1, quarterly: 1 / 3, 'semi-annual': 1 / 6, annual: 1 / 12 };
  return amount * (multipliers[frequency] || 1);
}

function getAnnualEquivalent(amount, frequency) {
  const multipliers = { weekly: 52, monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
  return amount * (multipliers[frequency] || 12);
}

export default function RecurringExpenses({ clients, projects, expenses, setExpenses, settings: rawSettings }) {
  const settings = { ...initialSettings, ...rawSettings };
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterFrequency, setFilterFrequency] = useState('all');

  const emptyForm = {
    clientId: '', projectId: '', title: '', description: '',
    amount: 0, frequency: 'monthly', startDate: new Date().toISOString().split('T')[0],
    nextDue: '', status: 'active', category: 'Maintenance',
    autoInvoice: false, notes: '',
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = expenses.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterFrequency !== 'all' && e.frequency !== filterFrequency) return false;
    return true;
  });

  // Metrics
  const activeExpenses = expenses.filter(e => e.status === 'active');
  const monthlyTotal = activeExpenses.reduce((s, e) => s + getMonthlyEquivalent(e.amount || 0, e.frequency), 0);
  const annualTotal = activeExpenses.reduce((s, e) => s + getAnnualEquivalent(e.amount || 0, e.frequency), 0);

  const upcomingDue = activeExpenses
    .map(e => ({ ...e, nextDue: e.nextDue || getNextDue(e.startDate, e.frequency) }))
    .filter(e => e.nextDue)
    .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))
    .slice(0, 5);

  // By client breakdown
  const byClient = useMemo(() => {
    const map = {};
    activeExpenses.forEach(e => {
      const client = clients.find(c => c.id === e.clientId);
      const name = client?.company || 'Unassigned';
      if (!map[name]) map[name] = { monthly: 0, annual: 0, count: 0 };
      map[name].monthly += getMonthlyEquivalent(e.amount || 0, e.frequency);
      map[name].annual += getAnnualEquivalent(e.amount || 0, e.frequency);
      map[name].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].annual - a[1].annual);
  }, [activeExpenses, clients]);

  function openAdd() { setEditId(null); setForm(emptyForm); setShowModal(true); }

  function openEdit(expense) {
    setEditId(expense.id);
    setForm({ ...expense });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const nextDue = form.nextDue || getNextDue(form.startDate, form.frequency);
    const record = { ...form, nextDue };

    if (editId) {
      setExpenses(prev => prev.map(e => e.id === editId ? { ...record, id: editId } : e));
    } else {
      setExpenses(prev => [...prev, { ...record, id: generateId(), createdAt: new Date().toISOString() }]);
    }
    setShowModal(false);
    setEditId(null);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this recurring expense?')) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  function handleStatusChange(id, status) {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  }

  return (
    <div className="recurring">
      {/* Summary Cards */}
      <div className="invoices__summary">
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
          <span className="stat-card__label">Monthly Revenue</span>
          <span className="stat-card__value">{formatCurrency(monthlyTotal)}</span>
          <span className="stat-card__sub">from {activeExpenses.length} active</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <span className="stat-card__label">Annual Revenue</span>
          <span className="stat-card__value">{formatCurrency(annualTotal)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <span className="stat-card__label">Active</span>
          <span className="stat-card__value">{activeExpenses.length}</span>
          <span className="stat-card__sub">{expenses.filter(e => e.frequency === 'monthly').length} monthly · {expenses.filter(e => e.frequency === 'annual').length} annual</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--warning)' }} />
          <span className="stat-card__label">Clients</span>
          <span className="stat-card__value">{new Set(activeExpenses.map(e => e.clientId).filter(Boolean)).size}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar__left">
          <div className="filter-chips">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button key={s} className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="filter-chips">
            {['all', ...FREQUENCY_OPTIONS.map(f => f.value)].map(f => (
              <button key={f} className={`filter-chip ${filterFrequency === f ? 'filter-chip--active' : ''}`} onClick={() => setFilterFrequency(f)}>
                {f === 'all' ? 'All Frequencies' : FREQUENCY_OPTIONS.find(o => o.value === f)?.label || f}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Recurring</button>
      </div>

      <div className="recurring__layout">
        {/* Main Table */}
        <div className="recurring__main">
          <div className="panel">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🔄</span>
                <h3>No recurring expenses</h3>
                <p>Add recurring maintenance, hosting, or retainer fees</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Category</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(expense => {
                    const client = clients.find(c => c.id === expense.clientId);
                    const nextDue = expense.nextDue || getNextDue(expense.startDate, expense.frequency);
                    const daysUntil = nextDue ? Math.ceil((new Date(nextDue) - new Date()) / 86400000) : null;
                    return (
                      <tr key={expense.id} className="data-table__clickable" onClick={() => openEdit(expense)}>
                        <td>
                          <span style={{ fontWeight: 500 }}>{expense.title}</span>
                          {expense.description && <span className="data-table__sub">{expense.description}</span>}
                        </td>
                        <td>{client?.company || '—'}</td>
                        <td className="data-table__mono data-table__bold">{formatCurrency(expense.amount)}</td>
                        <td>
                          <span className={`freq-badge freq-badge--${expense.frequency}`}>
                            {FREQUENCY_OPTIONS.find(f => f.value === expense.frequency)?.label || expense.frequency}
                          </span>
                        </td>
                        <td className="data-table__muted">{expense.category}</td>
                        <td>
                          {nextDue && (
                            <span className={`due-label ${daysUntil !== null && daysUntil <= 7 ? 'due-label--soon' : ''} ${daysUntil !== null && daysUntil <= 0 ? 'due-label--overdue' : ''}`}>
                              {daysUntil <= 0 ? 'Due now' : `${daysUntil}d`}
                            </span>
                          )}
                        </td>
                        <td>
                          <select
                            className={`status-select status-select--${expense.status === 'active' ? 'paid' : expense.status === 'paused' ? 'sent' : 'cancelled'}`}
                            value={expense.status}
                            onChange={e => { e.stopPropagation(); handleStatusChange(expense.id, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </td>
                        <td>
                          <div className="action-btns" onClick={e => e.stopPropagation()}>
                            <button className="btn btn--ghost btn--sm" onClick={() => openEdit(expense)}>✎</button>
                            <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => handleDelete(expense.id)}>×</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="recurring__sidebar">
          {/* Upcoming Due */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel__header"><h3>Upcoming</h3></div>
            <div style={{ padding: '12px 18px' }}>
              {upcomingDue.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>No upcoming expenses</p>
              ) : (
                upcomingDue.map(e => {
                  const client = clients.find(c => c.id === e.clientId);
                  const daysUntil = Math.ceil((new Date(e.nextDue) - new Date()) / 86400000);
                  return (
                    <div key={e.id} className="recurring__upcoming-row">
                      <div className="recurring__upcoming-info">
                        <span className="recurring__upcoming-title">{e.title}</span>
                        <span className="recurring__upcoming-client">{client?.company || ''}</span>
                      </div>
                      <div className="recurring__upcoming-right">
                        <span className="recurring__upcoming-amount">{formatCurrency(e.amount)}</span>
                        <span className={`due-label ${daysUntil <= 3 ? 'due-label--soon' : ''} ${daysUntil <= 0 ? 'due-label--overdue' : ''}`}>
                          {daysUntil <= 0 ? 'Now' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* By Client */}
          <div className="panel">
            <div className="panel__header"><h3>By Client</h3></div>
            <div style={{ padding: '12px 18px' }}>
              {byClient.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>No data yet</p>
              ) : (
                byClient.map(([name, data]) => (
                  <div key={name} className="recurring__client-row">
                    <div className="recurring__client-info">
                      <span className="recurring__client-name">{name}</span>
                      <span className="recurring__client-count">{data.count} expense{data.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="recurring__client-amounts">
                      <span className="recurring__client-monthly">{formatCurrency(data.monthly)}/mo</span>
                      <span className="recurring__client-annual">{formatCurrency(data.annual)}/yr</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group form-group--full">
                  <label>Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Annual Website Maintenance" />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Project (optional)</label>
                  <select value={form.projectId || ''} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                    <option value="">No project</option>
                    {projects.filter(p => !form.clientId || p.clientId === form.clientId).map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Next Due Date</label>
                  <input type="date" value={form.nextDue || getNextDue(form.startDate, form.frequency)} onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))} />
                </div>
                <div className="form-group form-group--full">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about this recurring expense..." rows={2} />
                </div>
                <div className="form-group form-group--full">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." rows={2} />
                </div>
              </div>

              {/* Preview */}
              {form.amount > 0 && (
                <div className="recurring__preview">
                  <h4>Revenue Preview</h4>
                  <div className="recurring__preview-grid">
                    <div><span className="recurring__preview-label">Per cycle</span><span className="recurring__preview-value">{formatCurrency(form.amount)}</span></div>
                    <div><span className="recurring__preview-label">Monthly equiv.</span><span className="recurring__preview-value">{formatCurrency(getMonthlyEquivalent(form.amount, form.frequency))}</span></div>
                    <div><span className="recurring__preview-label">Annual equiv.</span><span className="recurring__preview-value">{formatCurrency(getAnnualEquivalent(form.amount, form.frequency))}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Add Recurring'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
