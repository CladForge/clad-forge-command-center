import { useState } from 'react';
import { generateId } from '../data/initialData';

const STAGES = [
  { id: 'lead', label: 'Lead', color: '#666' },
  { id: 'proposal', label: 'Proposal', color: '#ffcc00' },
  { id: 'active', label: 'Active', color: '#ff8c00' },
  { id: 'review', label: 'Review', color: '#5ac8fa' },
  { id: 'completed', label: 'Completed', color: '#34c759' },
];

const emptyProject = {
  title: '', clientId: '', stage: 'lead', budget: 0,
  deadline: '', description: '',
};

export default function Pipeline({ projects, setProjects, clients }) {
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
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="pipeline page--fill">
      {/* Header */}
      <div className="pipeline__header">
        <div className="pipeline__summary">
          {STAGES.map(stage => {
            const count = projects.filter(p => p.stage === stage.id).length;
            return (
              <div key={stage.id} className="pipeline__summary-item">
                <span className="pipeline__summary-dot" style={{ background: stage.color }} />
                <span className="pipeline__summary-label">{stage.label}</span>
                <span className="pipeline__summary-count">{count}</span>
              </div>
            );
          })}
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
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
                <span className="pipeline__column-count">{stageProjects.length}</span>
              </div>
              <div className="pipeline__column-body">
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
                        <h4>{project.title}</h4>
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
                {stageProjects.length === 0 && (
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
                <div className="form-group form-group--full">
                  <label>Project Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Acme Corp — Website Redesign"
                  />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
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
