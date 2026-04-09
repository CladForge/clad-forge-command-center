import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generateId } from '../data/initialData';

export default function TimeTracker({ projects, clients }) {
  const [entries, setEntries] = useLocalStorage('cf-time-entries', []);
  const [activeTimer, setActiveTimer] = useLocalStorage('cf-active-timer', null);
  const [elapsed, setElapsed] = useState(() => {
    if (activeTimer) return Math.floor((Date.now() - activeTimer.startTime) / 1000);
    return 0;
  });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ projectId: '', description: '', hours: 0, minutes: 0, date: new Date().toISOString().split('T')[0] });
  const intervalRef = useRef(null);

  // Timer tick
  useEffect(() => {
    if (!activeTimer) return;
      const updateElapsed = () => {
        setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      };
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
      return () => clearInterval(intervalRef.current);
  }, [activeTimer]);

  function startTimer(projectId) {
    setActiveTimer({ projectId, startTime: Date.now(), description: '' });
  }

  function stopTimer() {
    if (!activeTimer) return;
    const duration = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    setEntries(prev => [{
      id: generateId(),
      projectId: activeTimer.projectId,
      description: activeTimer.description || 'Timer session',
      hours,
      minutes,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setActiveTimer(null);
  }

  function handleManualAdd() {
    if (!form.projectId) return;
    setEntries(prev => [{
      id: generateId(),
      ...form,
      hours: parseInt(form.hours) || 0,
      minutes: parseInt(form.minutes) || 0,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setForm({ projectId: '', description: '', hours: 0, minutes: 0, date: new Date().toISOString().split('T')[0] });
    setShowModal(false);
  }

  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function formatTimer(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const totalHours = entries.reduce((sum, e) => sum + e.hours + e.minutes / 60, 0);
  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split('T')[0]);
  const todayHours = todayEntries.reduce((sum, e) => sum + e.hours + e.minutes / 60, 0);

  const activeProject = activeTimer
    ? projects.find(p => p.id === activeTimer.projectId)
    : null;

  return (
    <div className="time-tracker">
      {/* Timer Section */}
      <div className="timer-card">
        <div className="timer-card__display">
          <span className="timer-card__time">{formatTimer(elapsed)}</span>
          {activeProject && (
            <span className="timer-card__project">{activeProject.title}</span>
          )}
        </div>
        <div className="timer-card__controls">
          {activeTimer ? (
            <>
              <input
                type="text"
                className="timer-card__desc"
                placeholder="What are you working on?"
                value={activeTimer.description}
                onChange={e => setActiveTimer(t => ({ ...t, description: e.target.value }))}
              />
              <button className="btn btn--danger" onClick={stopTimer}>
                ■ Stop
              </button>
            </>
          ) : (
            <>
              <select
                className="timer-card__select"
                value=""
                onChange={e => { if (e.target.value) startTimer(e.target.value); }}
              >
                <option value="">Select project to start timer...</option>
                {projects.filter(p => p.stage === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <button className="btn btn--secondary" onClick={() => setShowModal(true)}>
                + Log Time
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="invoices__summary" style={{ marginTop: 24 }}>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
          <span className="stat-card__label">Today</span>
          <span className="stat-card__value">{todayHours.toFixed(1)}h</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <span className="stat-card__label">Total Logged</span>
          <span className="stat-card__value">{totalHours.toFixed(1)}h</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <span className="stat-card__label">Entries</span>
          <span className="stat-card__value">{entries.length}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--purple)' }} />
          <span className="stat-card__label">Active Projects</span>
          <span className="stat-card__value">{new Set(entries.map(e => e.projectId)).size}</span>
        </div>
      </div>

      {/* Time Entries */}
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel__header">
          <h3>Time Entries</h3>
        </div>
        {entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">⏱</span>
            <h3>No time entries yet</h3>
            <p>Start a timer or manually log time to track your work</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Description</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const project = projects.find(p => p.id === entry.projectId);
                const client = project ? clients.find(c => c.id === project.clientId) : null;
                return (
                  <tr key={entry.id}>
                    <td className="data-table__muted">{entry.date}</td>
                    <td>
                      <div>{project?.title || 'Unknown'}</div>
                      {client && <small className="data-table__sub">{client.company}</small>}
                    </td>
                    <td>{entry.description || '—'}</td>
                    <td className="data-table__mono data-table__bold">
                      {entry.hours}h {entry.minutes}m
                    </td>
                    <td>
                      <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={() => handleDelete(entry.id)}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Log Time</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group form-group--full">
                  <label>Project *</label>
                  <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hours</label>
                  <input type="number" min="0" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Minutes</label>
                  <input type="number" min="0" max="59" value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group form-group--full">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" rows={2} />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleManualAdd}>Log Time</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
