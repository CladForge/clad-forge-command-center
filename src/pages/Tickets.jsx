import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from '../data/initialData';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
const PRIORITY_LABELS = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

function fmtDate(isoOrNull) {
  if (!isoOrNull) return '';
  return new Date(isoOrNull).toLocaleDateString();
}
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

export default function Tickets({ clients, applications, tickets, setTickets, ticketComments, setTicketComments, profile }) {
  const [filterStatus, setFilterStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null); // ticket id

  const enriched = useMemo(() => tickets.map(t => ({
    ...t,
    client: clients.find(c => c.id === t.clientId),
    application: applications.find(a => a.id === t.applicationId),
    commentCount: ticketComments.filter(c => c.ticketId === t.id).length,
  })), [tickets, clients, applications, ticketComments]);

  const filtered = enriched.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = !search
      || t.subject?.toLowerCase().includes(search.toLowerCase())
      || t.client?.company?.toLowerCase().includes(search.toLowerCase())
      || t.application?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  const viewingTicket = viewing ? enriched.find(t => t.id === viewing) : null;

  return (
    <div className="tickets">
      <div className="invoices__summary" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
          <span className="stat-card__label">Open</span>
          <span className="stat-card__value">{counts.open}</span>
          <span className="stat-card__sub">awaiting response</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
          <span className="stat-card__label">In Progress</span>
          <span className="stat-card__value">{counts.in_progress}</span>
          <span className="stat-card__sub">being worked on</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--success)' }} />
          <span className="stat-card__label">Resolved</span>
          <span className="stat-card__value">{counts.resolved}</span>
          <span className="stat-card__sub">{tickets.filter(t => t.status === 'closed').length} closed</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__accent" style={{ background: 'var(--danger)' }} />
          <span className="stat-card__label">Urgent</span>
          <span className="stat-card__value">{tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length}</span>
          <span className="stat-card__sub">need attention</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__left">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Search tickets, clients, applications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-chips">
            {['all','open','in_progress','resolved','closed'].map(s => (
              <button
                key={s}
                className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
                <span className="filter-chip__count">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">💬</span>
            <h3>{search || filterStatus !== 'all' ? 'No tickets match' : 'No tickets yet'}</h3>
            <p>Clients submit tickets from their portal. They show up here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Client</th>
                <th>Application</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Activity</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="data-table__clickable" onClick={() => setViewing(t.id)}>
                  <td>
                    <span className="data-table__bold">{t.subject}</span>
                    {t.commentCount > 0 && (
                      <span className="data-table__sub">{t.commentCount} comment{t.commentCount !== 1 ? 's' : ''}</span>
                    )}
                  </td>
                  <td>{t.client?.company || '—'}</td>
                  <td className="data-table__muted">{t.application?.name || '—'}</td>
                  <td><span className={`status-pill priority-pill--${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span></td>
                  <td><span className={`status-pill status-pill--ticket-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                  <td className="data-table__muted">{fmtTimeAgo(t.createdAt)}</td>
                  <td className="data-table__muted">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewingTicket && (
        <TicketDetailModal
          ticket={viewingTicket}
          comments={ticketComments.filter(c => c.ticketId === viewingTicket.id)}
          setTickets={setTickets}
          setTicketComments={setTicketComments}
          profile={profile}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ ticket, comments, setTickets, setTicketComments, profile, onClose }) {
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function changeStatus(newStatus) {
    const updates = { status: newStatus };
    if (newStatus === 'resolved') updates.resolvedAt = new Date().toISOString();
    if (newStatus === 'closed') updates.closedAt = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...updates } : t));
  }

  async function postReply() {
    if (!reply.trim()) return;
    setSubmitting(true);
    const newComment = {
      id: generateId(),
      ticketId: ticket.id,
      body: reply.trim(),
      authorId: profile?.id,
      isInternal,
      createdAt: new Date().toISOString(),
    };
    setTicketComments(prev => [...prev, newComment]);
    // Bump ticket to in_progress if currently open
    if (ticket.status === 'open' && !isInternal) {
      changeStatus('in_progress');
    }
    setReply('');
    setIsInternal(false);
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>{ticket.subject}</h2>
            <span className="modal__subtitle">
              {ticket.client?.company || 'Unknown client'}
              {ticket.application?.name ? ` · ${ticket.application.name}` : ''}
            </span>
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {/* Status + actions bar */}
          <div className="inv-detail-bar" style={{ marginBottom: 16 }}>
            <span className={`status-pill status-pill--ticket-${ticket.status} status-pill--lg`}>
              {STATUS_LABELS[ticket.status]}
            </span>
            <span className={`status-pill priority-pill--${ticket.priority}`}>
              {PRIORITY_LABELS[ticket.priority]} priority
            </span>
            <div style={{ flex: 1 }} />
            <div className="inv-detail-actions">
              {ticket.status === 'open' && (
                <button className="btn btn--primary btn--sm" onClick={() => changeStatus('in_progress')}>Start Work</button>
              )}
              {ticket.status === 'in_progress' && (
                <button className="btn btn--primary btn--sm" onClick={() => changeStatus('resolved')}>Mark Resolved</button>
              )}
              {ticket.status === 'resolved' && (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={() => changeStatus('open')}>Reopen</button>
                  <button className="btn btn--secondary btn--sm" onClick={() => changeStatus('closed')}>Close</button>
                </>
              )}
              {ticket.status === 'closed' && (
                <button className="btn btn--ghost btn--sm" onClick={() => changeStatus('open')}>Reopen</button>
              )}
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <div className="ticket-thread__original">
              <div className="ticket-thread__author">{ticket.client?.company || 'Client'} wrote:</div>
              <p>{ticket.description}</p>
              <span className="ticket-thread__meta">{fmtTimeAgo(ticket.createdAt)}</span>
            </div>
          )}

          {/* Thread */}
          <div className="ticket-thread">
            {comments.map(c => (
              <div
                key={c.id}
                className={`ticket-thread__msg ${c.authorId === ticket.submittedBy ? 'ticket-thread__msg--client' : 'ticket-thread__msg--admin'} ${c.isInternal ? 'ticket-thread__msg--internal' : ''}`}
              >
                <div className="ticket-thread__author">
                  {c.authorId === ticket.submittedBy ? (ticket.client?.company || 'Client') : 'You'}
                  {c.isInternal && <span className="ticket-thread__internal-badge">Internal</span>}
                </div>
                <p>{c.body}</p>
                <span className="ticket-thread__meta">{fmtTimeAgo(c.createdAt)}</span>
              </div>
            ))}
            {comments.length === 0 && (
              <p style={{ color: 'var(--slate-light)', fontStyle: 'italic', fontSize: '0.85rem', padding: '12px 0' }}>
                No replies yet.
              </p>
            )}
          </div>

          {/* Reply form */}
          {ticket.status !== 'closed' && (
            <div className="ticket-reply">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder={isInternal ? 'Internal note (only visible to you)...' : 'Reply to the client...'}
                rows={3}
                disabled={submitting}
              />
              <div className="ticket-reply__actions">
                <label className="ticket-reply__internal-toggle">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={e => setIsInternal(e.target.checked)}
                  />
                  Internal note
                </label>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={postReply}
                  disabled={submitting || !reply.trim()}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
