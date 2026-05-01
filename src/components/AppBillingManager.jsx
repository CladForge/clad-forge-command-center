import { useState } from 'react';
import { generateId } from '../data/initialData';
import {
  todayISO,
  effectiveBillingState,
  isBillingActive,
  monthlyEquivalent,
  effectiveNextDue,
} from '../lib/billing';

// ─────────────────────────────────────────────────────────────────────
// AppBillingManager — categorized billing breakdown for one application.
// Lives on top of the existing `recurring_expenses` table (each row is
// an expense linked to the application via application_id, with the
// new `category` column slotting it into a bucket).
//
// Two render modes:
//   adminMode = true   → show Add / Start / Pause / Edit / Remove
//                        affordances. The parent owns the
//                        recurringExpenses list + setter.
//   adminMode = false  → read-only summary. Used on the client portal.
//
// "Started" semantics: status = 'paused' means configured but not yet
// billing — clicking Start flips it to 'active' and aligns nextDue to
// the configured startDate (or today if startDate is in the past). The
// MRR rollups across the app already filter by status === 'active' so
// they pick this up for free.
// ─────────────────────────────────────────────────────────────────────

// Module-local — keeps this file as components-only so React Fast
// Refresh can hot-reload it. If something outside this file ever needs
// to enumerate categories, lift it into src/lib/billingCategories.js.
const BILLING_CATEGORIES = [
  { id: 'hosting',     label: 'Hosting',     hint: 'Servers, CDN, domain renewals, SSL.' },
  { id: 'maintenance', label: 'Maintenance', hint: 'Bug fixes, content updates, monitoring time.' },
  { id: 'database',    label: 'Database',    hint: 'Database hosting, backups, storage.' },
  { id: 'other',       label: 'Other',       hint: 'Anything else that recurs for this app.' },
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
];

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Add one frequency-cycle to a YYYY-MM-DD start date and return
// YYYY-MM-DD. Used when the admin clicks Start to bake in the first
// nextDue. (Auto-started items don't write back; effectiveNextDue
// from lib/billing computes their next-due on the fly.)
function rollNextDue(startDateStr, frequency) {
  const base = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = base < today ? new Date(today) : new Date(base);
  if (frequency === 'monthly')        out.setMonth(out.getMonth() + 1);
  else if (frequency === 'quarterly') out.setMonth(out.getMonth() + 3);
  else if (frequency === 'yearly')    out.setFullYear(out.getFullYear() + 1);
  return `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, '0')}-${String(out.getDate()).padStart(2, '0')}`;
}

