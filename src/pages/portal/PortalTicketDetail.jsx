import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function PortalTicketDetail({ tickets, ticketComments, applications, activeClient, profile, reloadTickets }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const ticket = tickets.find(t => t.id === id);

  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!ticket) {
    return (
      <div className="portal-page">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/tickets')}>← Back to tickets</button>
        <div className="empty-state">
          <h3>Ticket not found</h3>
          <p>This ticket may have been removed or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  const comments = ticketComments.filter(c => c.ticketId === ticket.id);
  const app = applications.find(a => a.id === ticket.applicationId);

  async function postReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: insertErr } = await supabase.from('ticket_comments').insert({
      id: generateId(),
      ticket_id: ticket.id,
      body: reply.trim(),
      author_id: profile?.id,
      is_internal: false,
    });
    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }
    setReply('');
    setSubmitting(false);
    if (reloadTickets) await reloadTickets();
  }

  const canReply = ticket.status !== 'closed';

  return (
    <div className="portal-page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/tickets')}>← Back to tickets</button>

      <div className="portal-page__header" style={{ marginTop: 16 }}>
        <div>
          <h1>{ticket.subject}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span className={`status-pill status-pill--ticket-${ticket.status}`}>{STATUS_LABELS[ticket.status]}</span>
            <span className={`status-pill priority-pill--${ticket.priority}`}>{PRIORITY_LABELS[ticket.priority]} priority</span>
            {app && <span className="portal-page__subtitle">on {app.name}</span>}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div style={{ padding: 22 }}>
          {/* Original message */}
          <div className="ticket-thread__original">
            <div className="ticket-thread__author">{activeClient?.company || 'You'} wrote:</div>
            <p style={{ whiteSpace: 'pre-line' }}>{ticket.description || '(no description)'}</p>
            <span className="ticket-thread__meta">{fmtTimeAgo(ticket.createdAt)}</span>
          </div>

          {/* Comments thread */}
          <div className="ticket-thread">
            {comments.map(c => {
              const isMine = c.authorId === profile?.id;
              return (
                <div
                  key={c.id}
                  className={`ticket-thread__msg ${isMine ? 'ticket-thread__msg--client' : 'ticket-thread__msg--admin'}`}
                >
                  <div className="ticket-thread__author">
                    {isMine ? 'You' : 'Clad Forge'}
                  </div>
                  <p style={{ whiteSpace: 'pre-line' }}>{c.body}</p>
                  <span className="ticket-thread__meta">{fmtTimeAgo(c.createdAt)}</span>
                </div>
              );
            })}
            {comments.length === 0 && (
              <p style={{ color: 'var(--slate-light)', fontStyle: 'italic', fontSize: '0.85rem', padding: '12px 0' }}>
                No replies yet. We&apos;ll respond as soon as we can.
              </p>
            )}
          </div>

          {/* Reply form */}
          {canReply ? (
            <form onSubmit={postReply} className="ticket-reply" style={{ marginTop: 20 }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Add a reply..."
                rows={3}
                disabled={submitting}
              />
              {error && <div className="modal__error">{error}</div>}
              <div className="ticket-reply__actions">
                <span style={{ fontSize: '0.78rem', color: 'var(--slate-light)' }}>
                  Status: {STATUS_LABELS[ticket.status]}
                </span>
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={submitting || !reply.trim()}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </form>
          ) : (
            <p style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--slate)', fontStyle: 'italic' }}>
              This ticket is closed. If you need help with a related issue, please open a new ticket.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
