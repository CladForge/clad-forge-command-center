import { useNavigate, useParams } from 'react-router-dom';

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

export default function PortalProjectDetail({ projects, invoices, documents }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const project = projects.find(p => p.id === id);

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
  const projectDocs = documents.filter(d => d.projectId === id);
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

      {projectDocs.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Documents</h3></div>
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Type</th></tr>
            </thead>
            <tbody>
              {projectDocs.map(d => (
                <tr key={d.id}>
                  <td>
                    {d.fileUrl ? (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">{d.name}</a>
                    ) : d.name}
                  </td>
                  <td className="data-table__muted">{d.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
