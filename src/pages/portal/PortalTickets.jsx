import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateId } from '../../data/initialData';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
const PRIORITY_LABELS = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

function fmtTimeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PortalTickets({ tickets, ticketComments, applications, activeClient, profile, reloadTickets }) {
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = filterStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => ['resolved','closed'].includes(t.status)).length,
  };

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Tickets</h1>
          <p className="portal-page__subtitle">
            Submit a question, request, or issue. We&apos;ll get back to you here.
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowNewModal(true)}>
          + New Ticket
        </button>
      </div>

      <div className="filter-chips" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${filterStatus === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus('all')}>
          All <span className="filter-chip__count">{counts.all}</span>
        </button>
        <button className={`filter-chip ${filterStatus === 'open' ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus('open')}>
          Open <span className="filter-chip__count">{counts.open}</span>
        </button>
        <button className={`filter-chip ${filterStatus === 'in_progress' ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus('in_progress')}>
          In Progress <span className="filter-chip__count">{counts.in_progress}</span>
        </button>
        <button className={`filter-chip ${filterStatus === 'resolved' ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus('resolved')}>
          Resolved <span className="filter-chip__count">{counts.resolved}</span>
        </button>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">💬</span>
            <h3>{filterStatus === 'all' ? 'No tickets yet' : 'No matching tickets'}</h3>
            <p>{filterStatus === 'all' ? 'Click "New Ticket" to submit a question or report an issue.' : 'No tickets match this filter.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Application</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Replies</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const app = applications.find(a => a.id === t.applicationId);
                const replyCount = ticketComments.filter(c => c.ticketId === t.id).length;
                return (
                  <tr key={t.id} className="data-table__clickable" onClick={() => navigate(`/portal/tickets/${t.id}`)}>
                    <td><span className="data-table__bold">{t.subject}</span></td>
                    <td className="data-table__muted">{app?.name || '—'}</td>
                    <td><span className={`status-pill priority-pill--${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span></td>
                    <td><span className={`status-pill status-pill--ticket-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                    <td className="data-table__muted">{replyCount}</td>
                    <td className="data-table__muted">{fmtTimeAgo(t.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNewModal && (
        <NewTicketModal
          applications={applications}
          activeClient={activeClient}
          profile={profile}
          onClose={() => setShowNewModal(false)}
          onCreated={async () => {
            setShowNewModal(false);
            if (reloadTickets) await reloadTickets();
          }}
        />
      )}
    </div>
  );
}

function NewTicketModal({ applications, activeClient, profile, onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: '', description: '',
    priority: 'normal', applicationId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!form.subject.trim()) {
      setError('Please add a subject.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: insertErr } = await supabase.from('service_tickets').insert({
      id: generateId(),
      client_id: activeClient.id,
      application_id: form.applicationId || null,
      subject: form.subject.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: 'open',
      submitted_by: profile?.id,
    });
    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }
    if (onCreated) await onCreated();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal__header">
          <h2>New Ticket</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="modal__body">
          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Short summary of the issue or request"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add details, steps to reproduce, links, etc."
              rows={5}
              disabled={submitting}
            />
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} disabled={submitting}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            {applications.length > 0 && (
              <div className="form-group">
                <label>Application (optional)</label>
                <select value={form.applicationId} onChange={e => setForm(f => ({ ...f, applicationId: e.target.value }))} disabled={submitting}>
                  <option value="">Not specific</option>
                  {applications.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && <div className="modal__error">{error}</div>}
          <div className="modal__footer" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting || !form.subject.trim()}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
