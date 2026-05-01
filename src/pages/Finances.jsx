import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateId, initialSettings } from '../data/initialData';
import { isBillingActive, monthlyEquivalent, effectiveNextDue } from '../lib/billing';

// ─────────────────────────────────────────────────────────────────────
// Finances — QuickBooks-style P&L + tax tracker.
//
// Income is computed from paid invoices, NOT manually entered. Mark an
// invoice paid in the Invoices page and it shows up here automatically.
// Expenses still require manual entry today; bank-link via Plaid (or
// CSV import) is a Phase 2 follow-up — see reference_finances_phase2.md.
//
// All metrics scope to a single calendar year (filterYear) so the
// quarterly tax estimator and YTD numbers always agree. Tax rate pulls
// from settings.defaultTaxRate; default 25%.
// ─────────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Software', 'Hosting', 'Advertising', 'Office Supplies', 'Equipment', 'Travel', 'Meals', 'Insurance', 'Professional Services', 'Education', 'Subscriptions', 'Utilities', 'Rent', 'Vehicle', 'Phone', 'Internet', 'Bank Fees', 'Taxes Paid', 'Other'];
const TAX_WRITE_OFF_CATEGORIES = ['Business Use of Home', 'Vehicle/Mileage', 'Office Supplies', 'Software & Tools', 'Professional Development', 'Marketing & Advertising', 'Insurance Premiums', 'Travel & Meals (50%)', 'Professional Services', 'Equipment (Section 179)', 'Internet & Phone', 'Subscriptions', 'Other Deduction'];
const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'PayPal', 'Stripe', 'Check', 'Cash', 'Zelle', 'Other'];

function fmt(n) { return '$' + Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }

// Compute the dollar total of a single invoice from its line items,
// tax rate, and discount. Mirrors the calculation used everywhere else
// (Dashboard, Reports) so the numbers always reconcile.
function invoiceTotal(items, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}

