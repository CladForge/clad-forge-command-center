// Registry of KPI cards available on the admin dashboard, plus the order/
// visibility reconciliation helper. Lives in its own module so React Fast
// Refresh stays happy — Dashboard.jsx is component-only, Settings.jsx is
// component-only, and both pull these constants from here.
//
// To add a new KPI card:
//   1. Append a row to KPI_CARD_DEFS below (id, display label, optional
//      `defaultEnabled: false` so it's hidden until the user opts in).
//   2. In Dashboard.jsx, add the matching entry to the `cardProps` map
//      inside the rendered KPI block. resolveCardOrder() automatically
//      backfills any new card into existing user settings using the
//      registry's defaultEnabled flag (true if not specified).
//
// Group divider: the first 5 entries match what shipped before the
// customization feature; everything below is opt-in so existing users
// don't see their dashboard rearrange itself after this update lands.

// defaultColor is a 6-digit hex literal so it round-trips through the
// native <input type="color"> in Settings without conversion. The chosen
// palette pairs metric semantics with color: revenue green, debts red,
// open work amber, etc. Users can override per-card via Settings.
export const KPI_CARD_DEFS = [
  // ── Default cards (visible on first load) ──────────────────────────
  { id: 'totalRevenue',   label: 'Total Revenue',      defaultColor: '#10b981' }, // emerald
  { id: 'outstanding',    label: 'Outstanding',        defaultColor: '#f59e0b' }, // amber
  { id: 'activeClients',  label: 'Active Clients',     defaultColor: '#ff8c00' }, // brand orange
  { id: 'activeProjects', label: 'Active Projects',    defaultColor: '#3b82f6' }, // blue
  { id: 'proposals',      label: 'Proposals',          defaultColor: '#a855f7' }, // purple

  // ── Optional cards (off by default — toggle on in Settings) ────────
  { id: 'thisMonthRevenue', label: 'Revenue This Month',  defaultEnabled: false, defaultColor: '#10b981' },
  { id: 'overdue',          label: 'Overdue Invoices',    defaultEnabled: false, defaultColor: '#ef4444' }, // red
  { id: 'pendingProposals', label: 'Pending Proposals',   defaultEnabled: false, defaultColor: '#f59e0b' },
  { id: 'acceptedProposals',label: 'Accepted Proposals',  defaultEnabled: false, defaultColor: '#10b981' },
  { id: 'winRate',          label: 'Proposal Win Rate',   defaultEnabled: false, defaultColor: '#ff8c00' },
  { id: 'pipelineValue',    label: 'Pipeline Value',      defaultEnabled: false, defaultColor: '#3b82f6' },
  { id: 'totalClients',     label: 'Total Clients',       defaultEnabled: false, defaultColor: '#ff8c00' },
  { id: 'avgProjectBudget', label: 'Avg Project Budget',  defaultEnabled: false, defaultColor: '#3b82f6' },
  { id: 'avgDaysToPay',     label: 'Avg Days to Pay',     defaultEnabled: false, defaultColor: '#10b981' },
  { id: 'openTickets',      label: 'Open Support Tickets', defaultEnabled: false, defaultColor: '#f59e0b' },
  { id: 'liveApplications', label: 'Live Applications',   defaultEnabled: false, defaultColor: '#a855f7' },
  { id: 'monthlyRecurring', label: 'Monthly Recurring',   defaultEnabled: false, defaultColor: '#14b8a6' }, // teal
];

// Look up the effective color for a given card config: a saved override
// wins over the registry default, which wins over a hardcoded fallback.
export function colorFor(cardConfig) {
  const def = KPI_CARD_DEFS.find(d => d.id === cardConfig?.id);
  return cardConfig?.color || def?.defaultColor || '#ff8c00';
}

// Reconcile a saved card order with the live registry. Drops any saved IDs
// that no longer exist in the registry, and appends any registry IDs that
// aren't in the saved data (using the registry's defaultEnabled flag, which
// is true unless explicitly false). Always returns a stable, fully-specified
// array — the rest of the UI never has to handle holes.
export function resolveCardOrder(saved) {
  const valid = (Array.isArray(saved) ? saved : [])
    .filter(c => KPI_CARD_DEFS.some(r => r.id === c.id));
  const present = new Set(valid.map(c => c.id));
  const appended = KPI_CARD_DEFS
    .filter(r => !present.has(r.id))
    .map(r => ({ id: r.id, enabled: r.defaultEnabled !== false }));
  return [...valid, ...appended];
}

// Pick a column count that balances n KPI cards across rows.
//
// CSS Grid fills greedily — with `repeat(6, 1fr)` and 7 items you'd get
// rows of 6 and 1, which is ugly. Picking a smaller column count up-front
// gives a layout like 4/3 instead. The rules:
//
//   * n ≤ maxCols  → one row, one column per card.
//   * Otherwise, search [minCols .. maxCols] for the column count that:
//       - never leaves the last row with a single lonely card,
//       - minimizes the "imbalance" (gap between full rows and last row),
//       - tiebreaks on larger c (more cards per row, fewer rows).
//   * minCols = ceil(n/4) so we cap the layout at ~4 rows; cards get
//     narrower instead of stacking endlessly when the registry grows.
//
// Returns an integer suitable for `grid-template-columns: repeat(c, 1fr)`.
export function pickKpiColumns(n, maxCols = 6) {
  if (n <= 0) return 1;
  if (n <= maxCols) return n;
  const minCols = Math.max(2, Math.ceil(n / 4));
  let best = minCols;
  let bestImbalance = Infinity;
  for (let c = minCols; c <= maxCols; c++) {
    const lastRow = n % c === 0 ? c : n % c;
    if (lastRow === 1) continue; // never strand a single card alone
    const imbalance = c - lastRow; // 0 = perfectly even rows
    if (imbalance < bestImbalance || (imbalance === bestImbalance && c > best)) {
      best = c;
      bestImbalance = imbalance;
    }
  }
  return best;
}