export default function AppBillingManager({
  application,
  recurringExpenses = [],
  setRecurringExpenses,
  adminMode = false,
}) {
  const [editing, setEditing] = useState(null); // { mode: 'new'|'edit', categoryId?, expense? }

  // Filter to this app's expenses; group by category for rendering.
  const appExpenses = recurringExpenses.filter(e => e.applicationId === application.id);
  const grouped = BILLING_CATEGORIES.map(cat => ({
    ...cat,
    items: appExpenses.filter(e => (e.category || 'other') === cat.id),
  }));

  // Total active MRR (for the summary row at the bottom). Uses the
  // effective state — auto-started items count toward the total even
  // though their DB row is still status='paused'.
  const totalActiveMRR = appExpenses
    .filter(isBillingActive)
    .reduce((sum, e) => sum + monthlyEquivalent(e.amount, e.frequency), 0);
  const totalConfigured = appExpenses
    .filter(e => e.status !== 'cancelled')
    .reduce((sum, e) => sum + monthlyEquivalent(e.amount, e.frequency), 0);

  // ── Mutations (admin only) ───────────────────────────────────────
  // Start / Pause logic with three branches:
  //   1. Currently effectively-active → user wants to pause. Clear
  //      startDate so an auto-started row doesn't immediately
  //      re-activate from the past startDate on next render.
  //   2. Scheduled (future startDate) and user clicks Start now →
  //      override the future date with today, activate immediately.
  //   3. Truly paused (no startDate) → activate with startDate=today.
  function handleStartPause(expense) {
    if (!adminMode || !setRecurringExpenses) return;
    const eff = effectiveBillingState(expense);
    setRecurringExpenses(prev => prev.map(e => {
      if (e.id !== expense.id) return e;
      if (eff.active) {
        // Pause — clear startDate so auto-start logic doesn't re-fire
        return { ...e, status: 'paused', startDate: '' };
      }
      // Start (or "start now" override on a scheduled row)
      const newStart = eff.scheduled ? todayISO() : (e.startDate || todayISO());
      return {
        ...e,
        status: 'active',
        startDate: newStart,
        nextDue: rollNextDue(newStart, e.frequency),
      };
    }));
  }

  function handleSave(form) {
    if (!adminMode || !setRecurringExpenses) return;
    if (editing.mode === 'edit') {
      setRecurringExpenses(prev => prev.map(e =>
        e.id === editing.expense.id ? { ...e, ...form } : e
      ));
    } else {
      setRecurringExpenses(prev => [
        ...prev,
        {
          id: generateId(),
          applicationId: application.id,
          clientId: application.clientId,
          status: 'paused',          // configured, not yet billing
          autoInvoice: false,
          startDate: '',
          nextDue: '',
          ...form,
        },
      ]);
    }
    setEditing(null);
  }

  function handleDelete(expense) {
    if (!adminMode || !setRecurringExpenses) return;
    if (!window.confirm(`Remove "${expense.title}" from this application's billing? This will not delete past invoices.`)) return;
    setRecurringExpenses(prev => prev.filter(e => e.id !== expense.id));
  }

  return (
    <div className="app-billing">
      {grouped.map(cat => (
        <CategoryBlock
          key={cat.id}
          category={cat}
          items={cat.items}
          adminMode={adminMode}
          onAdd={() => setEditing({ mode: 'new', categoryId: cat.id })}
          onEdit={expense => setEditing({ mode: 'edit', expense })}
          onStartPause={handleStartPause}
          onDelete={handleDelete}
        />
      ))}

      {/* Total monthly equivalent at the bottom — only counts active items
          since paused ones aren't yet billing the client. */}
      <div className="app-billing__totals">
        <div className="app-billing__total-row">
          <span className="app-billing__total-label">Active monthly</span>
          <span className="app-billing__total-value app-billing__total-value--brand">
            {fmtCurrency(totalActiveMRR)}/mo
          </span>
        </div>
        {totalConfigured > totalActiveMRR && (
          <div className="app-billing__total-row app-billing__total-row--muted">
            <span className="app-billing__total-label">If all started</span>
            <span className="app-billing__total-value">
              {fmtCurrency(totalConfigured)}/mo
            </span>
          </div>
        )}
      </div>

      {/* Phase 2 stub — explains where this is going. Visible to admins
          so they understand auto-pay is wired up to land later; on the
          client portal this same idea shows up as a "Set up auto-pay"
          affordance on the application detail. */}
      {adminMode && (
        <div className="app-billing__future">
          <strong>How starting works:</strong> Set a start date and the item begins
          billing on its own when that date arrives — no need to come back and
          click Start. Click <em>Start</em> to begin immediately, or <em>Pause</em>
          to halt an active item. <br />
          <strong>Auto-pay:</strong> Active items are invoiced manually for now.
          ACH auto-withdrawal from the client&apos;s bank account is the Phase 2
          build — see Settings &rarr; Calendars and the portal Account page
          for the placeholder UI.
        </div>
      )}

      {editing && adminMode && (
        <BillingItemModal
          mode={editing.mode}
          initialCategoryId={editing.categoryId}
          expense={editing.expense}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CategoryBlock — one of the four colored sections (Hosting,
// Maintenance, Database, Other). Header has the label, hint, and an
// "+ Add" button (admin only). Body lists rows.
// ─────────────────────────────────────────────────────────────────────
function CategoryBlock({ category, items, adminMode, onAdd, onEdit, onStartPause, onDelete }) {
  return (
    <section className="app-billing__cat">
      <header className="app-billing__cat-head">
        <div>
          <h4 className="app-billing__cat-label">{category.label}</h4>
          <p className="app-billing__cat-hint">{category.hint}</p>
        </div>
        {adminMode && (
          <button className="btn btn--ghost btn--sm" onClick={onAdd}>
            + Add {category.label.toLowerCase()}
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <div className="app-billing__empty">
          {adminMode ? `No ${category.label.toLowerCase()} fees configured.` : 'None configured.'}
        </div>
      ) : (
        <div className="app-billing__items">
          {items.map(item => (
            <BillingRow
              key={item.id}
              expense={item}
              adminMode={adminMode}
              onEdit={() => onEdit(item)}
              onStartPause={() => onStartPause(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BillingRow({ expense, adminMode, onEdit, onStartPause, onDelete }) {
  const eff = effectiveBillingState(expense);
  const nextDue = effectiveNextDue(expense);

  // Pill text reflects the effective state, with a hint when the row
  // auto-started from a passed startDate (so admins can tell "this
  // started on its own" vs "I clicked Start manually").
  let pillLabel, pillModifier;
  if (eff.active) {
    pillLabel = eff.autoStarted ? 'Active (auto)' : 'Active';
    pillModifier = 'active';
  } else if (eff.scheduled) {
    pillLabel = `Scheduled — ${expense.startDate}`;
    pillModifier = 'scheduled';
  } else if (expense.status === 'cancelled') {
    pillLabel = 'Cancelled';
    pillModifier = 'cancelled';
  } else {
    pillLabel = 'Paused';
    pillModifier = 'paused';
  }

  // Button label changes meaning per state:
  //   Active     → Pause
  //   Scheduled  → Start now (override the future date)
  //   Paused     → Start
  //   Cancelled  → button disabled
  let actionLabel, actionVariant;
  if (eff.active) { actionLabel = 'Pause'; actionVariant = 'btn--ghost'; }
  else if (eff.scheduled) { actionLabel = 'Start now'; actionVariant = 'btn--primary'; }
  else { actionLabel = 'Start'; actionVariant = 'btn--primary'; }

  return (
    <div className={`app-billing__row ${eff.active ? 'app-billing__row--active' : ''} ${eff.scheduled ? 'app-billing__row--scheduled' : ''}`}>
      <div className="app-billing__row-info">
        <span className="app-billing__row-title">{expense.title}</span>
        {expense.description && (
          <span className="app-billing__row-desc">{expense.description}</span>
        )}
      </div>
      <span className="app-billing__row-amount">
        {fmtCurrency(expense.amount)}/{expense.frequency === 'monthly' ? 'mo' : expense.frequency === 'quarterly' ? 'qtr' : 'yr'}
      </span>
      <span className={`status-pill status-pill--${pillModifier}`}>{pillLabel}</span>
      {eff.active && nextDue && (
        <span className="app-billing__row-next">Next: {nextDue}</span>
      )}
      {adminMode && (
        <div className="app-billing__row-actions">
          <button
            className={`btn ${actionVariant} btn--sm`}
            onClick={onStartPause}
            disabled={expense.status === 'cancelled'}
            title={eff.scheduled ? 'Override the scheduled date and start billing today' : undefined}
          >
            {actionLabel}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={onEdit}>Edit</button>
          <button
            className="btn btn--ghost btn--sm btn--danger-hover"
            onClick={onDelete}
            title="Remove"
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Add / edit modal — common form for any billing item regardless of
// category. Category is selectable so admins can recategorize an
// existing fee without re-creating it.
function BillingItemModal({ mode, initialCategoryId, expense, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title:       expense?.title       || '',
    description: expense?.description || '',
    amount:      expense?.amount      || 0,
    frequency:   expense?.frequency   || 'monthly',
    category:    expense?.category    || initialCategoryId || 'other',
    startDate:   expense?.startDate   || '',
    notes:       expense?.notes       || '',
  }));

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, amount: Number(form.amount) || 0 });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal__header">
          <h2>{mode === 'edit' ? 'Edit billing item' : 'Add billing item'}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="modal__body">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="e.g. AWS hosting, monthly check-in"
              autoFocus
            />
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)}>
                {BILLING_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Frequency</label>
              <select value={form.frequency} onChange={e => update('frequency', e.target.value)}>
                {FREQUENCY_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Start date (optional)</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => update('startDate', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Optional one-line description"
            />
          </div>
          <div className="modal__footer" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={!form.title.trim()}>
              {mode === 'edit' ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