export default function Finances({
  clients = [],
  projects = [],
  invoices = [],
  recurringExpenses = [],
  applications = [],
  settings: rawSettings,
  entries,
  setEntries,
  taxPayments,
  setTaxPayments,
}) {
  const navigate = useNavigate();
  const settings = { ...initialSettings, ...rawSettings };
  const [tab, setTab] = useState('overview');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('all');

  const taxRate = (settings.defaultTaxRate || 25) / 100;

  const emptyEntry = {
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '', description: '', clientId: '', projectId: '', invoiceId: '',
    taxDeductible: false, taxCategory: '', paymentMethod: '', notes: '',
  };
  const [form, setForm] = useState(emptyEntry);

  const emptyTax = { date: '', quarter: 'Q1', amount: 0, paymentMethod: 'Bank Transfer', confirmation: '', notes: '', year: filterYear };
  const [taxForm, setTaxForm] = useState(emptyTax);

  // ── Auto-derived income from paid invoices ──────────────────────
  // Each paid invoice within the filter year becomes one income row.
  // Uses paidDate when set (true cash event), falls back to issueDate
  // for older paid invoices where paidDate wasn't recorded.
  const incomeRows = useMemo(() => {
    return invoices
      .filter(i => i.status === 'paid')
      .map(i => {
        const dateStr = (i.paidDate || i.issueDate || '').slice(0, 10);
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return null;
        if (d.getFullYear() !== filterYear) return null;
        const client = clients.find(c => c.id === i.clientId);
        const project = projects.find(p => p.id === i.projectId);
        return {
          id: 'invoice-' + i.id,
          invoiceId: i.id,
          invoiceNumber: i.invoiceNumber,
          date: dateStr,
          month: d.getMonth(),
          amount: invoiceTotal(i.items, i.taxRate, i.discount),
          clientId: i.clientId,
          clientName: client?.company || i.clientCompany || '—',
          projectId: i.projectId,
          projectTitle: project?.title || i.projectTitle || '',
          paymentMethod: i.paymentMethod || '',
        };
      })
      .filter(Boolean);
  }, [invoices, clients, projects, filterYear]);

  // ── Manual expense entries (kept) ────────────────────────────────
  // We still let admins enter expenses by hand. Phase 2 (bank-link)
  // will append rows to the same finance_entries table from a Plaid
  // sync; nothing on this page needs to change when that lands.
  const yearExpenses = useMemo(
    () => entries.filter(e => {
      if (e.type !== 'expense') return false;
      const d = new Date(e.date);
      return d.getFullYear() === filterYear;
    }),
    [entries, filterYear]
  );

  const filteredIncome = useMemo(() => {
    if (filterMonth === 'all') return incomeRows;
    return incomeRows.filter(r => r.month === parseInt(filterMonth));
  }, [incomeRows, filterMonth]);

  const filteredExpenses = useMemo(() => {
    if (filterMonth === 'all') return yearExpenses;
    return yearExpenses.filter(e => new Date(e.date).getMonth() === parseInt(filterMonth));
  }, [yearExpenses, filterMonth]);

  // ── Aggregate metrics ────────────────────────────────────────────
  const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = yearExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? netProfit / totalIncome : 0;
  const estimatedTax = Math.max(netProfit * taxRate, 0);

  const yearTaxPayments = taxPayments.filter(t => t.year === filterYear);
  const totalTaxPaid = yearTaxPayments.reduce((s, t) => s + (t.amount || 0), 0);
  const taxRemaining = estimatedTax - totalTaxPaid;

  const deductibleExpenses = yearExpenses.filter(e => e.taxDeductible);
  const totalDeductions = deductibleExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // ── Recurring revenue (MRR / contracted revenue) ────────────────
  // Tracked separately from collected income because tax is on cash
  // actually received, not on what's contractually owed. Surfacing
  // this lets the admin see what they SHOULD be invoicing for vs.
  // what's actually been collected.
  const activeRecurringItems = recurringExpenses.filter(isBillingActive);
  const monthlyRecurring = activeRecurringItems.reduce(
    (s, e) => s + monthlyEquivalent(e.amount, e.frequency),
    0
  );
  const yearlyRecurring = monthlyRecurring * 12;

  // Monthly breakdown (Jan..Dec, current filter year).
  const monthlyData = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const monthIncome = incomeRows.filter(r => r.month === m).reduce((s, r) => s + r.amount, 0);
      const monthExpense = yearExpenses
        .filter(e => new Date(e.date).getMonth() === m)
        .reduce((s, e) => s + (e.amount || 0), 0);
      months.push({
        label: new Date(filterYear, m).toLocaleString('en-US', { month: 'short' }),
        income: monthIncome,
        expenses: monthExpense,
        profit: monthIncome - monthExpense,
      });
    }
    return months;
  }, [incomeRows, yearExpenses, filterYear]);
  const maxMonthly = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses)), 1);

  // Income by client (the most useful breakdown — invoices don't have
  // free-form categories like manual income did).
  const incomeByClient = useMemo(() => {
    const map = {};
    incomeRows.forEach(r => {
      const key = r.clientName || '—';
      map[key] = (map[key] || 0) + r.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [incomeRows]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    yearExpenses.forEach(e => {
      map[e.category || 'Other'] = (map[e.category || 'Other'] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [yearExpenses]);

  // Quarterly tax data — IRS estimated quarterly schedule.
  const quarters = [
    { id: 'Q1', period: 'Jan 1 — Mar 31', months: [0, 1, 2],     due: `Apr 15, ${filterYear}` },
    { id: 'Q2', period: 'Apr 1 — May 31', months: [3, 4],         due: `Jun 15, ${filterYear}` },
    { id: 'Q3', period: 'Jun 1 — Aug 31', months: [5, 6, 7],      due: `Sep 15, ${filterYear}` },
    { id: 'Q4', period: 'Sep 1 — Dec 31', months: [8, 9, 10, 11], due: `Jan 15, ${filterYear + 1}` },
  ];
  const quarterData = quarters.map(q => {
    const qIncome = incomeRows
      .filter(r => q.months.includes(r.month))
      .reduce((s, r) => s + r.amount, 0);
    const qExpense = yearExpenses
      .filter(e => q.months.includes(new Date(e.date).getMonth()))
      .reduce((s, e) => s + (e.amount || 0), 0);
    const qProfit = qIncome - qExpense;
    const qTax = Math.max(qProfit * taxRate, 0);
    const qPaid = yearTaxPayments.filter(t => t.quarter === q.id).reduce((s, t) => s + (t.amount || 0), 0);
    return { ...q, income: qIncome, expenses: qExpense, profit: qProfit, taxOwed: qTax, taxPaid: qPaid };
  });

  // ── Expense CRUD ─────────────────────────────────────────────────
  function openAddExpense({ deductible = false } = {}) {
    setEditId(null);
    setForm({
      ...emptyEntry,
      type: 'expense',
      category: 'Software',
      taxDeductible: deductible,
    });
    setShowEntryModal(true);
  }

  function openEditExpense(entry) {
    setEditId(entry.id);
    setForm({ ...entry, type: 'expense' });
    setShowEntryModal(true);
  }

  function saveExpense() {
    if (!form.amount || !form.date) return;
    const d = new Date(form.date);
    const record = { ...form, type: 'expense', year: d.getFullYear(), month: d.getMonth() + 1 };
    if (editId) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...record, id: editId } : e));
    } else {
      setEntries(prev => [...prev, { ...record, id: generateId(), createdAt: new Date().toISOString() }]);
    }
    setShowEntryModal(false);
  }

  function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  // ── Tax payment CRUD ─────────────────────────────────────────────
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
    { id: 'overview',   label: 'Overview' },
    { id: 'income',     label: 'Income' },
    { id: 'expenses',   label: 'Expenses' },
    { id: 'deductions', label: 'Write-Offs' },
    { id: 'taxes',      label: 'Taxes' },
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
      {/* Year + Month selectors */}
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
          <div className="fin__kpis">
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
              <span className="stat-card__label">Total Income (Collected)</span>
              <span className="stat-card__value">{fmt(totalIncome)}</span>
              <span className="stat-card__sub">{incomeRows.length} paid invoice{incomeRows.length === 1 ? '' : 's'}</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
              <span className="stat-card__label">Recurring Revenue</span>
              <span className="stat-card__value">{fmt(monthlyRecurring)}/mo</span>
              <span className="stat-card__sub">{activeRecurringItems.length} active · {fmt(yearlyRecurring)}/yr forecast</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--danger)' }} />
              <span className="stat-card__label">Total Expenses</span>
              <span className="stat-card__value">{fmt(totalExpenses)}</span>
              <span className="stat-card__sub">{yearExpenses.length} entries</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
              <span className="stat-card__label">Net Profit</span>
              <span className="stat-card__value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {netProfit < 0 ? '-' : ''}{fmt(netProfit)}
              </span>
              <span className="stat-card__sub">{fmtPct(profitMargin)} margin</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--purple)' }} />
              <span className="stat-card__label">Est. Tax Owed</span>
              <span className="stat-card__value">{fmt(estimatedTax)}</span>
              <span className="stat-card__sub">{fmt(totalTaxPaid)} paid · {fmt(Math.max(taxRemaining, 0))} remaining</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
              <span className="stat-card__label">Write-Offs</span>
              <span className="stat-card__value">{fmt(totalDeductions)}</span>
              <span className="stat-card__sub">{deductibleExpenses.length} deductible items</span>
            </div>
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

          {/* Side-by-side breakdowns */}
          <div className="fin__row">
            <div className="panel">
              <div className="panel__header"><h3>Income by Client</h3></div>
              <div style={{ padding: '12px 22px' }}>
                {incomeByClient.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>No paid invoices yet this year.</p>
                ) : incomeByClient.map(([cat, amt]) => (
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
                {expenseByCategory.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>No expenses recorded yet.</p>
                ) : expenseByCategory.map(([cat, amt]) => (
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

      {/* ═══ INCOME TAB — auto-derived, read-only ═══ */}
      {tab === 'income' && (
        <>
          <div className="panel" style={{ marginBottom: 16, padding: '14px 18px', background: 'var(--brand-wash)', border: '1px dashed var(--brand-mid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: 'var(--slate)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: 'var(--brand)' }}>Auto-tracked from invoices.</span>
              <span>
                Income flows here when you mark an invoice paid in
                {' '}<button type="button" onClick={() => navigate('/invoices')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>Invoices</button>.
                Manual entry isn&apos;t needed.
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel__header">
              <h3>Income — {filterYear}{filterMonth !== 'all' ? `, ${MONTHS.find(m => m.value === filterMonth)?.label}` : ''}</h3>
              <span className="data-table__mono" style={{ color: 'var(--success)', fontWeight: 700 }}>
                {fmt(filteredIncome.reduce((s, r) => s + r.amount, 0))}
              </span>
            </div>
            {filteredIncome.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">💰</span>
                <h3>No income for this period</h3>
                <p>Mark an invoice paid and it&apos;ll appear here automatically.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date Paid</th>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Project</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncome.sort((a, b) => (b.date > a.date ? 1 : -1)).map(row => (
                    <tr
                      key={row.id}
                      className="data-table__clickable"
                      onClick={() => navigate('/invoices')}
                      title="Open in Invoices"
                    >
                      <td className="data-table__muted">{row.date}</td>
                      <td className="data-table__bold">{row.invoiceNumber || '—'}</td>
                      <td>{row.clientName}</td>
                      <td className="data-table__muted">{row.projectTitle || '—'}</td>
                      <td className="data-table__muted">{row.paymentMethod || '—'}</td>
                      <td className="data-table__mono data-table__bold" style={{ color: 'var(--success)', textAlign: 'right' }}>
                        {fmt(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Recurring Revenue Schedule ──
              Lists every active billing item across all applications.
              Shows the monthly-equivalent contribution and the next-due
              date so the admin can see what they SHOULD be invoicing
              for. Tax calc still uses cash collected (above) — this is
              accrual-style visibility. */}
          {activeRecurringItems.length > 0 && (
            <div className="panel" style={{ marginTop: 20 }}>
              <div className="panel__header">
                <div>
                  <h3>Recurring Revenue Schedule</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--slate-light)', margin: '4px 0 0 0' }}>
                    Active billing contracts across your applications. Counts toward income only when invoiced and paid.
                  </p>
                </div>
                <span className="data-table__mono" style={{ color: 'var(--info)', fontWeight: 700 }}>
                  {fmt(monthlyRecurring)}/mo · {fmt(yearlyRecurring)}/yr
                </span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Application</th>
                    <th>Client</th>
                    <th>Frequency</th>
                    <th>Next Due</th>
                    <th style={{ textAlign: 'right' }}>Per Cycle</th>
                    <th style={{ textAlign: 'right' }}>Monthly Equiv.</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecurringItems
                    .map(e => {
                      const app = applications.find(a => a.id === e.applicationId);
                      const client = clients.find(c => c.id === e.clientId);
                      return {
                        ...e,
                        appName: app?.name || '—',
                        clientName: client?.company || '—',
                        nextDue: effectiveNextDue(e),
                        mo: monthlyEquivalent(e.amount, e.frequency),
                      };
                    })
                    .sort((a, b) => b.mo - a.mo)
                    .map(e => (
                      <tr key={e.id} className="data-table__clickable" onClick={() => navigate('/clients')} title="Manage in Clients → Applications → Billing">
                        <td className="data-table__bold">{e.title}</td>
                        <td>{e.appName}</td>
                        <td className="data-table__muted">{e.clientName}</td>
                        <td className="data-table__muted">{e.frequency}</td>
                        <td className="data-table__muted">{e.nextDue || '—'}</td>
                        <td className="data-table__mono" style={{ textAlign: 'right' }}>{fmt(e.amount)}</td>
                        <td className="data-table__mono data-table__bold" style={{ color: 'var(--info)', textAlign: 'right' }}>{fmt(e.mo)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--slate-light)', borderTop: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--ink)' }}>Note:</strong> Recurring totals here are projected. Actual income for tax purposes is cash collected (paid invoices, above). Generate an invoice in
                {' '}<button type="button" onClick={() => navigate('/invoices')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>Invoices</button>
                {' '}for each cycle, mark it paid, and it&apos;ll appear in the income table above.
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ EXPENSES TAB — manual + bank-link stub ═══ */}
      {tab === 'expenses' && (
        <>
          {/* Phase 2 stub explaining the planned bank-link flow. */}
          <div className="panel" style={{ marginBottom: 16, padding: '14px 18px', background: 'var(--brand-wash)', border: '1px dashed var(--brand-mid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.88rem', color: 'var(--slate)', lineHeight: 1.5, flex: 1, minWidth: 280 }}>
                <strong style={{ color: 'var(--brand)' }}>Bank-linked expenses — coming soon.</strong>
                {' '}Connect your business bank or upload a transaction CSV and we&apos;ll
                auto-categorize and import everything. For now, log expenses manually below.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn--ghost btn--sm" disabled style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                  Connect bank
                </button>
                <button className="btn btn--ghost btn--sm" disabled style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                  Import CSV
                </button>
              </div>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar__left" />
            <button className="btn btn--primary" onClick={() => openAddExpense()}>+ Add Expense</button>
          </div>

          <div className="panel">
            {filteredExpenses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">💸</span>
                <h3>No expenses for this period</h3>
                <p>Add your first expense to start tracking.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Category</th><th>Description</th><th>Client</th>
                    <th>Deductible</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => {
                    const client = clients.find(c => c.id === entry.clientId);
                    return (
                      <tr key={entry.id} className="data-table__clickable" onClick={() => openEditExpense(entry)}>
                        <td className="data-table__muted">{entry.date}</td>
                        <td>{entry.category || '—'}</td>
                        <td>{entry.description || '—'}</td>
                        <td className="data-table__muted">{client?.company || '—'}</td>
                        <td>{entry.taxDeductible ? <span className="freq-badge freq-badge--annual">Yes</span> : '—'}</td>
                        <td className="data-table__muted">{entry.paymentMethod || '—'}</td>
                        <td className="data-table__mono data-table__bold" style={{ color: 'var(--danger)', textAlign: 'right' }}>{fmt(entry.amount)}</td>
                        <td><div className="action-btns" onClick={e => e.stopPropagation()}><button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteExpense(entry.id)}>×</button></div></td>
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
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
              <span className="stat-card__label">Total Deductions</span>
              <span className="stat-card__value">{fmt(totalDeductions)}</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
              <span className="stat-card__label">Tax Savings (est.)</span>
              <span className="stat-card__value">{fmt(totalDeductions * taxRate)}</span>
              <span className="stat-card__sub">at {(taxRate * 100).toFixed(0)}% rate</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
              <span className="stat-card__label">Deductible Items</span>
              <span className="stat-card__value">{deductibleExpenses.length}</span>
            </div>
          </div>
          <div className="toolbar">
            <div className="toolbar__left" />
            <button className="btn btn--primary" onClick={() => openAddExpense({ deductible: true })}>+ Add Write-Off</button>
          </div>
          <div className="panel">
            {deductibleExpenses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">📋</span>
                <h3>No write-offs recorded</h3>
                <p>Mark expenses as tax-deductible when adding them.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Tax Category</th><th>Description</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
                <tbody>
                  {deductibleExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => (
                    <tr key={entry.id} className="data-table__clickable" onClick={() => openEditExpense(entry)}>
                      <td className="data-table__muted">{entry.date}</td>
                      <td><span className="freq-badge freq-badge--annual">{entry.taxCategory || entry.category}</span></td>
                      <td>{entry.description || '—'}</td>
                      <td className="data-table__muted">{entry.category}</td>
                      <td className="data-table__mono data-table__bold" style={{ textAlign: 'right' }}>{fmt(entry.amount)}</td>
                      <td><div className="action-btns" onClick={e => e.stopPropagation()}><button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => deleteExpense(entry.id)}>×</button></div></td>
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
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--warning)' }} />
              <span className="stat-card__label">Est. Taxes Owed</span>
              <span className="stat-card__value">{fmt(estimatedTax)}</span>
              <span className="stat-card__sub">{(taxRate * 100).toFixed(0)}% of {fmt(netProfit)} profit</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
              <span className="stat-card__label">Taxes Paid</span>
              <span className="stat-card__value">{fmt(totalTaxPaid)}</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: taxRemaining > 0 ? 'var(--danger)' : 'var(--success)' }} />
              <span className="stat-card__label">Remaining</span>
              <span className="stat-card__value" style={{ color: taxRemaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(Math.max(taxRemaining, 0))}</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
              <span className="stat-card__label">Deduction Savings</span>
              <span className="stat-card__value">{fmt(totalDeductions * taxRate)}</span>
            </div>
          </div>

          {/* Quarterly Breakdown */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel__header">
              <h3>Quarterly Tax Schedule — {filterYear}</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate-light)' }}>Income from paid invoices · expenses from this page</span>
            </div>
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
            <div className="panel__header">
              <h3>Tax Payment Log</h3>
              <button className="btn btn--primary btn--sm" onClick={() => { setTaxForm({ ...emptyTax, year: filterYear }); setShowTaxModal(true); }}>+ Log Payment</button>
            </div>
            {yearTaxPayments.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <p>No tax payments recorded for {filterYear}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Quarter</th><th style={{ textAlign: 'right' }}>Amount</th><th>Method</th><th>Confirmation #</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {yearTaxPayments.sort((a, b) => new Date(b.date) - new Date(a.date)).map(tp => (
                    <tr key={tp.id}>
                      <td className="data-table__muted">{tp.date}</td>
                      <td className="data-table__bold">{tp.quarter}</td>
                      <td className="data-table__mono data-table__bold" style={{ textAlign: 'right' }}>{fmt(tp.amount)}</td>
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

      {/* ═══ EXPENSE MODAL ═══ */}
      {showEntryModal && (
        <div className="modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal__close" onClick={() => setShowEntryModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group"><label>Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label>Amount *</label><input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))} /></div>
                <div className="form-group"><label>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}><option value="">Select...</option>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group"><label>Payment Method</label><select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}><option value="">Select...</option>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="form-group form-group--full"><label>Description</label><input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Adobe Creative Cloud subscription" /></div>
                <div className="form-group"><label>Client (optional)</label><select value={form.clientId || ''} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}><option value="">None</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}</select></div>
                <div className="form-group"><label>Project (optional)</label><select value={form.projectId || ''} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}><option value="">None</option>{projects.filter(p => !form.clientId || p.clientId === form.clientId).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                <div className="form-group form-group--full" style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: 'row' }}>
                  <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={form.taxDeductible} onChange={e => setForm(f => ({ ...f, taxDeductible: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--brand)' }} />
                    Tax-deductible write-off
                  </label>
                </div>
                {form.taxDeductible && (
                  <div className="form-group form-group--full"><label>Tax Write-Off Category</label><select value={form.taxCategory} onChange={e => setForm(f => ({ ...f, taxCategory: e.target.value }))}><option value="">Select IRS category...</option>{TAX_WRITE_OFF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                )}
                <div className="form-group form-group--full"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Receipt details, vendor, etc." rows={2} /></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowEntryModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveExpense}>{editId ? 'Save Changes' : 'Add Expense'}</button>
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
