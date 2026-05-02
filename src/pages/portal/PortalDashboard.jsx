import { useNavigate } from 'react-router-dom';
import { isBillingActive, monthlyEquivalent } from '../../lib/billing';

// Portal dashboard mirrors the admin Dashboard's design language: same
// `.dash` shell, same KPI card system (.dash__kpis / .dash__kpi with the
// --card-color CSS variable), same `.dash__row` / `.dash__card` panels.
//
// Sections are tailored to what a client cares about:
//   - Welcome banner
//   - 5-card KPI strip (active projects, live apps, outstanding, paid, open proposals)
//   - Active Projects + Live Applications row
//   - Recent Invoices + Open Proposals row

const KPI_COLORS = {
  activeProjects: '#ff8c00', // brand
  liveApps:       '#10b981', // success
  outstanding:    '#f59e0b', // warning
  paidYTD:        '#3b82f6', // info
  openProposals:  '#8f89fa', // purple
};

function calcInvoiceTotal(items, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}

function fmtCurrency(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function proposalTotal(packages) {
  return (packages || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PortalDashboard({
  activeClient, projects = [], invoices = [], sows = [],
  applications = [], recurringExpenses = [],
}) {
  const navigate = useNavigate();
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  // ═══ KPI METRICS ═══
  const activeProjects = projects.filter(p => ['lead', 'proposal', 'active', 'review'].includes(p.stage));
  const completedProjects = projects.filter(p => p.stage === 'completed');

  const liveApplications = applications.filter(a => a.status === 'live' || a.status === 'maintenance');
  const inDevApplications = applications.filter(a => a.status === 'in-development' || a.status === 'staging' || a.status === 'planning');

  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + calcInvoiceTotal(i.items, i.taxRate, i.discount), 0);

  const paidThisYear = invoices.filter(i =>
    i.status === 'paid' && i.paidDate && new Date(i.paidDate) >= yearStart
  );
  const totalPaidYTD = paidThisYear.reduce((s, i) => s + (i.paidAmount || calcInvoiceTotal(i.items, i.taxRate, i.discount)), 0);

  const openProposals = sows.filter(s => s.status === 'sent' || s.status === 'pending');
  const openProposalValue = openProposals.reduce((s, p) => s + proposalTotal(p.packages), 0);

  // Recurring monthly cost (informational footer in the welcome banner)
  const activeRecurring = recurringExpenses.filter(isBillingActive);
  const monthlyRecurring = activeRecurring.reduce((s, e) => s + monthlyEquivalent(e.amount || 0, e.frequency), 0);

  // ═══ LIST DATA ═══
  // Active projects sorted by deadline (nearest first), nulls last
  const activeProjectRows = [...activeProjects]
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    })
    .slice(0, 5);

  // Live applications come first, then in-dev. Cap at 5 entries total.
  const appRows = [...liveApplications, ...inDevApplications].slice(0, 5);

  // Invoices we want surfaced: overdue first, then sent, then most recent paid
  const invoiceRows = [
    ...invoices.filter(i => i.status === 'overdue'),
    ...invoices.filter(i => i.status === 'sent'),
    ...invoices.filter(i => i.status === 'paid'),
  ].slice(0, 5);

  return (
    <div className="dash">
      {/* ═══ WELCOME BANNER ═══ */}
      <div className="dash__welcome">
        <div className="dash__welcome-content">
          <h2>Welcome{activeClient?.company ? `, ${activeClient.company}` : ''}!</h2>
          <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: '0.92rem' }}>
            Here&apos;s everything happening on your projects with Clad Forge.
            {monthlyRecurring > 0 && (
              <> You&apos;re currently on <strong style={{ color: 'var(--ink)' }}>{fmtCurrency(monthlyRecurring)}/mo</strong> in recurring services.</>
            )}
          </p>
        </div>
        <div className="dash__welcome-actions">
          {outstandingInvoices.length > 0 && (
            <button className="btn btn--primary" onClick={() => navigate('/portal/invoices')}>
              Pay Invoices
            </button>
          )}
          {openProposals.length > 0 && (
            <button className="btn btn--primary" onClick={() => navigate('/portal/proposals')}>
              Review Proposals
            </button>
          )}
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="dash__kpis" style={{ '--kpi-cols': 5 }}>
        <KpiCard
          label="Active Projects"
          value={activeProjects.length}
          sub={completedProjects.length > 0 ? `${completedProjects.length} completed` : 'No completed yet'}
          color={KPI_COLORS.activeProjects}
          onClick={() => navigate('/portal/projects')}
        />
        <KpiCard
          label="Live Apps"
          value={liveApplications.length}
          sub={inDevApplications.length > 0 ? `${inDevApplications.length} in dev` : `${applications.length} total`}
          color={KPI_COLORS.liveApps}
          onClick={() => navigate('/portal/applications')}
        />
        <KpiCard
          label="Outstanding"
          value={fmtCurrency(totalOutstanding)}
          sub={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : `${outstandingInvoices.length} to pay`}
          color={KPI_COLORS.outstanding}
          onClick={() => navigate('/portal/invoices')}
        />
        <KpiCard
          label="Paid YTD"
          value={fmtCurrency(totalPaidYTD)}
          sub={`${paidThisYear.length} invoice${paidThisYear.length === 1 ? '' : 's'}`}
          color={KPI_COLORS.paidYTD}
          onClick={() => navigate('/portal/invoices')}
        />
        <KpiCard
          label="Open Proposals"
          value={openProposals.length}
          sub={openProposalValue > 0 ? `${fmtCurrency(openProposalValue)} pending` : 'None pending'}
          color={KPI_COLORS.openProposals}
          onClick={() => navigate('/portal/proposals')}
        />
      </div>

      {/* ═══ ROW 1 — Active Projects + Live Applications ═══ */}
      <div className="dash__row dash__row--cols-2">
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Active Projects</h3>
            <button className="dash__card-link" onClick={() => navigate('/portal/projects')}>View all →</button>
          </div>
          {activeProjectRows.length === 0 ? (
            <div className="dash__chart-empty">No active projects yet</div>
          ) : (
            <div className="dash__deadlines">
              {activeProjectRows.map(p => {
                const days = p.deadline ? Math.ceil((new Date(p.deadline) - today) / 86400000) : null;
                return (
                  <div
                    key={p.id}
                    className="dash__deadline-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/portal/projects/${p.id}`)}
                  >
                    <div className="dash__deadline-info">
                      <span className="dash__deadline-title">{p.title || 'Untitled project'}</span>
                      <span className="dash__deadline-client">
                        Stage: {p.stage}{p.budget ? ` · ${fmtCurrency(p.budget)}` : ''}
                      </span>
                    </div>
                    {days != null ? (
                      <span className={`dash__deadline-days ${days <= 7 ? 'dash__deadline-days--warn' : ''} ${days <= 0 ? 'dash__deadline-days--overdue' : ''}`}>
                        {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    ) : (
                      <span className="dash__deadline-days" style={{ color: 'var(--slate-light)' }}>
                        No deadline
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Your Applications</h3>
            <button className="dash__card-link" onClick={() => navigate('/portal/applications')}>View all →</button>
          </div>
          {appRows.length === 0 ? (
            <div className="dash__chart-empty">No applications tracked yet</div>
          ) : (
            <div className="dash__app-health">
              {appRows.map(app => {
                const linkedExpenses = recurringExpenses.filter(e =>
                  e.applicationId === app.id && isBillingActive(e)
                );
                const monthlyContrib = (app.monthlyCost || 0) +
                  linkedExpenses.reduce((s, e) => s + monthlyEquivalent(e.amount || 0, e.frequency), 0);
                return (
                  <div
                    key={app.id}
                    className="dash__app-row"
                    onClick={() => navigate(`/portal/applications/${app.id}`)}
                  >
                    <div className="dash__app-info">
                      <span className="dash__app-name">{app.name}</span>
                      <span className="dash__app-client">{app.url || app.type || ''}</span>
                    </div>
                    <span className={`status-pill status-pill--app-${app.status}`}>
                      {app.status === 'in-development' ? 'Dev'
                        : app.status === 'maintenance' ? 'Maint'
                        : app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                    </span>
                    <span className="dash__app-mrr">
                      {monthlyContrib > 0 ? fmtCurrency(monthlyContrib) + '/mo' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROW 2 — Recent Invoices + Open Proposals ═══ */}
      <div className="dash__row dash__row--cols-2">
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Recent Invoices</h3>
            <button className="dash__card-link" onClick={() => navigate('/portal/invoices')}>View all →</button>
          </div>
          {invoiceRows.length === 0 ? (
            <div className="dash__chart-empty">No invoices yet</div>
          ) : (
            <div className="dash__overdue-list">
              {invoiceRows.map(inv => {
                const total = calcInvoiceTotal(inv.items, inv.taxRate, inv.discount);
                const due = inv.dueDate ? new Date(inv.dueDate) : null;
                const daysOverdue = due && inv.status !== 'paid'
                  ? Math.floor((today - due) / 86400000)
                  : null;
                return (
                  <div
                    key={inv.id}
                    className="dash__overdue-row"
                    onClick={() => navigate('/portal/invoices')}
                  >
                    <div className="dash__overdue-info">
                      <span className="dash__overdue-num">{inv.invoiceNumber || '—'}</span>
                      <span className="dash__overdue-client">
                        {inv.projectTitle || 'Invoice'}
                        {inv.dueDate && inv.status !== 'paid' ? ` · Due ${fmtDate(inv.dueDate)}` : ''}
                        {inv.status === 'paid' && inv.paidDate ? ` · Paid ${fmtDate(inv.paidDate)}` : ''}
                      </span>
                    </div>
                    <div className="dash__overdue-meta">
                      <span className="dash__overdue-amt">{fmtCurrency(total)}</span>
                      <span className={`status-pill status-pill--${inv.status}`}>
                        {daysOverdue != null && daysOverdue > 0 && inv.status === 'overdue'
                          ? `${daysOverdue}d late`
                          : inv.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Open Proposals</h3>
            <button className="dash__card-link" onClick={() => navigate('/portal/proposals')}>View all →</button>
          </div>
          {openProposals.length === 0 ? (
            <div className="dash__chart-empty">No proposals awaiting your review</div>
          ) : (
            <div className="dash__overdue-list">
              {openProposals.slice(0, 5).map(prop => {
                const total = proposalTotal(prop.packages);
                return (
                  <div
                    key={prop.id}
                    className="dash__overdue-row"
                    onClick={() => navigate('/portal/proposals')}
                  >
                    <div className="dash__overdue-info">
                      <span className="dash__overdue-num">
                        {prop.proposalNumber || prop.projectTitle || 'Proposal'}
                      </span>
                      <span className="dash__overdue-client">
                        {prop.projectTitle || ''}
                        {prop.validUntil ? ` · Valid until ${fmtDate(prop.validUntil)}` : ''}
                      </span>
                    </div>
                    <div className="dash__overdue-meta">
                      <span className="dash__overdue-amt">{fmtCurrency(total)}</span>
                      <span className={`status-pill status-pill--${prop.status}`}>
                        {prop.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ HELPER COMPONENT ═══ */

function KpiCard({ label, value, sub, color, onClick }) {
  return (
    <div className="dash__kpi" style={{ '--card-color': color }} onClick={onClick}>
      <span className="dash__kpi-label">{label}</span>
      <span className="dash__kpi-value">{value}</span>
      <span className="dash__kpi-sub">{sub}</span>
    </div>
  );
}
