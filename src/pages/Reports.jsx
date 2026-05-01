import { useState, useMemo } from 'react';
import { initialSettings } from '../data/initialData';

// ── Formatting ───────────────────────────────────────────────────────
function fmtCompact(n) {
  if (!n) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '$' + Math.round(n).toLocaleString();
}
function fmtExact(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function calcInvoiceTotal(items, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}
function calcSowTotal(packages) {
  return (packages || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0);
}

// ── Static lookups ───────────────────────────────────────────────────
const STAGE_DEFS = [
  { key: 'lead',      label: 'Lead',      color: '#9ca3af' },
  { key: 'proposal',  label: 'Proposal',  color: '#f59e0b' },
  { key: 'active',    label: 'Active',    color: '#ff8c00' },
  { key: 'review',    label: 'Review',    color: '#3b82f6' },
  { key: 'completed', label: 'Completed', color: '#10b981' },
];

const APP_STATUS_DEFS = [
  { key: 'planning',       label: 'Planning',    color: '#9ca3af' },
  { key: 'in-development', label: 'Development', color: '#3b82f6' },
  { key: 'staging',        label: 'Staging',     color: '#a855f7' },
  { key: 'live',           label: 'Live',        color: '#10b981' },
  { key: 'maintenance',    label: 'Maintenance', color: '#14b8a6' },
  { key: 'archived',       label: 'Archived',    color: '#6b7280' },
];

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high:   '#f59e0b',
  normal: '#3b82f6',
  low:    '#9ca3af',
};

