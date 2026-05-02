import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

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

export default function PortalProjectDetail({ projects, invoices, milestones = [], reloadMilestones }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const project = projects.find(p => p.id === id);

  // Decision-form state — only one milestone is "in decision mode" at a time
  const [decidingId, setDecidingId] = useState(null);
  const [decisionType, setDecisionType] = useState(null); // 'approved' | 'changes_requested'
  const [decisionComment, setDecisionComment] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  function startDecision(mid, type) {
    setDecidingId(mid);
    setDecisionType(type);
    setDecisionComment('');
    setDecisionError('');
  }
  function cancelDecision() {
    setDecidingId(null);
    setDecisionType(null);
    setDecisionComment('');
    setDecisionError('');
  }

  async function submitDecision() {
    if (decisionType === 'changes_requested' && !decisionComment.trim()) {
      setDecisionError('Please share what needs to change so we know what to revise.');
      return;
    }
    setSubmittingDecision(true);
    setDecisionError('');
    const { data, error } = await supabase.rpc('client_decide_milestone', {
      p_milestone_id: decidingId,
      p_decision: decisionType,
      p_comment: decisionComment.trim(),
    });
    if (error || data === false) {
      setDecisionError(error?.message || 'Could not submit decision. Please try again.');
      setSubmittingDecision(false);
      return;
    }
    if (reloadMilestones) await reloadMilestones();
    cancelDecision();
    setSubmittingDecision(false);
  }

  if (!project) {
    return (
      <div className="portal-page">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/projects')}>
          ← Back to projects
        </button>
        <div className="empty-state">
          <h3>Project not found</h3>
          <p>This project may have been removed or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const projectInvoices = invoices.filter(i => i.projectId === id);
  const invoiced = projectInvoices
    .filter(i => i.status !== 'cancelled')
    .reduce((s, inv) =>
      s + (inv.items || []).reduce((ss, item) => ss + (item.quantity || 0) * (item.rate || 0), 0), 0);
  const remaining = (project.budget || 0) - invoiced;

  return (
    <div className="portal-page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/projects')}>
        ← Back to projects
      </button>

      <div className="portal-page__header" style={{ marginTop: 16 }}>
        <div>
          <h1>{project.title}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <span className={`status-badge status-badge--${project.stage}`}>
              {STAGE_LABELS[project.stage] || project.stage}
            </span>
            {project.deadline && (
              <span className="portal-page__subtitle">Due {project.deadline}</span>
            )}
          </div>
        </div>
      </div>

      {project.description && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Overview</h3></div>
          <div style={{ padding: '16px 22px', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--ink)' }}>
            {project.description}
          </div>
        </div>
      )}

      {project.scopeOfWork && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Scope of Work</h3></div>
          <div style={{ padding: '16px 22px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--slate)', whiteSpace: 'pre-line' }}>
            {project.scopeOfWork}
          </div>
        </div>
      )}

      {/* Milestones — client decisions */}
      {(() => {
        const projectMilestones = (milestones || []).filter(m => m.projectId === id);
        if (projectMilestones.length === 0) return null;
        return (
          <div className="panel" style={{ marginTop: 20 }}>
            <div className="panel__header">
              <h3>Milestones ({projectMilestones.length})</h3>
            </div>
            <div style={{ padding: '8px 22px 16px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projectMilestones.map(m => {
                  const isDeciding = decidingId === m.id;
                  return (
                    <li key={m.id} className="milestone-row">
                      <div className="milestone-row__main">
                        <div className="milestone-row__head">
                          <span className="milestone-row__title">{m.title}</span>
                          <span className={`status-pill status-pill--ms-${m.status}`}>
                            {m.status === 'pending' && 'Awaiting Your Review'}
                            {m.status === 'approved' && '✓ Approved'}
                            {m.status === 'changes_requested' && 'Changes Requested'}
                          </span>
                        </div>
                        {m.description && <p className="milestone-row__desc">{m.description}</p>}
                        {m.targetDate && (
                          <p className="milestone-row__meta">Target: {m.targetDate}</p>
                        )}
                        {m.clientComment && m.status !== 'pending' && (
                          <div className="milestone-row__comment">
                            <span className="milestone-row__comment-label">Your comment:</span>
                            <p>{m.clientComment}</p>
                          </div>
                        )}

                        {/* Decision UI — only for pending milestones */}
                        {m.status === 'pending' && !isDeciding && (
                          <div className="milestone-row__decision-actions">
                            <button
                              className="btn btn--primary btn--sm"
                              onClick={() => startDecision(m.id, 'approved')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => startDecision(m.id, 'changes_requested')}
                            >
                              Request Changes
                            </button>
                          </div>
                        )}

                        {m.status === 'pending' && isDeciding && (
                          <div className="milestone-row__decision-form">
                            <label>
                              {decisionType === 'approved'
                                ? 'Add a comment (optional):'
                                : 'What would you like changed?'}
                            </label>
                            <textarea
                              value={decisionComment}
                              onChange={e => setDecisionComment(e.target.value)}
                              placeholder={
                                decisionType === 'approved'
                                  ? 'Looks great! / Ship it / etc.'
                                  : 'Describe what needs to change...'
                              }
                              rows={3}
                              autoFocus
                              disabled={submittingDecision}
                            />
                            {decisionError && <div className="modal__error">{decisionError}</div>}
                            <div className="milestone-row__decision-buttons">
                              <button
                                className="btn btn--ghost btn--sm"
                                onClick={cancelDecision}
                                disabled={submittingDecision}
                              >
                                Cancel
                              </button>
                              <button
                                className={`btn btn--sm ${decisionType === 'approved' ? 'btn--primary' : 'btn--secondary'}`}
                                onClick={submitDecision}
                                disabled={submittingDecision}
                              >
                                {submittingDecision
                                  ? 'Submitting…'
                                  : decisionType === 'approved'
                                    ? '✓ Confirm Approval'
                                    : 'Send Change Request'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })()}

      {project.deliverables && project.deliverables.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Deliverables</h3></div>
          <div style={{ padding: '8px 0' }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {project.deliverables.map((d, i) => (
                <li key={i} style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: d.completed ? 'var(--success)' : 'var(--slate-light)' }}>
                    {d.completed ? '✓' : '○'}
                  </span>
                  <span style={{ flex: 1 }}>{d.title || d.name || (typeof d === 'string' ? d : 'Deliverable')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {project.budget > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Budget</h3></div>
          <div style={{ padding: '16px 22px', display: 'flex', gap: 32 }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total budget</span>
              <span className="data-table__mono" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{fmtCurrency(project.budget)}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoiced</span>
              <span className="data-table__mono" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{fmtCurrency(invoiced)}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Remaining</span>
              <span className="data-table__mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: remaining < 0 ? 'var(--danger)' : 'var(--success)' }}>{fmtCurrency(Math.max(remaining, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {projectInvoices.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Invoices</h3></div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {projectInvoices.map(inv => {
                const total = (inv.items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
                return (
                  <tr key={inv.id}>
                    <td>
                      <span className="data-table__mono data-table__bold">{inv.invoiceNumber}</span>
                      <span className="data-table__sub">{inv.issueDate}</span>
                    </td>
                    <td><span className={`status-pill status-pill--${inv.status}`}>{inv.status}</span></td>
                    <td className="data-table__mono" style={{ textAlign: 'right' }}>{fmtCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
