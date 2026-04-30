import { useState } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ROLE_DESCRIPTIONS = {
  owner: 'Sees everything, can pay invoices, approve milestones, submit tickets, invite teammates.',
  billing: 'Sees invoices and recurring expenses only. Can pay invoices.',
  viewer: 'Read-only access to projects, proposals, and status. Can submit service tickets.',
};

// Modal for inviting a new user to a client's portal. Calls the
// invite-client-user edge function which handles the auth invite + the
// client_users link + the activity log.
export default function InvitePortalUserModal({ client, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [portalRole, setPortalRole] = useState('owner');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      // Use the live session JWT so the edge function can verify admin role
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) {
        setError('You must be signed in to invite users.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-client-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: cleaned,
          client_id: client.id,
          portal_role: portalRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invite failed. Check the function logs in Supabase.');
        setSubmitting(false);
        return;
      }

      setSuccess(data.message || 'Invite sent.');
      if (onInvited) await onInvited();
      // Auto-close after a brief success message
      setTimeout(() => { onClose(); }, 1400);
    } catch (err) {
      setError(err.message || 'Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal__header">
          <div>
            <h2>Invite to Portal</h2>
            <span className="modal__subtitle">{client.company}</span>
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          <div className="form-group">
            <label>Email address *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoFocus
              disabled={submitting}
            />
            <span className="form-hint">
              They&apos;ll receive a Clad Forge invite email and can set their own password.
            </span>
          </div>

          <div className="form-group">
            <label>Portal role</label>
            <div className="role-picker">
              {['owner', 'billing', 'viewer'].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`role-picker__option ${portalRole === r ? 'role-picker__option--active' : ''}`}
                  onClick={() => setPortalRole(r)}
                  disabled={submitting}
                >
                  <span className="role-picker__name">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                </button>
              ))}
            </div>
            <span className="form-hint">{ROLE_DESCRIPTIONS[portalRole]}</span>
          </div>

          {error && <div className="modal__error">{error}</div>}
          {success && <div className="modal__success">{success}</div>}

          <div className="modal__footer" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Sending invite...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
