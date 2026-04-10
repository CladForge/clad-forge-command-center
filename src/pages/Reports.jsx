import { useState } from 'react';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const revenueData = [12,18,15,24,22,31,28,35,32,42,38,48];
const projectData = [3,4,3,5,6,7,5,8,6,9,7,10];
const clientData = [2,2,3,3,4,4,5,5,6,6,7,8];

export default function Reports() {
  const [period, setPeriod] = useState('yearly');
  const maxRev = Math.max(...revenueData);

  return (
    <div className="reports">
      <div className="reports-header">
        <div>
          <h2 className="reports-title">Reports & Analytics</h2>
          <p className="reports-subtitle">Track performance across your business</p>
        </div>
        <div className="reports-period">
          {['monthly','quarterly','yearly'].map(p => (
            <button key={p} className={`filter-chip ${period === p ? 'filter-chip--active' : ''}`} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-kpis">
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--brand)' }} /><div className="stat-card__label">Total Revenue</div><div className="stat-card__value">$346,000</div><div className="stat-card__sub" style={{ color: 'var(--success)' }}>+24% YoY</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--info)' }} /><div className="stat-card__label">Projects Completed</div><div className="stat-card__value">47</div><div className="stat-card__sub" style={{ color: 'var(--success)' }}>+12 this quarter</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--success)' }} /><div className="stat-card__label">Active Clients</div><div className="stat-card__value">18</div><div className="stat-card__sub" style={{ color: 'var(--success)' }}>+3 new</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--purple)' }} /><div className="stat-card__label">Avg. Project Value</div><div className="stat-card__value">$24,500</div><div className="stat-card__sub" style={{ color: 'var(--success)' }}>+$3.2k vs last year</div></div>
      </div>

      <div className="reports-grid">
        <div className="panel">
          <div className="panel__header"><h3>Revenue Trend</h3></div>
          <div className="panel__body" style={{ padding: '20px' }}>
            <div className="reports-chart">
              {revenueData.map((v, i) => (
                <div key={i} className="reports-bar-col">
                  <div className="reports-bar-val">${v}k</div>
                  <div className="reports-bar" style={{ height: `${(v / maxRev) * 100}%` }} />
                  <div className="reports-bar-label">{months[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header"><h3>Project Breakdown</h3></div>
          <div className="panel__body" style={{ padding: '20px' }}>
            <div className="reports-breakdown">
              <div className="reports-breakdown-item"><span className="reports-dot" style={{ background: 'var(--brand)' }} /><span>Website Design</span><strong>38%</strong></div>
              <div className="reports-breakdown-bar"><div style={{ width: '38%', background: 'var(--brand)' }} /></div>
              <div className="reports-breakdown-item"><span className="reports-dot" style={{ background: 'var(--purple)' }} /><span>Custom Tools</span><strong>42%</strong></div>
              <div className="reports-breakdown-bar"><div style={{ width: '42%', background: 'var(--purple)' }} /></div>
              <div className="reports-breakdown-item"><span className="reports-dot" style={{ background: 'var(--info)' }} /><span>AI Integration</span><strong>20%</strong></div>
              <div className="reports-breakdown-bar"><div style={{ width: '20%', background: 'var(--info)' }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel__header"><h3>Recent Completed Projects</h3></div>
        <div className="panel__body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead><tr><th>Project</th><th>Client</th><th>Type</th><th>Value</th><th>Duration</th><th>Rating</th></tr></thead>
            <tbody>
              <tr><td className="data-table__bold">Safety Reporting App</td><td>Atlas Industries</td><td>Custom Tool</td><td className="data-table__mono">$36,000</td><td>8 weeks</td><td>⭐ 5.0</td></tr>
              <tr><td className="data-table__bold">Corporate Website</td><td>Pine & Oak</td><td>Website</td><td className="data-table__mono">$12,000</td><td>4 weeks</td><td>⭐ 4.8</td></tr>
              <tr><td className="data-table__bold">Inventory Chatbot</td><td>Nexus Co.</td><td>AI Integration</td><td className="data-table__mono">$18,500</td><td>6 weeks</td><td>⭐ 4.9</td></tr>
              <tr><td className="data-table__bold">Fleet Tracker v1</td><td>Meridian Co.</td><td>Custom Tool</td><td className="data-table__mono">$28,000</td><td>10 weeks</td><td>⭐ 5.0</td></tr>
              <tr><td className="data-table__bold">E-Commerce Platform</td><td>BrightPath</td><td>Website</td><td className="data-table__mono">$22,000</td><td>7 weeks</td><td>⭐ 4.7</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