// ─────────────────────────────────────────────────────────────────────
// Reports — the "company at a glance" page. Fully derived from the live
// data (no separate query layer) so it always agrees with the dashboard.
// Period filter scopes anything time-bound (revenue, completed
// projects, resolved tickets); current-state metrics like outstanding
// AR or active project count don't get filtered since they represent
// "right now."
//
// Every block is designed to print cleanly via window.print() — see the
// `@media print` rules in App.css. The `.report-cover` block is hidden
// on screen and only shows up on the printed page.
// ─────────────────────────────────────────────────────────────────────
export default function Reports({
  clients = [],
  projects = [],
  sows = [],
  invoices = [],
  recurringExpenses = [],
  applications = [],
  tickets = [],
  annotationPins = [],
  settings,
}) {
  const [period, setPeriod] = useState('yearly');
  const s = { ...initialSettings, ...settings };

  // ── Period range + label ──
  const periodInfo = useMemo(() => {
    const now = new Date();
    let start, label;
    if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } else if (period === 'quarterly') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      label = `Q${q + 1} ${now.getFullYear()}`;
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      label = `${now.getFullYear()}`;
    }
    return { start, end: now, label };
  }, [period]);

  function inRange(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= periodInfo.start && d <= periodInfo.end;
  }

  // ── Financial metrics ──
  const paidInPeriod = useMemo(
    () => invoices.filter(i => i.status === 'paid' && inRange(i.paidDate || i.issueDate)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, periodInfo]
  );
  const totalRevenue = paidInPeriod.reduce((s, i) => s + calcInvoiceTotal(i.items, i.taxRate, i.discount), 0);

  const allPaid = invoices.filter(i => i.status === 'paid');
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const totalOutstanding = outstanding.reduce((s, i) => s + calcInvoiceTotal(i.items, i.taxRate, i.discount), 0);
  const overdue = invoices.filter(i => i.status === 'overdue');
  const totalOverdue = overdue.reduce((s, i) => s + calcInvoiceTotal(i.items, i.taxRate, i.discount), 0);

  const avgInvoiceValue = paidInPeriod.length > 0 ? totalRevenue / paidInPeriod.length : 0;

  const paidWithDates = paidInPeriod.filter(i => i.issueDate && i.paidDate);
  const avgDaysToPay = paidWithDates.length === 0 ? 0 : Math.round(
    paidWithDates.reduce((s, i) => s + Math.max(0, (new Date(i.paidDate) - new Date(i.issueDate)) / 86400000), 0) / paidWithDates.length
  );

  // 12-month revenue trend
  const revenueTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }).map((_, idx) => {
      const i = 11 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = allPaid.filter(inv => {
        const pd = new Date(inv.paidDate || inv.issueDate || inv.createdAt);
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
      }).reduce((s, inv) => s + calcInvoiceTotal(inv.items, inv.taxRate, inv.discount), 0);
      return { label: d.toLocaleString('en-US', { month: 'short' }), total };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);
  const maxRevenue = Math.max(...revenueTrend.map(m => m.total), 1);

  // Top revenue clients (period)
  const topClients = useMemo(() => {
    const map = new Map();
    paidInPeriod.forEach(inv => {
      const total = calcInvoiceTotal(inv.items, inv.taxRate, inv.discount);
      map.set(inv.clientId, (map.get(inv.clientId) || 0) + total);
    });
    return Array.from(map.entries())
      .map(([clientId, revenue]) => {
        const c = clients.find(x => x.id === clientId);
        return { id: clientId, company: c?.company || '—', industry: c?.industry || '', revenue };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [paidInPeriod, clients]);

  // ── Sales / Pipeline ──
  const stageBreakdown = STAGE_DEFS.map(stage => {
    const stageProjects = projects.filter(p => p.stage === stage.key);
    return {
      ...stage,
      count: stageProjects.length,
      value: stageProjects.reduce((s, p) => s + (p.budget || 0), 0),
    };
  });
  const maxStageValue = Math.max(...stageBreakdown.map(b => b.value), 1);
  const pipelineValue = projects
    .filter(p => p.stage !== 'completed' && p.stage !== 'on-hold')
    .reduce((s, p) => s + (p.budget || 0), 0);
  const activeProjectCount = projects.filter(p => p.stage === 'active').length;

  const sentSows = sows.filter(p => ['sent', 'accepted', 'declined'].includes(p.status));
  const acceptedSows = sows.filter(p => p.status === 'accepted');
  const declinedSows = sows.filter(p => p.status === 'declined');
  const decided = acceptedSows.length + declinedSows.length;
  const winRate = decided === 0 ? 0 : Math.round((acceptedSows.length / decided) * 100);
  const acceptedValue = acceptedSows.reduce((s, p) => s + calcSowTotal(p.packages), 0);
  const pendingSows = sows.filter(p => p.status === 'sent');
  const pendingValue = pendingSows.reduce((s, p) => s + calcSowTotal(p.packages), 0);

  const completedInPeriod = projects.filter(p =>
    p.stage === 'completed' && inRange(p.completedDate || p.updatedAt || p.createdAt)
  );

  // ── Application portfolio ──
  const appByStatus = APP_STATUS_DEFS.map(def => ({
    ...def,
    count: applications.filter(a => a.status === def.key).length,
  }));
  const totalApps = applications.length || 1;

  const appsByMrr = applications.map(app => {
    const linked = recurringExpenses.filter(e => e.applicationId === app.id && e.status === 'active');
    const mrr = (app.monthlyCost || 0) + linked.reduce((sum, e) => {
      if (e.frequency === 'monthly') return sum + (e.amount || 0);
      if (e.frequency === 'yearly')  return sum + (e.amount || 0) / 12;
      return sum;
    }, 0);
    const client = clients.find(c => c.id === app.clientId);
    return { ...app, mrr, clientName: client?.company || '' };
  }).filter(a => a.mrr > 0).sort((a, b) => b.mrr - a.mrr);
  const totalMRR = appsByMrr.reduce((sum, a) => sum + a.mrr, 0);

  // ── Support / Operations ──
  const openTickets = tickets.filter(t =>
    t.status === 'open' || t.status === 'in_progress' || t.status === 'in-progress'
  );
  const resolvedInPeriod = tickets.filter(t =>
    (t.status === 'resolved' || t.status === 'closed') && inRange(t.resolvedAt || t.closedAt || t.createdAt)
  );
  const ticketsByPriority = ['urgent', 'high', 'normal', 'low'].map(p => ({
    priority: p,
    count: openTickets.filter(t => (t.priority || 'normal') === p).length,
    color: PRIORITY_COLORS[p],
  }));
  const maxPriorityCount = Math.max(...ticketsByPriority.map(p => p.count), 1);

  const openMarkupPins = annotationPins.filter(p => p.status === 'open');
  const resolvedMarkupPinsInPeriod = annotationPins.filter(p =>
    p.status === 'resolved' && inRange(p.resolvedAt || p.createdAt)
  );

  // Recurring expenses summary
  const activeRecurring = recurringExpenses.filter(e => e.status === 'active');
  const monthlyExpense = activeRecurring.reduce((sum, e) => {
    if (e.frequency === 'monthly') return sum + (e.amount || 0);
    if (e.frequency === 'yearly')  return sum + (e.amount || 0) / 12;
    return sum;
  }, 0);

  // ── Print ──
  const generatedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="report">
      {/* Screen-only header. Hidden in print via @media print. */}
      <div className="report-header">
        <div>
          <h2 className="report-header__title">Business Report</h2>
          <p className="report-header__sub">
            {s.companyName || 'Your Company'} · {periodInfo.label}
          </p>
        </div>
        <div className="report-header__actions">
          <div className="report-period">
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button
                key={p}
                className={`filter-chip ${period === p ? 'filter-chip--active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn--primary" onClick={() => window.print()}>
            Print Report
          </button>
        </div>
      </div>

      {/* Print-only cover page. Display: none on screen, block when printing. */}
      <div className="report-cover">
        <h1>{s.companyName || 'Business Report'}</h1>
        <h2>Business Report</h2>
        <p className="report-cover__period">{periodInfo.label}</p>
        <p className="report-cover__meta">Generated {generatedOn}</p>
      </div>

      {/* ═══ Section 1 — Executive Summary ═══ */}
      <section className="report-section">
        <h3 className="report-section__title">Executive Summary</h3>
        <div className="report-kpis">
          <ReportKpi
            label="Revenue (Period)"
            value={fmtCompact(totalRevenue)}
            sub={`${paidInPeriod.length} paid invoice${paidInPeriod.length === 1 ? '' : 's'}`}
            color="#10b981"
          />
          <ReportKpi
            label="Outstanding"
            value={fmtCompact(totalOutstanding)}
            sub={overdue.length > 0 ? `${fmtCompact(totalOverdue)} overdue` : `${outstanding.length} sent`}
            color={overdue.length > 0 ? '#ef4444' : '#f59e0b'}
          />
          <ReportKpi
            label="Active Projects"
            value={activeProjectCount}
            sub={`${fmtCompact(pipelineValue)} in pipeline`}
            color="#3b82f6"
          />
          <ReportKpi
            label="Monthly Recurring"
            value={fmtCompact(totalMRR)}
            sub={`${appsByMrr.length} app${appsByMrr.length === 1 ? '' : 's'}`}
            color="#14b8a6"
          />
        </div>
      </section>

      {/* ═══ Section 2 — Financial Performance ═══ */}
      <section className="report-section">
        <h3 className="report-section__title">Financial Performance</h3>
        <div className="report-grid report-grid--2">
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Revenue Trend</h3>
              <span className="dash__card-badge">Last 12 Months</span>
            </div>
            <div className="dash__bar-chart">
              {revenueTrend.map((m, i) => (
                <div key={i} className="dash__bar-col">
                  <span className="dash__bar-value">
                    {m.total > 0 ? fmtCompact(m.total) : ''}
                  </span>
                  <div className="dash__bar-track">
                    <div
                      className="dash__bar-fill"
                      style={{ height: `${(m.total / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="dash__bar-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Top Clients (Period)</h3>
            </div>
            <div className="report-list">
              {topClients.length === 0 ? (
                <div className="dash__chart-empty">No paid invoices in this period</div>
              ) : (
                topClients.map((c, i) => (
                  <div key={c.id} className="report-list__row">
                    <span className="report-list__rank">{i + 1}</span>
                    <div className="report-list__info">
                      <span className="report-list__title">{c.company}</span>
                      {c.industry && <span className="report-list__sub">{c.industry}</span>}
                    </div>
                    <span className="report-list__value">{fmtCompact(c.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cash flow row — small KPI strip */}
        <div className="report-mini-kpis">
          <MiniStat label="Avg Invoice Value" value={fmtCompact(avgInvoiceValue)} />
          <MiniStat label="Avg Days to Pay" value={`${avgDaysToPay} days`} />
          <MiniStat label="Total Invoiced" value={fmtCompact(totalRevenue + totalOutstanding)} />
          <MiniStat label="Overdue Amount" value={fmtCompact(totalOverdue)} tone={totalOverdue > 0 ? 'danger' : 'default'} />
        </div>
      </section>

      {/* ═══ Section 3 — Sales Pipeline ═══ */}
      <section className="report-section">
        <h3 className="report-section__title">Sales Pipeline</h3>
        <div className="report-grid report-grid--2">
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Projects by Stage</h3>
              <span className="dash__card-badge">{projects.length} total</span>
            </div>
            <div className="dash__h-bars">
              {stageBreakdown.map(b => (
                <div key={b.key} className="dash__h-bar-row">
                  <span className="dash__h-bar-label">
                    <span className="dash__h-bar-dot" style={{ background: b.color }} />
                    {b.label}
                  </span>
                  <div className="dash__h-bar-track">
                    <div
                      className="dash__h-bar-fill"
                      style={{
                        width: `${(b.value / maxStageValue) * 100}%`,
                        background: b.color,
                      }}
                    />
                  </div>
                  <span className="dash__h-bar-value">{fmtCompact(b.value)}</span>
                  <span className="dash__h-bar-count">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Proposal Funnel</h3>
              <span className="dash__card-badge">{sows.length} total</span>
            </div>
            <div className="report-funnel">
              <FunnelRow label="Sent" count={sentSows.length} value={null} color="#9ca3af" />
              <FunnelRow label="Pending" count={pendingSows.length} value={pendingValue} color="#f59e0b" />
              <FunnelRow label="Accepted" count={acceptedSows.length} value={acceptedValue} color="#10b981" />
              <FunnelRow label="Declined" count={declinedSows.length} value={null} color="#ef4444" />
              <div className="report-funnel__rate">
                <span>Win rate</span>
                <strong>{winRate}%</strong>
                <span className="report-funnel__rate-detail">
                  {decided === 0 ? 'no decisions yet' : `${acceptedSows.length} of ${decided} decided`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="dash__card" style={{ marginTop: 16 }}>
          <div className="dash__card-header">
            <h3>Completed Projects ({periodInfo.label})</h3>
            <span className="dash__card-badge">{completedInPeriod.length}</span>
          </div>
          {completedInPeriod.length === 0 ? (
            <div className="dash__chart-empty">No projects completed in this period</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Deadline</th>
                  <th style={{ textAlign: 'right' }}>Budget</th>
                </tr>
              </thead>
              <tbody>
                {completedInPeriod.map(p => {
                  const client = clients.find(c => c.id === p.clientId);
                  return (
                    <tr key={p.id}>
                      <td className="data-table__bold">{p.title}</td>
                      <td>{client ? client.company : '—'}</td>
                      <td className="data-table__muted">{p.deadline || '—'}</td>
                      <td className="data-table__mono" style={{ textAlign: 'right' }}>
                        {fmtExact(p.budget || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ═══ Section 4 — Application Portfolio ═══ */}
      <section className="report-section">
        <h3 className="report-section__title">Application Portfolio</h3>
        <div className="report-grid report-grid--2">
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Apps by Status</h3>
              <span className="dash__card-badge">{applications.length} total</span>
            </div>
            <div className="dash__h-bars">
              {appByStatus.map(s => (
                <div key={s.key} className="dash__h-bar-row">
                  <span className="dash__h-bar-label">
                    <span className="dash__h-bar-dot" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <div className="dash__h-bar-track">
                    <div
                      className="dash__h-bar-fill"
                      style={{
                        width: `${(s.count / totalApps) * 100}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                  <span className="dash__h-bar-count">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Apps by Monthly Recurring</h3>
              <span className="dash__card-badge">{fmtCompact(totalMRR)}/mo</span>
            </div>
            <div className="report-list">
              {appsByMrr.length === 0 ? (
                <div className="dash__chart-empty">No applications with recurring revenue</div>
              ) : (
                appsByMrr.slice(0, 8).map((app, i) => (
                  <div key={app.id} className="report-list__row">
                    <span className="report-list__rank">{i + 1}</span>
                    <div className="report-list__info">
                      <span className="report-list__title">{app.name}</span>
                      <span className="report-list__sub">{app.clientName}</span>
                    </div>
                    <span className="report-list__value">{fmtCompact(app.mrr)}/mo</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 5 — Support & Operations ═══ */}
      <section className="report-section">
        <h3 className="report-section__title">Support & Operations</h3>
        <div className="report-mini-kpis">
          <MiniStat label="Open Tickets" value={openTickets.length} tone={openTickets.length > 0 ? 'warning' : 'default'} />
          <MiniStat label="Resolved (Period)" value={resolvedInPeriod.length} tone="success" />
          <MiniStat label="Open Markup Pins" value={openMarkupPins.length} tone={openMarkupPins.length > 0 ? 'brand' : 'default'} />
          <MiniStat label="Resolved Pins (Period)" value={resolvedMarkupPinsInPeriod.length} tone="success" />
          <MiniStat label="Recurring Expenses" value={fmtCompact(monthlyExpense) + '/mo'} />
          <MiniStat label="Active Recurring" value={activeRecurring.length} />
        </div>

        <div className="dash__card" style={{ marginTop: 16 }}>
          <div className="dash__card-header">
            <h3>Open Tickets by Priority</h3>
            <span className="dash__card-badge">{openTickets.length} open</span>
          </div>
          {openTickets.length === 0 ? (
            <div className="dash__chart-empty">No open tickets</div>
          ) : (
            <div className="dash__h-bars">
              {ticketsByPriority.map(t => (
                <div key={t.priority} className="dash__h-bar-row">
                  <span className="dash__h-bar-label">
                    <span className="dash__h-bar-dot" style={{ background: t.color }} />
                    {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                  </span>
                  <div className="dash__h-bar-track">
                    <div
                      className="dash__h-bar-fill"
                      style={{
                        width: `${(t.count / maxPriorityCount) * 100}%`,
                        background: t.color,
                      }}
                    />
                  </div>
                  <span className="dash__h-bar-count">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ Print footer ═══ */}
      <footer className="report-footer">
        <span>{s.companyName || 'Clad Forge'}</span>
        <span>Generated {generatedOn}</span>
      </footer>
    </div>
  );
}

// Styled the same way as the dashboard KPI cards (centered, color-tinted)
// so the reports view feels like a natural extension. Uses .dash__kpi
// classes from App.css; the inline --card-color drives the tint, accent,
// and value text color.
function ReportKpi({ label, value, sub, color }) {
  return (
    <div className="dash__kpi" style={{ '--card-color': color }}>
      <span className="dash__kpi-label">{label}</span>
      <span className="dash__kpi-value">{value}</span>
      <span className="dash__kpi-sub">{sub}</span>
    </div>
  );
}

// Smaller stat cells used for cash-flow and operations summary strips.
// Tone biases the value color: brand orange, success green, warning
// amber, danger red, or default ink.
function MiniStat({ label, value, tone = 'default' }) {
  const toneColor = {
    brand:   'var(--brand)',
    success: '#10b981',
    warning: '#f59e0b',
    danger:  '#ef4444',
    default: 'var(--ink)',
  }[tone];
  return (
    <div className="report-ministat">
      <span className="report-ministat__label">{label}</span>
      <span className="report-ministat__value" style={{ color: toneColor }}>{value}</span>
    </div>
  );
}

// One row in the proposal funnel — count + optional dollar value, with
// a colored dot tying it to a stage in the flow.
function FunnelRow({ label, count, value, color }) {
  return (
    <div className="report-funnel__row">
      <span className="report-funnel__dot" style={{ background: color }} />
      <span className="report-funnel__label">{label}</span>
      <span className="report-funnel__count">{count}</span>
      {value != null && value > 0 && (
        <span className="report-funnel__value">{fmtCompact(value)}</span>
      )}
    </div>
  );
}
