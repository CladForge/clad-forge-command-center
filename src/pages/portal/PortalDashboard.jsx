import { useNavigate } from 'react-router-dom';

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcInvoiceTotal(items, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}

export default function PortalDashboard({ activeClient, projects, invoices, sows, applications = [] }) {
  const navigate = useNavigate();

  const activeProjects = projects.filter(p => ['lead', 'proposal', 'active', 'review'].includes(p.stage));
  const completedProjects = projects.filter(p => p.stage === 'completed');
  const liveApplications = applications.filter(a => a.status === 'live' || a.status === 'maintenance');

  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + calcInvoiceTotal(i.items, i.taxRate, i.discount), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + (i.paidAmount || calcInvoiceTotal(i.items, i.taxRate, i.discount)), 0);

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const pendingProposals = sows.filter(s => s.status === 'sent' || s.status === 'pending').length;

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Welcome{activeClient?.company ? `, ${activeClient.company}` : ''}</h1>
          <p className="portal-page__subtitle">
            Here's everything happening on your projects with Clad Forge.
          </p>
        </div>
      </div>

      <div className="portal-stats">
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
          <span className="stat-card__label">Active Projects</span>
          <span className="stat-card__value">{activeProjects.length}</span>
          <span className="stat-card__sub">
            {completedProjects.length > 0 ? `${completedProjects.length} completed` : 'No completed yet'}
          </span>
        </div>
        {applications.length > 0 && (
          <div className="stat-card" onClick={() => navigate('/portal/applications')} style={{ cursor: 'pointer' }}>
            <div className="stat-card__accent" style={{ background: 'var(--secondary)' }} />
            <span className="stat-card__label">Applications</span>
            <span className="stat-card__value">{liveApplications.length}</span>
            <span className="stat-card__sub">
              {applications.length === liveApplications.length
                ? 'all live'
                : `${applications.length - liveApplications.length} in dev/staging`}
            </span>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--warning)' }} />
          <span className="stat-card__label">Outstanding</span>
          <span className="stat-card__value">{fmtCurrency(outstanding)}</span>
          <span className="stat-card__sub">
            {overdueCount > 0 ? `${overdueCount} overdue` : invoices.filter(i => i.status === 'sent').length + ' to pay'}
          </span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <span className="stat-card__label">Total Paid</span>
          <span className="stat-card__value">{fmtCurrency(totalPaid)}</span>
          <span className="stat-card__sub">
            {invoices.filter(i => i.status === 'paid').length} invoices
          </span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <span className="stat-card__label">Open Proposals</span>
          <span className="stat-card__value">{pendingProposals}</span>
          <span className="stat-card__sub">{pendingProposals > 0 ? 'Awaiting your review' : 'None pending'}</span>
        </div>
      </div>

      <div className="portal-grid">
        <div className="panel">
          <div className="panel__header">
            <h3>Active Projects</h3>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/projects')}>
              View all →
            </button>
          </div>
          <div className="portal-grid__body">
            {activeProjects.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">📋</span>
                <h3>No active projects</h3>
                <p>Your active projects will appear here once work begins.</p>
              </div>
            ) : (
              <div className="portal-list">
                {activeProjects.slice(0, 4).map(p => (
                  <div key={p.id} className="portal-list__item" onClick={() => navigate(`/portal/projects/${p.id}`)}>
                    <div className="portal-list__main">
                      <span className="portal-list__title">{p.title}</span>
                      <span className="portal-list__sub">
                        Stage: <strong>{p.stage}</strong>
                        {p.deadline && ` · Due ${p.deadline}`}
                      </span>
                    </div>
                    <div className="portal-list__meta">
                      <span className="data-table__mono">{fmtCurrency(p.budget)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <h3>Recent Invoices</h3>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/invoices')}>
              View all →
            </button>
          </div>
          <div className="portal-grid__body">
            {invoices.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🧾</span>
                <h3>No invoices yet</h3>
                <p>Invoices for your projects will appear here.</p>
              </div>
            ) : (
              <div className="portal-list">
                {invoices.slice(0, 4).map(inv => {
                  const total = calcInvoiceTotal(inv.items, inv.taxRate, inv.discount);
                  return (
                    <div key={inv.id} className="portal-list__item" onClick={() => navigate('/portal/invoices')}>
                      <div className="portal-list__main">
                        <span className="portal-list__title">{inv.invoiceNumber}</span>
                        <span className="portal-list__sub">
                          {inv.projectTitle || '—'} · Due {inv.dueDate || 'on receipt'}
                        </span>
                      </div>
                      <div className="portal-list__meta">
                        <span className={`status-pill status-pill--${inv.status}`}>{inv.status}</span>
                        <span className="data-table__mono">{fmtCurrency(total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
