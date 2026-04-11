import { useState, useMemo } from 'react';
import { initialSettings } from '../data/initialData';

const fmt = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcTotal(items, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}

export default function Reports({ clients, projects, sows, invoices, timeEntries, settings }) {
  const [period, setPeriod] = useState('yearly');
  const s = { ...initialSettings, ...settings };

  /* ── Period date range ── */
  const periodRange = useMemo(() => {
    const now = new Date();
    let start;
    if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarterly') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return { start, end: now };
  }, [period]);

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= periodRange.start && d <= periodRange.end;
  };

  /* ── KPI calculations ── */
  const paidInvoices = useMemo(
    () => (invoices || []).filter(i => i.status === 'paid' && inRange(i.paidDate || i.createdAt)),
    [invoices, periodRange]
  );
  const totalRevenue = useMemo(
    () => paidInvoices.reduce((s, i) => s + calcTotal(i.items, i.taxRate, i.discount), 0),
    [paidInvoices]
  );

  const completedProjects = useMemo(
    () => (projects || []).filter(p => p.stage === 'completed'),
    [projects]
  );
  const periodCompletedProjects = useMemo(
    () => completedProjects.filter(p => inRange(p.completedDate || p.updatedAt || p.createdAt)),
    [completedProjects, periodRange]
  );

  const activeClients = useMemo(
    () => (clients || []).filter(c => c.status === 'active'),
    [clients]
  );

  const avgProjectValue = useMemo(() => {
    const all = projects || [];
    if (all.length === 0) return 0;
    return all.reduce((s, p) => s + (p.budget || 0), 0) / all.length;
  }, [projects]);

  /* ── Revenue trend: last 12 months of paid invoices ── */
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('en-US', { month: 'short' }) });
    }
    const allPaid = (invoices || []).filter(i => i.status === 'paid');
    return months.map(m => {
      const total = allPaid
        .filter(inv => {
          const d = new Date(inv.paidDate || inv.createdAt);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((s, inv) => s + calcTotal(inv.items, inv.taxRate, inv.discount), 0);
      return { ...m, total };
    });
  }, [invoices]);

  const maxRev = Math.max(...revenueTrend.map(m => m.total), 1);

  /* ── Project breakdown by stage ── */
  const stageBreakdown = useMemo(() => {
    const stages = [
      { key: 'lead', label: 'Lead', color: '#9ca3af' },
      { key: 'proposal', label: 'Proposal', color: '#d97706' },
      { key: 'active', label: 'Active', color: '#b45309' },
      { key: 'review', label: 'Review', color: '#2563eb' },
      { key: 'completed', label: 'Completed', color: '#059669' },
    ];
    const all = projects || [];
    const total = all.length || 1;
    return stages.map(st => ({
      ...st,
      count: all.filter(p => p.stage === st.key).length,
      pct: Math.round((all.filter(p => p.stage === st.key).length / total) * 100),
    }));
  }, [projects]);

  /* ── Client lookup map ── */
  const clientMap = useMemo(() => {
    const map = {};
    (clients || []).forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  /* ── Time utilization ── */
  const timeStats = useMemo(() => {
    const entries = timeEntries || [];
    const totalHours = entries.reduce((s, e) => s + (e.hours || 0) + (e.minutes || 0) / 60, 0);
    const byProject = {};
    entries.forEach(e => {
      const pid = e.projectId || 'unassigned';
      byProject[pid] = (byProject[pid] || 0) + (e.hours || 0) + (e.minutes || 0) / 60;
    });
    return { totalHours, byProject };
  }, [timeEntries]);

  const projectMap = useMemo(() => {
    const map = {};
    (projects || []).forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  const maxTimeHours = Math.max(...Object.values(timeStats.byProject), 1);

  return (
    <div className="reports">
      <div className="reports-header">
        <div>
          <h2 className="reports-title">Reports & Analytics</h2>
          <p className="reports-subtitle">Track performance across your business</p>
        </div>
        <div className="reports-period">
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
      </div>

      {/* ── KPI Cards ── */}
      <div className="reports-kpis">
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
          <div className="stat-card__label">Total Revenue</div>
          <div className="stat-card__value">{fmt(totalRevenue)}</div>
          <div className="stat-card__sub">{paidInvoices.length} paid invoice{paidInvoices.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <div className="stat-card__label">Projects Completed</div>
          <div className="stat-card__value">{periodCompletedProjects.length}</div>
          <div className="stat-card__sub">{completedProjects.length} all time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <div className="stat-card__label">Active Clients</div>
          <div className="stat-card__value">{activeClients.length}</div>
          <div className="stat-card__sub">of {(clients || []).length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--purple)' }} />
          <div className="stat-card__label">Avg. Project Value</div>
          <div className="stat-card__value">{fmt(avgProjectValue)}</div>
          <div className="stat-card__sub">{(projects || []).length} project{(projects || []).length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="reports-grid">
        {/* Revenue Trend */}
        <div className="panel">
          <div className="panel__header"><h3>Revenue Trend</h3></div>
          <div className="panel__body" style={{ padding: '20px' }}>
            <div className="reports-chart">
              {revenueTrend.map((m, i) => (
                <div key={i} className="reports-bar-col">
                  <div className="reports-bar-val">
                    {m.total >= 1000 ? `$${Math.round(m.total / 1000)}k` : fmt(m.total)}
                  </div>
                  <div
                    className="reports-bar"
                    style={{ height: `${(m.total / maxRev) * 100}%` }}
                  />
                  <div className="reports-bar-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Breakdown by Stage */}
        <div className="panel">
          <div className="panel__header"><h3>Project Breakdown by Stage</h3></div>
          <div className="panel__body" style={{ padding: '20px' }}>
            <div className="reports-breakdown">
              {stageBreakdown.map(st => (
                <div key={st.key}>
                  <div className="reports-breakdown-item">
                    <span className="reports-dot" style={{ background: st.color }} />
                    <span>{st.label}</span>
                    <strong>{st.pct}%</strong>
                  </div>
                  <div className="reports-breakdown-bar">
                    <div style={{ width: `${st.pct}%`, background: st.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Completed Projects Table ── */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel__header"><h3>Completed Projects</h3></div>
        <div className="panel__body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Budget</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {completedProjects.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No completed projects yet</td></tr>
              ) : (
                completedProjects.map(p => {
                  const client = clientMap[p.clientId];
                  return (
                    <tr key={p.id}>
                      <td className="data-table__bold">{p.name}</td>
                      <td>{client ? (client.company || client.name) : 'Unknown'}</td>
                      <td className="data-table__mono">{fmt(p.budget || 0)}</td>
                      <td>{p.deadline || '--'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Time Utilization ── */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel__header"><h3>Time Utilization</h3></div>
        <div className="panel__body" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{timeStats.totalHours.toFixed(1)}h</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>total hours logged</span>
          </div>
          {Object.keys(timeStats.byProject).length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No time entries recorded yet</p>
          ) : (
            <div className="reports-breakdown">
              {Object.entries(timeStats.byProject)
                .sort((a, b) => b[1] - a[1])
                .map(([pid, hours]) => {
                  const proj = projectMap[pid];
                  return (
                    <div key={pid}>
                      <div className="reports-breakdown-item">
                        <span className="reports-dot" style={{ background: 'var(--brand)' }} />
                        <span>{proj ? proj.name : 'Unassigned'}</span>
                        <strong>{hours.toFixed(1)}h</strong>
                      </div>
                      <div className="reports-breakdown-bar">
                        <div style={{ width: `${(hours / maxTimeHours) * 100}%`, background: 'var(--brand)' }} />
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
