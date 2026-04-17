import { useState, useMemo } from 'react';
import { generateId, initialSettings } from '../data/initialData';

const INCOME_CATEGORIES = ['Client Payment', 'Retainer', 'Consulting', 'Hosting', 'Maintenance', 'Interest', 'Other Income'];
const EXPENSE_CATEGORIES = ['Software', 'Hosting', 'Advertising', 'Office Supplies', 'Equipment', 'Travel', 'Meals', 'Insurance', 'Professional Services', 'Education', 'Subscriptions', 'Utilities', 'Rent', 'Vehicle', 'Phone', 'Internet', 'Bank Fees', 'Taxes Paid', 'Other'];
const TAX_WRITE_OFF_CATEGORIES = ['Business Use of Home', 'Vehicle/Mileage', 'Office Supplies', 'Software & Tools', 'Professional Development', 'Marketing & Advertising', 'Insurance Premiums', 'Travel & Meals (50%)', 'Professional Services', 'Equipment (Section 179)', 'Internet & Phone', 'Subscriptions', 'Other Deduction'];
const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'PayPal', 'Stripe', 'Check', 'Cash', 'Zelle', 'Other'];

function fmt(n) { return '$' + Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }

export default function Finances({ clients, projects, settings: rawSettings, entries, setEntries, taxPayments, setTaxPayments }) {
  const settings = { ...initialSettings, ...rawSettings };
  const [tab, setTab] = useState('overview');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [entryType, setEntryType] = useState('income');
  const [editId, setEditId] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('all');

  const taxRate = (settings.defaultTaxRate || 25) / 100;

  const emptyEntry = {
    type: 'income', date: new Date().toISOString().split('T')[0], amount: 0,
    category: '', description: '', clientId: '', projectId: '', invoiceId: '',
    taxDeductible: false, taxCategory: '', paymentMethod: '', notes: '',
  };
  const [form, setForm] = useState(emptyEntry);

  const emptyTax = { date: '', quarter: 'Q1', amount: 0, paymentMethod: 'Bank Transfer', confirmation: '', notes: '', year: filterYear };
  const [taxForm, setTaxForm] = useState(emptyTax);

  // ═══ FILTERED DATA ═══
  const yearEntries = useMemo(() =>
    entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === filterYear;
    }),
  [entries, filterYear]);

  const filteredEntries = useMemo(() => {
    if (filterMonth === 'all') return yearEntries;
    return yearEntries.filter(e => new Date(e.date).getMonth() === parseInt(filterMonth));
  }, [yearEntries, filterMonth]);

  // ═══ METRICS ═══
  const income = yearEntries.filter(e => e.type === 'income');
  const expenses = yearEntries.filter(e => e.type === 'expense');
  const totalIncome = income.reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? netProfit / totalIncome : 0;
  const estimatedTax = Math.max(netProfit * taxRate, 0);

  const yearTaxPayments = taxPayments.filter(t => t.year === filterYear);
  const totalTaxPaid = yearTaxPayments.reduce((s, t) => s + (t.amount || 0), 0);
  const taxRemaining = estimatedTax - totalTaxPaid;

  const deductibleExpenses = expenses.filter(e => e.taxDeductible);
  const totalDeductions = deductibleExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const monthIncome = yearEntries.filter(e => e.type === 'income' && new Date(e.date).getMonth() === m).reduce((s, e) => s + (e.amount || 0), 0);
      const monthExpense = yearEntries.filter(e => e.type === 'expense' && new Date(e.date).getMonth() === m).reduce((s, e) => s + (e.amount || 0), 0);
      months.push({
        label: new Date(filterYear, m).toLocaleString('en-US', { month: 'short' }),
        income: monthIncome,
        expenses: monthExpense,
        profit: monthIncome - monthExpense,
      });
    }
    return months;
  }, [yearEntries, filterYear]);

  const maxMonthly = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses)), 1);

  // Category breakdowns
  const incomeByCategory = useMemo(() => {
    const map = {};
    income.forEach(e => { map[e.category || 'Other'] = (map[e.category || 'Other'] || 0) + (e.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [income]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => { map[e.category || 'Other'] = (map[e.category || 'Other'] || 0) + (e.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Quarterly tax data
  const quarters = [
    { id: 'Q1', period: 'Jan 1 — Mar 31', months: [0, 1, 2], due: `Apr 15, ${filterYear}` },
    { id: 'Q2', period: 'Apr 1 — May 31', months: [3, 4], due: `Jun 15, ${filterYear}` },
    { id: 'Q3', period: 'Jun 1 — Aug 31', months: [5, 6, 7], due: `Sep 15, ${filterYear}` },
    { id: 'Q4', period: 'Sep 1 — Dec 31', months: [8, 9, 10, 11], due: `Jan 15, ${filterYear + 1}` },
  ];

  const quarterData = quarters.map(q => {
    const qIncome = yearEntries.filter(e => e.type === 'income' && q.months.includes(new Date(e.date).getMonth())).reduce((s, e) => s + (e.amount || 0), 0);
    const qExpense = yearEntries.filter(e => e.type === 'expense' && q.months.includes(new Date(e.date).getMonth())).reduce((s, e) => s + (e.amount || 0), 0);
    const qProfit = qIncome - qExpense;
    const qTax = Math.max(qProfit * taxRate, 0);
    const qPaid = yearTaxPayments.filter(t => t.quarter === q.id).reduce((s, t) => s + (t.amount || 0), 0);
    return { ...q, income: qIncome, expenses: qExpense, profit: qProfit, taxOwed: qTax, taxPaid: qPaid };
  });

  // ═══ CRUD ═══
  function openAddEntry(type) {
    setEntryType(type);
    setEditId(null);
    setForm({ ...emptyEntry, type, category: type === 'income' ? 'Client Payment' : 'Software' });
    setShowEntryModal(true);
  }

  function openEditEntry(entry) {
    setEntryType(entry.type);
    setEditId(entry.id);
    setForm({ ...entry });
    setShowEntryModal(true);
  }

  function saveEntry() {
    if (!form.amount || !form.date) return;
    const d = new Date(form.date);
    const record = { ...form, year: d.getFullYear(), month: d.getMonth() + 1 };
    if (editId) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...record, id: editId } : e));
    } else {
      setEntries(prev => [...prev, { ...record, id: generateId(), createdAt: new Date().toISOString() }]);
    }
    setShowEntryModal(false);
  }

  function deleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function saveTaxPayment() {
    if (!taxForm.amount || !taxForm.date) return;
    setTaxPayments(prev => [...prev, { ...taxForm, id: generateId(), createdAt: new Date().toISOString() }]);
    setShowTaxModal(false);
    setTaxForm(emptyTax);
  }

  function deleteTaxPayment(id) {
    if (!window.confirm('Delete this tax payment?')) return;
    setTaxPayments(prev => prev.filter(t => t.id !== id));
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'deductions', label: 'Write-Offs' },
    { id: 'taxes', label: 'Taxes' },
  ];

  const MONTHS = [
    { value: 'all', label: 'All Months' },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: new Date(2000, i).toLocaleString('en-US', { month: 'long' }),
    })),
  ];

  return (
    <div className="fin">
      {/* Year selector + tabs */}
      <div className="fin__header">
        <div className="fin__tabs">
          {TABS.map(t => (
            <button key={t.id} className={`cp__tab ${tab === t.id ? 'cp__tab--active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="fin__filters">
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="fin__year-select">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="fin__month-select">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="fin__kpis">
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--success)' }} /><span className="stat-card__label">Total Income</span><span className="stat-card__value">{fmt(totalIncome)}</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--danger)' }} /><span className="stat-card__label">Total Expenses</span><span className="stat-card__value">{fmt(totalExpenses)}</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--brand)' }} /><span className="stat-card__label">Net Profit</span><span className="stat-card__value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{netProfit < 0 ? '-' : ''}{fmt(netProfit)}</span><span className="stat-card__sub">{fmtPct(profitMargin)} margin</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--purple)' }} /><span className="stat-card__label">Est. Tax Owed</span><span className="stat-card__value">{fmt(estimatedTax)}</span><span className="stat-card__sub">{fmt(totalTaxPaid)} paid · {fmt(Math.max(taxRemaining, 0))} remaining</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--info)' }} /><span className="stat-card__label">Write-Offs</span><span className="stat-card__value">{fmt(totalDeductions)}</span><span className="stat-card__sub">{deductibleExpenses.length} deductible items</span></div>
          </div>

          {/* Monthly Chart */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel__header"><h3>Monthly Breakdown — {filterYear}</h3></div>
            <div className="fin__chart" style={{ padding: '20px 22px' }}>
              <div className="fin__chart-bars">
                {monthlyData.map(m => (
                  <div key={m.label} className="fin__chart-col">
                    <div className="fin__chart-pair">
                      <div className="fin__chart-bar fin__chart-bar--income" style={{ height: `${(m.income / maxMonthly) * 140}px` }} title={`Income: ${fmt(m.income)}`} />
                      <div className="fin__chart-bar fin__chart-bar--expense" style={{ height: `${(m.expenses / maxMonthly) * 140}px` }} title={`Expenses: ${fmt(m.expenses)}`} />
                    </div>
                    <span className="fin__chart-label">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="fin__chart-legend">
                <span><span className="fin__legend-dot" style={{ background: 'var(--success)' }} /> Income</span>
                <span><span className="fin__legend-dot" style={{ background: 'var(--danger)' }} /> Expenses</span>
              </div>
            </div>
          </div>

          {/* Category Breakdowns side by side */}
          <div className="fin__row">
            <div className="panel">
              <div className="panel__header"><h3>Income by Category</h3></div>
              <div style={{ padding: '12px 22px' }}>
                {incomeByCategory.length === 0 ? <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>No income recorded</p> : incomeByCategory.map(([cat, amt]) => (
                  <div key={cat} className="fin__cat-row">
                    <span>{cat}</span>
                    <span className="fin__cat-amount" style={{ color: 'var(--success)' }}>{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel__header"><h3>Expenses by Category</h3></div>
              <div style={{ padding: '12px 22px' }}>
                {expenseByCategory.length === 0 ? <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>No expenses recorded</p> : expenseByCategory.map(([cat, amt]) => (
                  <div key={cat} className="fin__cat-row">
                    <span>{cat}</span>
                    <span className="fin__cat-amount" style={{ color: 'var(--danger)' }}>{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ INCOME / EXPENSES TAB ═══ */}
      {(tab === 'income' || tab === 'expenses') && (
        <>
          <div className="toolbar">
            <div className="toolbar__left" />
            <button className="btn btn--primary" onClick={() => openAddEntry(tab)}>
              + Add {tab === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
          <div className="panel">
            {filteredEntries.filter(e => e.type === tab).length === 0 ? (
              <div className="empty-state"><span className="empty-state__icon">{tab === 'income' ? '💰' : '💸'}</span><h3>No {tab} entries</h3><p>Add your first {tab} entry to start tracking</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Client</th>{tab === 'expenses' && <th>Deductible</th>}<th>Method</th><th></th></tr></thead>
                <tbody>
                  {filteredEntries.filter(e => e.type === tab).sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => {
                    const client = clients.find(c => c.id === entry.clientId);
                    return (
                      <tr key={entry.id} className="data-table__clickable" onClick={() => openEditEntry(entry)}>
                        <td className="data-table__muted">{entry.date}</td>
                        <td>{entry.category || '—'}</td>
                        <td>{entry.description || '—'}</td>
                        <td className="data-table__mono data-table__bold" style={{ color: tab === 'income' ? 'var(--success)' : 'var(--danger)' }}>{fmt(entry.amount)}</td>
                        <td className="data-table__muted">{client?.company || '—'}</td>
                        {tab === 'expenses' && <td>{entry.taxDeductible ? <span className="freq-badge freq-badge--annual">Yes</span> : '—'}</td>}
                        <td className="data-table__muted">{entry.paymentMethod || '—'}</td>
                        <td><div className="action-btns" onClick={e => e.stopPropagation()}><button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteEntry(entry.id)}>×</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══ WRITE-OFFS TAB ═══ */}
      {tab === 'deductions' && (
        <>
          <div className="fin__kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--success)' }} /><span className="stat-card__label">Total Deductions</span><span className="stat-card__value">{fmt(totalDeductions)}</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--brand)' }} /><span className="stat-card__label">Tax Savings (est.)</span><span className="stat-card__value">{fmt(totalDeductions * taxRate)}</span><span className="stat-card__sub">at {(taxRate * 100).toFixed(0)}% rate</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--info)' }} /><span className="stat-card__label">Deductible Items</span><span className="stat-card__value">{deductibleExpenses.length}</span></div>
          </div>
          <div className="toolbar"><div className="toolbar__left" /><button className="btn btn--primary" onClick={() => { openAddEntry('expense'); setForm(f => ({ ...f, taxDeductible: true })); }}>+ Add Write-Off</button></div>
          <div className="panel">
            {deductibleExpenses.length === 0 ? (
              <div className="empty-state"><span className="empty-state__icon">📋</span><h3>No write-offs recorded</h3><p>Mark expenses as tax-deductible when adding them</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Tax Category</th><th>Description</th><th>Amount</th><th>Category</th><th></th></tr></thead>
                <tbody>
                  {deductibleExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => (
                    <tr key={entry.id} className="data-table__clickable" onClick={() => openEditEntry(entry)}>
                      <td className="data-table__muted">{entry.date}</td>
                      <td><span className="freq-badge freq-badge--annual">{entry.taxCategory || entry.category}</span></td>
                      <td>{entry.description || '—'}</td>
                      <td className="data-table__mono data-table__bold">{fmt(entry.amount)}</td>
                      <td className="data-table__muted">{entry.category}</td>
                      <td><div className="action-btns" onClick={e => e.stopPropagation()}><button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteEntry(entry.id)}>×</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══ TAXES TAB ═══ */}
      {tab === 'taxes' && (
        <>
          <div className="fin__kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--warning)' }} /><span className="stat-card__label">Est. Taxes Owed</span><span className="stat-card__value">{fmt(estimatedTax)}</span><span className="stat-card__sub">{(taxRate * 100).toFixed(0)}% of {fmt(netProfit)} profit</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--success)' }} /><span className="stat-card__label">Taxes Paid</span><span className="stat-card__value">{fmt(totalTaxPaid)}</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: taxRemaining > 0 ? 'var(--danger)' : 'var(--success)' }} /><span className="stat-card__label">Remaining</span><span className="stat-card__value" style={{ color: taxRemaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(Math.max(taxRemaining, 0))}</span></div>
            <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--info)' }} /><span className="stat-card__label">Deduction Savings</span><span className="stat-card__value">{fmt(totalDeductions * taxRate)}</span></div>
          </div>

          {/* Quarterly Breakdown */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel__header"><h3>Quarterly Tax Schedule — {filterYear}</h3></div>
            <table className="data-table">
              <thead><tr><th>Quarter</th><th>Period</th><th>Income</th><th>Expenses</th><th>Profit</th><th>Est. Tax</th><th>Paid</th><th>Due Date</th></tr></thead>
              <tbody>
                {quarterData.map(q => (
                  <tr key={q.id}>
                    <td className="data-table__bold">{q.id}</td>
                    <td className="data-table__muted">{q.period}</td>
                    <td className="data-table__mono" style={{ color: 'var(--success)' }}>{fmt(q.income)}</td>
                    <td className="data-table__mono" style={{ color: 'var(--danger)' }}>{fmt(q.expenses)}</td>
                    <td className="data-table__mono data-table__bold">{fmt(q.profit)}</td>
                    <td className="data-table__mono">{fmt(q.taxOwed)}</td>
                    <td className="data-table__mono" style={{ color: q.taxPaid >= q.taxOwed ? 'var(--success)' : 'var(--warning)' }}>{fmt(q.taxPaid)}</td>
                    <td className="data-table__muted">{q.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Payment Log */}
          <div className="panel">
            <div className="panel__header"><h3>Tax Payment Log</h3><button className="btn btn--primary btn--sm" onClick={() => { setTaxForm({ ...emptyTax, year: filterYear }); setShowTaxModal(true); }}>+ Log Payment</button></div>
            {yearTaxPayments.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}><p>No tax payments recorded for {filterYear}</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Quarter</th><th>Amount</th><th>Method</th><th>Confirmation #</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {yearTaxPayments.sort((a, b) => new Date(b.date) - new Date(a.date)).map(tp => (
                    <tr key={tp.id}>
                      <td className="data-table__muted">{tp.date}</td>
                      <td className="data-table__bold">{tp.quarter}</td>
                      <td className="data-table__mono data-table__bold">{fmt(tp.amount)}</td>
                      <td>{tp.paymentMethod || '—'}</td>
                      <td className="data-table__mono data-table__muted">{tp.confirmation || '—'}</td>
                      <td className="data-table__muted">{tp.notes || '—'}</td>
                      <td><button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteTaxPayment(tp.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══ ENTRY MODAL ═══ */}
      {showEntryModal && (
        <div className="modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editId ? 'Edit' : 'Add'} {entryType === 'income' ? 'Income' : 'Expense'}</h2>
              <button className="modal__close" onClick={() => setShowEntryModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group"><label>Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label>Amount *</label><input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))} /></div>
                <div className="form-group"><label>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}><option value="">Select...</option>{(entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group"><label>Payment Method</label><select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}><option value="">Select...</option>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="form-group form-group--full"><label>Description</label><input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={entryType === 'income' ? 'e.g., TradeLink 30% deposit' : 'e.g., Proton Mail subscription'} /></div>
                <div className="form-group"><label>Client (optional)</label><select value={form.clientId || ''} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}><option value="">None</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}</select></div>
                <div className="form-group"><label>Project (optional)</label><select value={form.projectId || ''} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}><option value="">None</option>{projects.filter(p => !form.clientId || p.clientId === form.clientId).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                {entryType === 'expense' && (
                  <>
                    <div className="form-group form-group--full" style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: 'row' }}>
                      <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={form.taxDeductible} onChange={e => setForm(f => ({ ...f, taxDeductible: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--brand)' }} />
                        Tax-deductible write-off
                      </label>
                    </div>
                    {form.taxDeductible && (
                      <div className="form-group form-group--full"><label>Tax Write-Off Category</label><select value={form.taxCategory} onChange={e => setForm(f => ({ ...f, taxCategory: e.target.value }))}><option value="">Select IRS category...</option>{TAX_WRITE_OFF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    )}
                  </>
                )}
                <div className="form-group form-group--full"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes, receipt details..." rows={2} /></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowEntryModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveEntry}>{editId ? 'Save Changes' : `Add ${entryType === 'income' ? 'Income' : 'Expense'}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAX PAYMENT MODAL ═══ */}
      {showTaxModal && (
        <div className="modal-overlay" onClick={() => setShowTaxModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header"><h2>Log Tax Payment</h2><button className="modal__close" onClick={() => setShowTaxModal(false)}>×</button></div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group"><label>Date Paid *</label><input type="date" value={taxForm.date} onChange={e => setTaxForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label>Quarter</label><select value={taxForm.quarter} onChange={e => setTaxForm(f => ({ ...f, quarter: e.target.value }))}>{['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q}</option>)}</select></div>
                <div className="form-group"><label>Amount *</label><input type="number" min="0" step="0.01" value={taxForm.amount} onChange={e => setTaxForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))} /></div>
                <div className="form-group"><label>Payment Method</label><select value={taxForm.paymentMethod} onChange={e => setTaxForm(f => ({ ...f, paymentMethod: e.target.value }))}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="form-group form-group--full"><label>IRS Confirmation #</label><input type="text" value={taxForm.confirmation} onChange={e => setTaxForm(f => ({ ...f, confirmation: e.target.value }))} placeholder="e.g., 240643563245342" /></div>
                <div className="form-group form-group--full"><label>Notes</label><textarea value={taxForm.notes} onChange={e => setTaxForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowTaxModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveTaxPayment}>Log Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
