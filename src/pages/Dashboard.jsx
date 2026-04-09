import { useEffect, useState } from 'react';

export default function Dashboard({ clients, projects, sows, activities }) {
  const activeClients = clients.filter(c => c.status === 'active').length;
  const activeProjects = projects.filter(p => p.stage === 'active').length;
  const totalRevenue = clients.reduce((sum, c) => sum + c.value, 0);
  const pendingSOWs = sows.filter(s => s.status === 'draft').length;
  const completedProjects = projects.filter(p => p.stage === 'completed').length;
  const prospectCount = clients.filter(c => c.status === 'prospect').length;

  const stats = [
    { label: 'Active Clients', value: activeClients, icon: 'clients', color: 'var(--amber)', prefix: '' },
    { label: 'Active Projects', value: activeProjects, icon: 'projects', color: 'var(--info)', prefix: '' },
    { label: 'Total Revenue', value: totalRevenue, icon: 'revenue', color: 'var(--success)', prefix: '$' },
    { label: 'Pending SOWs', value: pendingSOWs, icon: 'sow', color: 'var(--warning)', prefix: '' },
  ];

  const stageDistribution = [
    { label: 'Lead', count: projects.filter(p => p.stage === 'lead').length, color: 'var(--text-muted)' },
    { label: 'Proposal', count: projects.filter(p => p.stage === 'proposal').length, color: 'var(--warning)' },
    { label: 'Active', count: projects.filter(p => p.stage === 'active').length, color: 'var(--amber)' },
    { label: 'Review', count: projects.filter(p => p.stage === 'review').length, color: 'var(--info)' },
    { label: 'Completed', count: completedProjects, color: 'var(--success)' },
  ];

  const totalProjects = projects.length || 1;

  return (
    <div className="dashboard">
      {/* Stats Grid */}
      <div className="dashboard__stats">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} delay={i * 100} />
        ))}
      </div>

      <div className="dashboard__grid">
        {/* Project Pipeline Overview */}
        <div className="dashboard__card dashboard__card--wide" style={{ animationDelay: '200ms' }}>
          <div className="dashboard__card-header">
            <h3>Pipeline Overview</h3>
            <span className="dashboard__card-badge">{projects.length} total</span>
          </div>
          <div className="dashboard__pipeline-bars">
            {stageDistribution.map((stage) => (
              <div key={stage.label} className="dashboard__pipeline-row">
                <span className="dashboard__pipeline-label">{stage.label}</span>
                <div className="dashboard__pipeline-track">
                  <div
                    className="dashboard__pipeline-fill"
                    style={{
                      width: `${(stage.count / totalProjects) * 100}%`,
                      background: stage.color,
                      animation: 'progressFill 1s var(--ease-out) forwards',
                    }}
                  />
                </div>
                <span className="dashboard__pipeline-count" style={{ color: stage.color }}>{stage.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="dashboard__card" style={{ animationDelay: '300ms' }}>
          <div className="dashboard__card-header">
            <h3>Quick Metrics</h3>
          </div>
          <div className="dashboard__metrics">
            <div className="dashboard__metric">
              <span className="dashboard__metric-value">{completedProjects}</span>
              <span className="dashboard__metric-label">Completed Projects</span>
            </div>
            <div className="dashboard__metric">
              <span className="dashboard__metric-value">{prospectCount}</span>
              <span className="dashboard__metric-label">Active Prospects</span>
            </div>
            <div className="dashboard__metric">
              <span className="dashboard__metric-value">
                {projects.filter(p => p.stage === 'review').length}
              </span>
              <span className="dashboard__metric-label">In Review</span>
            </div>
            <div className="dashboard__metric">
              <span className="dashboard__metric-value">
                {clients.filter(c => c.status === 'on-hold').length}
              </span>
              <span className="dashboard__metric-label">On Hold</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard__card dashboard__card--wide" style={{ animationDelay: '400ms' }}>
          <div className="dashboard__card-header">
            <h3>Recent Activity</h3>
            <span className="dashboard__card-badge">Live</span>
          </div>
          <div className="dashboard__activity">
            {activities.map((activity, i) => (
              <div
                key={activity.id}
                className="dashboard__activity-item"
                style={{ animationDelay: `${500 + i * 80}ms` }}
              >
                <div className={`dashboard__activity-icon dashboard__activity-icon--${activity.type}`}>
                  <ActivityIcon type={activity.icon} />
                </div>
                <div className="dashboard__activity-content">
                  <p className="dashboard__activity-message">{activity.message}</p>
                  <span className="dashboard__activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="dashboard__card" style={{ animationDelay: '350ms' }}>
          <div className="dashboard__card-header">
            <h3>By Industry</h3>
          </div>
          <div className="dashboard__industries">
            {Object.entries(
              clients.reduce((acc, c) => {
                acc[c.industry] = (acc[c.industry] || 0) + 1;
                return acc;
              }, {})
            ).map(([industry, count]) => (
              <div key={industry} className="dashboard__industry-row">
                <span className="dashboard__industry-name">{industry}</span>
                <span className="dashboard__industry-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat, delay }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const increment = stat.value / steps;
    let current = 0;
    let step = 0;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        step++;
        current = Math.min(Math.round(increment * step), stat.value);
        setDisplayValue(current);
        if (step >= steps) clearInterval(interval);
      }, duration / steps);
    }, delay);

    return () => clearTimeout(timer);
  }, [stat.value, delay]);

  const formatted = stat.prefix === '$'
    ? `$${displayValue.toLocaleString()}`
    : displayValue.toString();

  return (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-card__glow" style={{ background: stat.color }} />
      <div className="stat-card__content">
        <span className="stat-card__label">{stat.label}</span>
        <span className="stat-card__value" style={{ color: stat.color }}>
          {formatted}
        </span>
      </div>
      <div className="stat-card__accent" style={{ background: stat.color }} />
    </div>
  );
}

function ActivityIcon({ type }) {
  const paths = {
    'user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'check': <><polyline points="20 6 9 17 4 12" /></>,
    'pause': <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
    'play': <><polygon points="5 3 19 12 5 21 5 3" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[type] || paths['check']}
    </svg>
  );
}
