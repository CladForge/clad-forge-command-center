import { useNavigate } from 'react-router-dom';

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const TYPE_LABELS = {
  'website': 'Website',
  'web-app': 'Web App',
  'mobile-app': 'Mobile App',
  'api': 'API',
  'other': 'Other',
};

const STATUS_LABELS = {
  planning: 'Planning',
  'in-development': 'In Development',
  staging: 'Staging',
  live: 'Live',
  maintenance: 'Maintenance',
  archived: 'Archived',
};

export default function PortalApplications({ applications, recurringExpenses }) {
  const navigate = useNavigate();

  const totalMonthly = applications.reduce((s, a) => {
    const direct = a.monthlyCost || 0;
    const tied = recurringExpenses
      .filter(e => e.applicationId === a.id && e.status === 'active' && e.frequency === 'monthly')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return s + direct + tied;
  }, 0);

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Applications</h1>
          <p className="portal-page__subtitle">
            Live products and sites we maintain for you. Click into any application
            to see its status, billing, and notes.
          </p>
        </div>
      </div>

      {applications.length > 0 && (
        <div className="portal-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
            <span className="stat-card__label">Active Applications</span>
            <span className="stat-card__value">{applications.filter(a => a.status === 'live' || a.status === 'maintenance').length}</span>
            <span className="stat-card__sub">{applications.length} total</span>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
            <span className="stat-card__label">Total Monthly Cost</span>
            <span className="stat-card__value">{fmtCurrency(totalMonthly)}</span>
            <span className="stat-card__sub">across all applications</span>
          </div>
        </div>
      )}

      <div className="panel">
        {applications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📦</span>
            <h3>No applications yet</h3>
            <p>Once we launch a site or app for you, it&apos;ll appear here for status and billing.</p>
          </div>
        ) : (
          <div className="portal-projects">
            {applications.map(app => {
              const tiedExpenses = recurringExpenses.filter(e => e.applicationId === app.id);
              return (
                <div
                  key={app.id}
                  className="portal-project-card"
                  onClick={() => navigate(`/portal/applications/${app.id}`)}
                >
                  <div className="portal-project-card__header">
                    <div>
                      <h3 className="portal-project-card__title">{app.name}</h3>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                        <span className={`status-pill status-pill--app-${app.status}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--slate-light)' }}>
                          {TYPE_LABELS[app.type]}
                        </span>
                      </div>
                    </div>
                    {(app.monthlyCost > 0 || tiedExpenses.length > 0) && (
                      <div className="portal-project-card__budget">
                        <span className="portal-project-card__budget-label">Monthly</span>
                        <span className="portal-project-card__budget-value">
                          {fmtCurrency((app.monthlyCost || 0) + tiedExpenses
                            .filter(e => e.status === 'active' && e.frequency === 'monthly')
                            .reduce((s, e) => s + (e.amount || 0), 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  {app.description && <p className="portal-project-card__desc">{app.description}</p>}

                  <div className="portal-project-card__footer">
                    {app.url && (
                      <a
                        href={app.url.startsWith('http') ? app.url : `https://${app.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--brand)' }}
                      >
                        {app.url.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                      </a>
                    )}
                    {app.launchedAt && <span>Launched {app.launchedAt}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
