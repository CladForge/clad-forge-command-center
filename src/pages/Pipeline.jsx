import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateId } from '../data/initialData';

const STAGES = [
  { id: 'lead', label: 'Lead', color: '#666' },
  { id: 'proposal', label: 'Proposal', color: '#7c3aed' },
  { id: 'active', label: 'Active', color: '#ff8c00' },
  { id: 'review', label: 'Review', color: '#5ac8fa' },
  { id: 'completed', label: 'Completed', color: '#34c759' },
];

const emptyProject = {
  projectNumber: '', title: '', clientId: '', stage: 'lead', budget: 0,
  deadline: '', description: '',
  scopeOfWork: '', deliverables: [], updates: [], proposalId: '',
};

function generateProjectNumber(projects) {
  const maxNum = (projects || []).reduce((max, p) => {
    const n = parseInt(p.projectNumber, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return String(maxNum + 1).padStart(4, '0');
}

export default function Pipeline({ projects, setProjects, clients, sows = [], setSOWs }) {
  const navigate = useNavigate();

  // Pending proposals (sent but not accepted/declined) to show in the Proposal column
  // Show draft, ready, sent, and accepted proposals in the Proposal column
  const pendingProposals = sows.filter(s => ['draft', 'ready', 'sent', 'accepted'].includes(s.status));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [dragId, setDragId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  function handleDragStart(e, projectId) {
    setDragId(projectId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, stageId) {
    e.preventDefault();
    setDragOverStage(stageId);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  function handleDrop(e, stageId) {
    e.preventDefault();
    if (dragId) {
      setProjects(prev => prev.map(p =>
        p.id === dragId ? { ...p, stage: stageId } : p
      ));
    }
    setDragId(null);
    setDragOverStage(null);
  }

  function moveProject(projectId, direction) {
    const stageIds = STAGES.map(s => s.id);
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const currentIndex = stageIds.indexOf(p.stage);
      const newIndex = currentIndex + direction;
      if (newIndex < 0 || newIndex >= stageIds.length) return p;
      return { ...p, stage: stageIds[newIndex] };
    }));
  }

  function handleAdd() {
    if (!form.title.trim()) return;
    setProjects(prev => [...prev, {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString().split('T')[0],
    }]);
    setForm(emptyProject);
    setShowModal(false);
  }

  function handleDelete(id) {
    const p = projects.find(pr => pr.id === id);
    if (!window.confirm(`Delete project "${p?.title || 'this project'}"? This cannot be undone.`)) return;
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  function handleCreateProjectFromProposal(proposal) {
    // Check if project already exists for this proposal
    const exists = projects.some(p => p.proposalId === proposal.id || (p.title === proposal.projectTitle && p.clientId === proposal.clientId));
    if (exists) {
      alert('A project already exists for this proposal.');
      return;
    }

    const total = (proposal.packages || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0) || proposal.budget || 0;
    const packageNames = (proposal.packages || []).map(pkg => pkg.name).filter(Boolean);
    const description = [
      proposal.description,
      packageNames.length > 0 ? '\n\nPackages:\n' + packageNames.map((d, i) => `${i + 1}. ${d}`).join('\n') : '',
    ].filter(Boolean).join('');

    const newProject = {
      id: generateId(),
      projectNumber: generateProjectNumber(projects),
      title: proposal.projectTitle || 'Untitled Project',
      clientId: proposal.clientId || '',
      stage: 'active',
      budget: total,
      deadline: proposal.timeline?.endDate || '',
      description,
      proposalId: proposal.id,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setProjects(prev => [...prev, newProject]);

    // Update proposal status to project-created
    if (setSOWs) {
      setSOWs(prev => prev.map(s => s.id === proposal.id ? { ...s, status: 'project-created' } : s));
    }
  }

  return (
    <div className="pipeline page--fill">
      {/* Header */}
      <div className="pipeline__header">
        <div className="pipeline__summary">
          {STAGES.map(stage => {
            const projectCount = projects.filter(p => p.stage === stage.id).length;
            const proposalCount = stage.id === 'proposal' ? pendingProposals.length : 0;
            const total = projectCount + proposalCount;
            return (
              <div key={stage.id} className="pipeline__summary-item">
                <span className="pipeline__summary-dot" style={{ background: stage.color }} />
                <span className="pipeline__summary-label">{stage.label}</span>
                <span className="pipeline__summary-count">{total}</span>
              </div>
            );
          })}
        </div>
        <button className="btn btn--primary" onClick={() => { setForm({ ...emptyProject, projectNumber: generateProjectNumber(projects) }); setShowModal(true); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Kanban Board */}
      <div className="pipeline__board">
        {STAGES.map(stage => {
          const stageProjects = projects.filter(p => p.stage === stage.id);
          return (
            <div
              key={stage.id}
              className={`pipeline__column ${dragOverStage === stage.id ? 'pipeline__column--drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div className="pipeline__column-header">
                <div className="pipeline__column-title">
                  <span className="pipeline__column-dot" style={{ background: stage.color }} />
                  <h3>{stage.label}</h3>
                </div>
                <span className="pipeline__column-count">
                  {stageProjects.length + (stage.id === 'proposal' ? pendingProposals.length : 0)}
                </span>
              </div>
              <div className="pipeline__column-body">
                {/* Pending proposals shown in the Proposal column */}
                {stage.id === 'proposal' && pendingProposals.map((prop, i) => {
                  const client = clients.find(c => c.id === prop.clientId);
                  const total = (prop.packages || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0) || prop.budget || 0;
                  return (
                    <div key={`prop-${prop.id}`} className="pipeline__card pipeline__card--proposal" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="pipeline__card-header">
                        <h4 style={{ cursor: 'pointer' }} onClick={() => navigate('/proposals')} title="View proposal">
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--purple)', marginRight: 6, fontWeight: 500 }}>
                            {prop.proposalNumber || 'PROP'}
                          </span>
                          {prop.projectTitle}
                        </h4>
                      </div>
                      {client && <span className="pipeline__card-client">{client.company}</span>}
                      <div className="pipeline__card-meta">
                        {total > 0 && <span className="pipeline__card-budget">${total.toLocaleString()}</span>}
                        <span className={`status-pill status-pill--${prop.status}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                          {{ draft: 'Draft', ready: 'Ready', sent: 'Sent', accepted: 'Accepted' }[prop.status] || prop.status}
                        </span>
                      </div>
                      {prop.description && (
                        <p className="pipeline__card-desc">{prop.description}</p>
                      )}
                      <div className="pipeline__card-actions">
                        <button className="pipeline__card-move" onClick={() => navigate('/proposals')} style={{ flex: 1 }}>
                          View
                        </button>
                        {prop.status === 'accepted' && (
                          <button
                            className="pipeline__card-move"
                            style={{ flex: 1, color: 'var(--success)', borderColor: 'var(--success-bg)', fontWeight: 600 }}
                            onClick={() => handleCreateProjectFromProposal(prop)}
                          >
                            + Create Project
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {stageProjects.map((project, i) => {
                  const client = clients.find(c => c.id === project.clientId);
                  const stageIndex = STAGES.findIndex(s => s.id === stage.id);
                  return (
                    <div
                      key={project.id}
                      className={`pipeline__card ${dragId === project.id ? 'pipeline__card--dragging' : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, project.id)}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="pipeline__card-header">
                        <h4 style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)} title="Open project dashboard">
                          {project.projectNumber && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--brand)', marginRight: 6, fontWeight: 500 }}>
                              {project.projectNumber}
                            </span>
                          )}
                          {project.title}
                        </h4>
                        <button
                          className="pipeline__card-delete"
                          onClick={() => handleDelete(project.id)}
                          title="Delete project"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      {client && (
                        <span className="pipeline__card-client">{client.company}</span>
                      )}
                      {project.description && (
                        <p className="pipeline__card-desc">{project.description}</p>
                      )}
                      <div className="pipeline__card-meta">
                        {project.budget > 0 && (
                          <span className="pipeline__card-budget">${project.budget.toLocaleString()}</span>
                        )}
                        {project.deadline && (
                          <span className="pipeline__card-deadline">{project.deadline}</span>
                        )}
                      </div>
                      <div className="pipeline__card-actions">
                        <button
                          className="pipeline__card-move"
                          disabled={stageIndex === 0}
                          onClick={() => moveProject(project.id, -1)}
                          title="Move left"
                        >
                          ←
                        </button>
                        <button
                          className="pipeline__card-move"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          title="Open project dashboard"
                          style={{ flex: 1 }}
                        >
                          Open
                        </button>
                        <button
                          className="pipeline__card-move"
                          disabled={stageIndex === STAGES.length - 1}
                          onClick={() => moveProject(project.id, 1)}
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  );
                })}
                {stageProjects.length === 0 && !(stage.id === 'proposal' && pendingProposals.length > 0) && (
                  <div className="pipeline__empty">
                    <span>No projects</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>New Project</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Project Number</label>
                  <input
                    type="text"
                    value={form.projectNumber}
                    onChange={e => setForm(f => ({ ...f, projectNumber: e.target.value }))}
                    placeholder="0001"
                  />
                </div>
                <div className="form-group">
                  <label>Project Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Website Redesign"
                  />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Stage</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget ($)</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
                <div className="form-group form-group--full">
                  <label>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the project..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleAdd}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
