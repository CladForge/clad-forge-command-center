import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STAGE_LABELS = {
  lead: 'Lead',
  proposal: 'Proposal',
  active: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
  'on-hold': 'On Hold',
};

export default function PortalProjects({ projects, invoices }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? projects
    : filter === 'active'
      ? projects.filter(p => ['lead', 'proposal', 'active', 'review'].includes(p.stage))
      : projects.filter(p => p.stage === filter);

  const counts = {
    all: projects.length,
    active: projects.filter(p => ['lead', 'proposal', 'active', 'review'].includes(p.stage)).length,
    completed: projects.filter(p => p.stage === 'completed').length,
  };

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Projects</h1>
          <p className="portal-page__subtitle">All projects we've worked on together.</p>
        </div>
      </div>

      <div className="filter-chips" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${filter === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="filter-chip__count">{counts.all}</span>
        </button>
        <button className={`filter-chip ${filter === 'active' ? 'filter-chip--active' : ''}`} onClick={() => setFilter('active')}>
          Active <span className="filter-chip__count">{counts.active}</span>
        </button>
        <button className={`filter-chip ${filter === 'completed' ? 'filter-chip--active' : ''}`} onClick={() => setFilter('completed')}>
          Completed <span className="filter-chip__count">{counts.completed}</span>
        </button>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📋</span>
            <h3>No projects to show</h3>
            <p>{filter === 'all' ? 'You don\'t have any projects yet.' : 'No projects match this filter.'}</p>
          </div>
        ) : (
          <div className="portal-projects">
            {filtered.map(p => {
              const projectInvoices = invoices.filter(i => i.projectId === p.id && i.status !== 'cancelled');
              const invoiced = projectInvoices.reduce((s, inv) =>
                s + (inv.items || []).reduce((ss, item) => ss + (item.quantity || 0) * (item.rate || 0), 0), 0);
              const pct = p.budget > 0 ? Math.min(Math.round((invoiced / p.budget) * 100), 100) : 0;

              return (
                <div
                  key={p.id}
                  className="portal-project-card"
                  onClick={() => navigate(`/portal/projects/${p.id}`)}
                >
                  <div className="portal-project-card__header">
                    <div>
                      <h3 className="portal-project-card__title">{p.title}</h3>
                      <span className={`status-badge status-badge--${p.stage}`}>
                        {STAGE_LABELS[p.stage] || p.stage}
                      </span>
                    </div>
                    {p.budget > 0 && (
                      <div className="portal-project-card__budget">
                        <span className="portal-project-card__budget-label">Budget</span>
                        <span className="portal-project-card__budget-value">{fmtCurrency(p.budget)}</span>
                      </div>
                    )}
                  </div>

                  {p.description && (
                    <p className="portal-project-card__desc">{p.description}</p>
                  )}

                  {p.budget > 0 && (
                    <div className="portal-project-card__progress">
                      <div className="portal-project-card__bar">
                        <div className="portal-project-card__bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="portal-project-card__progress-text">
                        {fmtCurrency(invoiced)} invoiced · {pct}%
                      </span>
                    </div>
                  )}

                  <div className="portal-project-card__footer">
                    {p.deadline && <span>Due {p.deadline}</span>}
                    {projectInvoices.length > 0 && (
                      <span>{projectInvoices.length} invoice{projectInvoices.length !== 1 ? 's' : ''}</span>
                    )}
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
