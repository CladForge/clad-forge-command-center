import { useNavigate } from 'react-router-dom';
import AppCard from '../../components/AppCard';

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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
          <div className="app-card-grid" style={{ padding: 16 }}>
            {applications.map(app => {
              const tiedExpenses = recurringExpenses.filter(e => e.applicationId === app.id);
              const monthlyTotal = (app.monthlyCost || 0) + tiedExpenses
                .filter(e => e.status === 'active' && e.frequency === 'monthly')
                .reduce((s, e) => s + (e.amount || 0), 0);
              return (
                <AppCard
                  key={app.id}
                  app={app}
                  monthlyCost={monthlyTotal}
                  onClick={() => navigate(`/portal/applications/${app.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
