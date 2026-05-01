// Registry of KPI cards available on the admin dashboard, plus the order/
// visibility reconciliation helper. Lives in its own module so React Fast
// Refresh stays happy — Dashboard.jsx is component-only, Settings.jsx is
// component-only, and both pull these constants from here.
//
// To add a new KPI card:
//   1. Append a row to KPI_CARD_DEFS below (id + display label).
//   2. In Dashboard.jsx, add the matching entry to the `cardProps` map
//      inside the rendered KPI block. resolveCardOrder() automatically
//      backfills any new card into existing user settings as enabled.

export const KPI_CARD_DEFS = [
  { id: 'totalRevenue',   label: 'Total Revenue' },
  { id: 'outstanding',    label: 'Outstanding' },
  { id: 'activeClients',  label: 'Active Clients' },
  { id: 'activeProjects', label: 'Active Projects' },
  { id: 'proposals',      label: 'Proposals' },
];

// Reconcile a saved card order with the live registry. Drops any saved IDs
// that no longer exist in the registry, and appends any registry IDs that
// aren't in the saved data (defaulted to enabled). Always returns a stable,
// fully-specified array — the rest of the UI never has to handle holes.
export function resolveCardOrder(saved) {
  const valid = (Array.isArray(saved) ? saved : [])
    .filter(c => KPI_CARD_DEFS.some(r => r.id === c.id));
  const present = new Set(valid.map(c => c.id));
  const appended = KPI_CARD_DEFS
    .filter(r => !present.has(r.id))
    .map(r => ({ id: r.id, enabled: true }));
  return [...valid, ...appended];
}
