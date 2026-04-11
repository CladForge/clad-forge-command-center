import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialSettings } from '../data/initialData';
import OnboardingReview from '../components/OnboardingReview';

export default function Dashboard({ clients, projects, sows, activities, settings: rawSettings, invoices = [], timeEntries = [], setClients, addNotification }) {
  const settings = { ...initialSettings, ...rawSettings };
  const navigate = useNavigate();

  // ═══ COMPUTED METRICS ═══

  const activeClients = clients.filter(c => c.status === 'active').length;
  const prospects = clients.filter(c => c.status === 'prospect').length;
  const activeProjects = projects.filter(p => p.stage === 'active').length;
  const totalProjectBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);

  const invoiceTotal = (items, taxRate = 0, discount = 0) => {
    const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
    return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
  };

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalRevenue = paidInvoices.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);

  const proposalTotal = (pkgs) => (pkgs || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0);
  const pendingProposals = sows.filter(s => s.status === 'sent');
  const pendingValue = pendingProposals.reduce((s, p) => s + proposalTotal(p.packages), 0);

  const totalHoursLogged = timeEntries.reduce((s, e) => s + (e.hours || 0) + (e.minutes || 0) / 60, 0);

  // ═══ CHART DATA ═══

  // Pipeline by stage
  const pipelineStages = [
    { id: 'lead', label: 'Lead', color: '#9ca3af' },
    { id: 'proposal', label: 'Proposal', color: '#d97706' },
    { id: 'active', label: 'Active', color: '#b45309' },
    { id: 'review', label: 'Review', color: '#2563eb' },
    { id: 'completed', label: 'Completed', color: '#059669' },
  ];

  const pipelineData = pipelineStages.map(stage => ({
    ...stage,
    count: projects.filter(p => p.stage === stage.id).length,
    value: projects.filter(p => p.stage === stage.id).reduce((s, p) => s + (p.budget || 0), 0),
  }));

  const maxPipelineValue = Math.max(...pipelineData.map(d => d.value), 1);

  // Invoice status donut
  const invoiceStatusData = [
    { label: 'Paid', count: paidInvoices.length, color: '#059669' },
    { label: 'Sent', count: invoices.filter(i => i.status === 'sent').length, color: '#2563eb' },
    { label: 'Overdue', count: overdueInvoices.length, color: '#dc2626' },
    { label: 'Draft', count: invoices.filter(i => i.status === 'draft').length, color: '#9ca3af' },
  ].filter(d => d.count > 0);

  const invoiceDonutTotal = invoiceStatusData.reduce((s, d) => s + d.count, 0) || 1;

  // Monthly revenue (last 6 months from invoices)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const revenue = paidInvoices
        .filter(inv => inv.paidDate?.startsWith(key) || inv.issueDate?.startsWith(key))
        .reduce((s, inv) => s + invoiceTotal(inv.items, inv.taxRate, inv.discount), 0);
      months.push({ key, label, revenue });
    }
    return months;
  }, [paidInvoices]);

  const maxMonthlyRev = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  // Top clients by value
  const clientBudget = (c) => projects.filter(p => p.clientId === c.id).reduce((s, p) => s + (p.budget || 0), 0);
  const topClients = [...clients]
    .sort((a, b) => clientBudget(b) - clientBudget(a))
    .slice(0, 5);

  // Upcoming deadlines
  const upcomingDeadlines = projects
    .filter(p => p.deadline && p.stage !== 'completed' && p.stage !== 'on-hold')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  // Industry breakdown
  const industryData = Object.entries(
    clients.reduce((acc, c) => { acc[c.industry] = (acc[c.industry] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxIndustry = Math.max(...industryData.map(d => d[1]), 1);

  return (
    <div className="dash">
      {/* ═══ WELCOME BANNER ═══ */}
      <div className="dash__welcome">
        <div className="dash__welcome-content">
          <h2>Welcome back, {settings.ownerName?.split(' ')[0] || 'there'}</h2>
          <p>Here's how {settings.companyName || 'your business'} is performing</p>
        </div>
        <div className="dash__welcome-actions">
          <button className="btn btn--primary" onClick={() => navigate('/proposals')}>+ New Proposal</button>
          <button className="btn btn--secondary" onClick={() => navigate('/invoices')}>+ New Invoice</button>
        </div>
      </div>

      {/* ═══ PENDING ONBOARDING ═══ */}
      {setClients && <OnboardingReview setClients={setClients} addNotification={addNotification} />}

      {/* ═══ KPI CARDS ═══ */}
      <div className="dash__kpis">
        <KpiCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub={`${paidInvoices.length} paid invoices`} color="var(--success)" onClick={() => navigate('/invoices')} />
        <KpiCard label="Outstanding" value={formatCurrency(totalOutstanding)} sub={totalOverdue > 0 ? `${formatCurrency(totalOverdue)} overdue` : `${outstandingInvoices.length} invoices`} color={totalOverdue > 0 ? 'var(--danger)' : 'var(--warning)'} onClick={() => navigate('/invoices')} />
        <KpiCard label="Active Clients" value={activeClients} sub={`${prospects} prospects`} color="var(--brand)" onClick={() => navigate('/clients')} />
        <KpiCard label="Active Projects" value={activeProjects} sub={formatCurrency(totalProjectBudget) + ' total budget'} color="var(--info)" onClick={() => navigate('/pipeline')} />
        <KpiCard label="Proposals" value={sows.length} sub={`${formatCurrency(pendingValue)} pending`} color="var(--purple)" onClick={() => navigate('/proposals')} />
        <KpiCard label="Hours Logged" value={totalHoursLogged.toFixed(1)} sub={`${timeEntries.length} entries`} color="var(--brand-mid)" onClick={() => navigate('/time')} />
      </div>

      {/* ═══ CHARTS ROW 1 ═══ */}
      <div className="dash__row">
        {/* Monthly Revenue Bar Chart */}
        <div className="dash__card dash__card--2">
          <div className="dash__card-header">
            <h3>Monthly Revenue</h3>
            <span className="dash__card-badge">Last 6 Months</span>
          </div>
          <div className="dash__bar-chart">
            {monthlyRevenue.map(month => (
              <div key={month.key} className="dash__bar-col">
                <span className="dash__bar-value">{month.revenue > 0 ? formatCompact(month.revenue) : ''}</span>
                <div className="dash__bar-track">
                  <div
                    className="dash__bar-fill"
                    style={{ height: `${(month.revenue / maxMonthlyRev) * 100}%` }}
                  />
                </div>
                <span className="dash__bar-label">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Status Donut */}
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Invoice Status</h3>
            <span className="dash__card-badge">{invoices.length} total</span>
          </div>
          {invoices.length > 0 ? (
            <div className="dash__donut-wrap">
              <div
                className="dash__donut"
                style={{
                  background: `conic-gradient(${buildConicGradient(invoiceStatusData, invoiceDonutTotal)})`,
                }}
              >
                <div className="dash__donut-center">
                  <span className="dash__donut-value">{invoices.length}</span>
                  <span className="dash__donut-label">Invoices</span>
                </div>
              </div>
              <div className="dash__donut-legend">
                {invoiceStatusData.map(d => (
                  <div key={d.label} className="dash__legend-item">
                    <span className="dash__legend-dot" style={{ background: d.color }} />
                    <span className="dash__legend-text">{d.label}</span>
                    <span className="dash__legend-count">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="dash__chart-empty">No invoices yet</div>
          )}
        </div>
      </div>

      {/* ═══ CHARTS ROW 2 ═══ */}
      <div className="dash__row">
        {/* Pipeline Value */}
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Pipeline Value</h3>
            <span className="dash__card-badge">{formatCurrency(totalProjectBudget)}</span>
          </div>
          <div className="dash__h-bars">
            {pipelineData.map(stage => (
              <div key={stage.id} className="dash__h-bar-row">
                <span className="dash__h-bar-label">
                  <span className="dash__h-bar-dot" style={{ background: stage.color }} />
                  {stage.label}
                </span>
                <div className="dash__h-bar-track">
                  <div className="dash__h-bar-fill" style={{ width: `${(stage.value / maxPipelineValue) * 100}%`, background: stage.color }} />
                </div>
                <span className="dash__h-bar-value">{formatCompact(stage.value)}</span>
                <span className="dash__h-bar-count">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Top Clients</h3>
            <button className="dash__card-link" onClick={() => navigate('/clients')}>View all →</button>
          </div>
          <div className="dash__mini-table">
            {topClients.map((client, i) => (
              <div key={client.id} className="dash__mini-row">
                <span className="dash__mini-rank">{i + 1}</span>
                <div className="dash__mini-info">
                  <span className="dash__mini-name">{client.company}</span>
                  <span className="dash__mini-sub">{client.industry}</span>
                </div>
                <span className="dash__mini-value">{formatCurrency(clientBudget(client))}</span>
              </div>
            ))}
            {topClients.length === 0 && <div className="dash__chart-empty">No clients yet</div>}
          </div>
        </div>
      </div>

      {/* ═══ ROW 3 ═══ */}
      <div className="dash__row dash__row--3">
        {/* Industry Breakdown */}
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>By Industry</h3>
          </div>
          <div className="dash__h-bars">
            {industryData.map(([industry, count]) => (
              <div key={industry} className="dash__h-bar-row">
                <span className="dash__h-bar-label dash__h-bar-label--wide">{industry}</span>
                <div className="dash__h-bar-track">
                  <div className="dash__h-bar-fill" style={{ width: `${(count / maxIndustry) * 100}%`, background: 'var(--brand)' }} />
                </div>
                <span className="dash__h-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Upcoming Deadlines</h3>
            <button className="dash__card-link" onClick={() => navigate('/pipeline')}>Pipeline →</button>
          </div>
          <div className="dash__deadlines">
            {upcomingDeadlines.map(project => {
              const days = Math.ceil((new Date(project.deadline) - new Date()) / 86400000);
              const client = clients.find(c => c.id === project.clientId);
              return (
                <div key={project.id} className="dash__deadline-row">
                  <div className="dash__deadline-info">
                    <span className="dash__deadline-title">{project.title}</span>
                    <span className="dash__deadline-client">{client?.company || ''}</span>
                  </div>
                  <span className={`dash__deadline-days ${days <= 7 ? 'dash__deadline-days--warn' : ''} ${days <= 0 ? 'dash__deadline-days--overdue' : ''}`}>
                    {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                  </span>
                </div>
              );
            })}
            {upcomingDeadlines.length === 0 && <div className="dash__chart-empty">No upcoming deadlines</div>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="dash__activity">
            {activities.slice(0, 8).map((act, i) => (
              <div key={act.id || i} className="dash__act-row">
                <span className={`dash__act-dot dash__act-dot--${act.type}`} />
                <div className="dash__act-content">
                  <span className="dash__act-msg">{act.message}</span>
                  <span className="dash__act-time">{act.time || ''}</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && <div className="dash__chart-empty">No activity yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ HELPER COMPONENTS ═══ */

function KpiCard({ label, value, sub, color, onClick }) {
  return (
    <div className="dash__kpi" onClick={onClick}>
      <div className="dash__kpi-accent" style={{ background: color }} />
      <span className="dash__kpi-label">{label}</span>
      <span className="dash__kpi-value">{value}</span>
      <span className="dash__kpi-sub">{sub}</span>
    </div>
  );
}

function formatCurrency(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCompact(n) {
  if (n === 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '$' + n.toLocaleString();
}

function buildConicGradient(data, total) {
  let cumulative = 0;
  return data.map((d) => {
    const start = (cumulative / total) * 360;
    cumulative += d.count;
    const end = (cumulative / total) * 360;
    return `${d.color} ${start}deg ${end}deg`;
  }).join(', ');
}
