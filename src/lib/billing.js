// ─────────────────────────────────────────────────────────────────────
// Billing helpers — single source of truth for "is this recurring
// expense actually billing right now?" used across the dashboard,
// reports, the AppBillingManager, and the portal.
//
// The status column stores the *admin's intent*: 'active', 'paused', or
// 'cancelled'. The startDate is the *scheduled* go-live. The effective
// state is computed: a paused item with a past startDate is treated as
// auto-started — that lets admins configure a future billing item and
// let it begin on its own without needing to come back and click Start.
//
// The DB row stays paused-with-startDate; nothing writes back. That
// keeps the auto-start path race-free (no missed cron, no double-fire)
// and lets admins override either direction with the Start/Pause
// button at any time.
// ─────────────────────────────────────────────────────────────────────

// Today's local YYYY-MM-DD. Used for date comparisons against
// startDate / nextDue strings (which are stored as YYYY-MM-DD too).
export function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// Returns one of:
//   { active: true,  scheduled: false, autoStarted: false }   admin clicked Start
//   { active: true,  scheduled: false, autoStarted: true  }   start date passed
//   { active: false, scheduled: true,  autoStarted: false }   start date is future
//   { active: false, scheduled: false, autoStarted: false }   paused / cancelled
export function effectiveBillingState(expense) {
  if (!expense) return { active: false, scheduled: false, autoStarted: false };
  if (expense.status === 'cancelled') {
    return { active: false, scheduled: false, autoStarted: false };
  }
  if (expense.status === 'active') {
    return { active: true, scheduled: false, autoStarted: false };
  }
  // status === 'paused' (or anything else) — fall through to the auto
  // -start logic so a configured-but-not-yet-clicked item still
  // activates on its scheduled date.
  if (expense.startDate) {
    const today = todayISO();
    if (expense.startDate <= today) {
      return { active: true, scheduled: false, autoStarted: true };
    }
    return { active: false, scheduled: true, autoStarted: false };
  }
  return { active: false, scheduled: false, autoStarted: false };
}

// Convenience: just the boolean. Use this anywhere that previously
// filtered by `status === 'active'`.
export function isBillingActive(expense) {
  return effectiveBillingState(expense).active;
}

// Monthly-equivalent dollar amount: yearly /12, quarterly /3, monthly
// as-is. Used by every MRR rollup in the app.
export function monthlyEquivalent(amount, frequency) {
  if (!amount) return 0;
  if (frequency === 'monthly')   return amount;
  if (frequency === 'quarterly') return amount / 3;
  if (frequency === 'yearly')    return amount / 12;
  return amount;
}

// Sum monthlyEquivalent across all *effectively active* expenses.
// This is what the dashboard's "Monthly Recurring" KPI and the reports
// MRR card should use — picks up auto-started items for free.
export function activeMonthlyMRR(expenses) {
  let sum = 0;
  for (const e of expenses || []) {
    if (!isBillingActive(e)) continue;
    sum += monthlyEquivalent(e.amount, e.frequency);
  }
  return sum;
}

// Compute the next-due date for an expense. For explicitly-active
// rows we trust the saved nextDue. For auto-started rows we walk the
// startDate forward by the frequency until we land on a date strictly
// after today.
export function effectiveNextDue(expense) {
  if (!expense) return null;
  const eff = effectiveBillingState(expense);
  if (!eff.active) return null;
  if (expense.status === 'active' && expense.nextDue) return expense.nextDue;
  if (!expense.startDate) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const candidate = new Date(expense.startDate + 'T00:00:00');
  // Roll forward until > today. Cap iterations defensively.
  for (let i = 0; i < 1200; i++) {
    if (candidate > today) break;
    if (expense.frequency === 'monthly')        candidate.setMonth(candidate.getMonth() + 1);
    else if (expense.frequency === 'quarterly') candidate.setMonth(candidate.getMonth() + 3);
    else if (expense.frequency === 'yearly')    candidate.setFullYear(candidate.getFullYear() + 1);
    else break; // unknown frequency — bail rather than infinite-loop
  }
  return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
}
