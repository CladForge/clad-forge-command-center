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

export const KPI_CARD_DEFS = [
  // ── Default cards (visible on first load) ──────────────────────────
  { id: 'totalRevenue',   label: 'Total Revenue' },
  { id: 'outstanding',    label: 'Outstanding' },
  { id: 'activeClients',  label: 'Active Clients' },
  { id: 'activeProjects', label: 'Active Projects' },
  { id: 'proposals',      label: 'Proposals' },

  // ── Optional cards (off by default — toggle on in Settings) ────────
  { id: 'thisMonthRevenue', label: 'Revenue This Month',  defaultEnabled: false },
  { id: 'overdue',          label: 'Overdue Invoices',    defaultEnabled: false },
  { id: 'pendingProposals', label: 'Pending Proposals',   defaultEnabled: false },
  { id: 'acceptedProposals',label: 'Accepted Proposals',  defaultEnabled: false },
  { id: 'winRate',          label: 'Proposal Win Rate',   defaultEnabled: false },
  { id: 'pipelineValue',    label: 'Pipeline Value',      defaultEnabled: false },
  { id: 'totalClients',     label: 'Total Clients',       defaultEnabled: false },
  { id: 'avgProjectBudget', label: 'Avg Project Budget',  defaultEnabled: false },
  { id: 'avgDaysToPay',     label: 'Avg Days to Pay',     defaultEnabled: false },
  { id: 'openTickets',      label: 'Open Support Tickets', defaultEnabled: false },
  { id: 'liveApplications', label: 'Live Applications',   defaultEnabled: false },
  { id: 'monthlyRecurring', label: 'Monthly Recurring',   defaultEnabled: false },
];

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
