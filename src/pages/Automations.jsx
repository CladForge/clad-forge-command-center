import { useState } from 'react';

const automations = [
  { id: 1, name: 'Client Onboarding', trigger: 'New client added', actions: ['Send welcome email', 'Create project workspace', 'Schedule kickoff call', 'Assign team members'], status: 'active', runs: 24, icon: '📧' },
  { id: 2, name: 'Invoice Follow-Up', trigger: 'Invoice overdue', actions: ['Day 3: Gentle reminder', 'Day 7: Second notice', 'Day 14: Escalation email', 'Day 30: Final notice'], status: 'active', runs: 18, icon: '💰' },
  { id: 3, name: 'Weekly Report', trigger: 'Every Monday 8am', actions: ['Gather KPI data', 'AI analysis & summary', 'Build branded PDF', 'Email to team'], status: 'active', runs: 42, icon: '📊' },
  { id: 4, name: 'Project Milestone Alert', trigger: 'Milestone reached', actions: ['Notify client', 'Update pipeline stage', 'Log activity', 'Generate invoice if final'], status: 'active', runs: 31, icon: '🎯' },
  { id: 5, name: 'Deadline Warning', trigger: '3 days before deadline', actions: ['Slack notification', 'Email project lead', 'Update dashboard status'], status: 'paused', runs: 15, icon: '⏰' },
  { id: 6, name: 'Client Health Check', trigger: 'No contact for 14 days', actions: ['Flag in dashboard', 'Draft follow-up email', 'Notify account manager'], status: 'paused', runs: 8, icon: '❤️' },
];

export default function Automations() {
  const [workflows, setWorkflows] = useState(automations);
  const [expanded, setExpanded] = useState(null);

  function toggleStatus(id) {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: w.status === 'active' ? 'paused' : 'active' } : w));
  }

  return (
    <div className="automations">
      <div className="automations-header">
        <div>
          <h2 className="automations-title">Automations</h2>
          <p className="automations-subtitle">Workflows that run automatically so you don't have to</p>
        </div>
        <button className="btn btn--primary">+ New Automation</button>
      </div>

      <div className="automations-stats">
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--success)' }} /><div className="stat-card__label">Active</div><div className="stat-card__value">{workflows.filter(w => w.status === 'active').length}</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--warning)' }} /><div className="stat-card__label">Paused</div><div className="stat-card__value">{workflows.filter(w => w.status === 'paused').length}</div></div>
        <div className="stat-card"><div className="stat-card__accent" style={{ background: 'var(--brand)' }} /><div className="stat-card__label">Total Runs</div><div className="stat-card__value">{workflows.reduce((sum, w) => sum + w.runs, 0)}</div></div>
      </div>

      <div className="automations-list">
        {workflows.map(w => (
          <div key={w.id} className={`automation-card ${expanded === w.id ? 'automation-card--expanded' : ''}`}>
            <div className="automation-card-header" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
              <span className="automation-icon">{w.icon}</span>
              <div className="automation-info">
                <h4 className="automation-name">{w.name}</h4>
                <p className="automation-trigger">Trigger: {w.trigger}</p>
              </div>
              <span className="automation-runs">{w.runs} runs</span>
              <span className={`badge ${w.status === 'active' ? 'badge--success' : 'badge--warning'}`}>
                {w.status}
              </span>
              <button
                className={`btn btn--sm ${w.status === 'active' ? 'btn--ghost' : 'btn--primary'}`}
                onClick={e => { e.stopPropagation(); toggleStatus(w.id); }}
              >
                {w.status === 'active' ? 'Pause' : 'Activate'}
              </button>
              <span className="automation-chevron">{expanded === w.id ? '▲' : '▼'}</span>
            </div>
            {expanded === w.id && (
              <div className="automation-steps">
                {w.actions.map((action, i) => (
                  <div key={i} className="automation-step">
                    <div className="automation-step-num">{i + 1}</div>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
