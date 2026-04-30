import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CLAD_FORGE_LOGO_DATA_URI } from '../lib/brand';

// Landing page for invited portal users. The Supabase magic-link redirect
// arrives here with auth tokens in the URL hash. supabase-js auto-detects
// the hash via detectSessionInUrl (default true), creates a session, then
// this page collects the user's name + password to finalize their account.
//
// Phases:
//   loading    — supabase-js is still processing the URL hash
//   form       — session ready, show name + password form
//   submitting — calling auth.updateUser({ password, data: { full_name } })
//   success    — done, brief confirmation before redirect
//   error      — link is invalid or expired
//
// On success, mark client_users.accepted_at and reload so App.jsx routes
// the now-authenticated client user to <ClientPortal />.
export default function AcceptInvite() {
  const [phase, setPhase] = useState('loading');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    async function checkExistingSession() {
      // supabase-js processes the URL hash synchronously during createClient,
      // so by the time this effect fires the session should already exist.
      // In rare cases (slow auth refresh, cross-tab races) we fall back to
      // listening for onAuthStateChange.
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setEmail(session.user.email || '');
        setPhase('form');
        return true;
      }
      return false;
    }

    checkExistingSession().then(found => {
      if (found || !mounted) return;

      // No session yet — wait briefly for one to appear via auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        if (sess?.user && mounted) {
          setEmail(sess.user.email || '');
          setPhase('form');
          subscription.unsubscribe();
          if (timeoutId) clearTimeout(timeoutId);
        }
      });

      // Bail after 4s — the link is probably bad
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        subscription.unsubscribe();
        setError(
          'This invite link is invalid or has expired. Ask your Clad Forge contact to send a new invite.'
        );
        setPhase('error');
      }, 4000);

      return () => { subscription.unsubscribe(); if (timeoutId) clearTimeout(timeoutId); };
    });

    return () => { mounted = false; if (timeoutId) clearTimeout(timeoutId); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanedName = fullName.trim();
    if (!cleanedName) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPhase('submitting');
    try {
      // Update auth: set password + store full_name in user_metadata so it
      // survives password resets / future SDK reads of session.user.
      const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: cleanedName },
      });
      if (updateErr) throw updateErr;

      const userId = updateData?.user?.id;
      if (userId) {
        // Also update the profiles row directly. handle_new_user() created it
        // with full_name='User' as a fallback; replace that with what the user
        // actually entered so it shows in the portal sidebar immediately.
        await supabase
          .from('profiles')
          .update({ full_name: cleanedName })
          .eq('id', userId);

        // Mark client_users.accepted_at so admin sees "Accepted" instead of "Pending"
        await supabase
          .from('client_users')
          .update({ accepted_at: new Date().toISOString() })
          .eq('auth_user_id', userId);
      }

      setPhase('success');
      // Hard reload to / so App.jsx sees the (now persistent) session and
      // routes the client-role user to <ClientPortal />.
      setTimeout(() => { window.location.href = '/'; }, 1400);
    } catch (err) {
      setError(err.message || 'Could not finish setup. Try again.');
      setPhase('form');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="portal-placeholder">
        <div className="portal-placeholder__card">
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
          <p className="portal-placeholder__sub">Verifying your invite link…</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="portal-placeholder">
        <div className="portal-placeholder__card">
          <img
            src={CLAD_FORGE_LOGO_DATA_URI}
            alt="Clad Forge"
            className="portal-placeholder__logo"
          />
          <h1 className="portal-placeholder__title">Invite Link Issue</h1>
          <p className="portal-placeholder__lede">{error}</p>
          <div className="portal-placeholder__actions">
            <a href="/" className="btn btn--ghost">Back to home</a>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="portal-placeholder">
        <div className="portal-placeholder__card">
          <img
            src={CLAD_FORGE_LOGO_DATA_URI}
            alt="Clad Forge"
            className="portal-placeholder__logo"
          />
          <h1 className="portal-placeholder__title">All Set</h1>
          <p className="portal-placeholder__lede">Logging you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-placeholder">
      <div className="portal-placeholder__card" style={{ maxWidth: 460 }}>
        <img
          src={CLAD_FORGE_LOGO_DATA_URI}
          alt="Clad Forge"
          className="portal-placeholder__logo"
        />
        <h1 className="portal-placeholder__title">Welcome to Clad Forge</h1>
        <p className="portal-placeholder__lede">
          {email
            ? <>Finish setting up your portal account for <strong>{email}</strong>.</>
            : 'Finish setting up your portal account.'}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ textAlign: 'left', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div className="form-group">
            <label>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoComplete="name"
              required
              autoFocus
              disabled={phase === 'submitting'}
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={phase === 'submitting'}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={phase === 'submitting'}
              placeholder="Re-enter password"
            />
          </div>

          {error && <div className="modal__error">{error}</div>}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={phase === 'submitting'}
            style={{ width: '100%' }}
          >
            {phase === 'submitting' ? 'Finishing setup…' : 'Finish Setup & Continue'}
          </button>
        </form>

        <div className="portal-placeholder__footer" style={{ marginTop: 28 }}>
          <span>Need help? Contact your Clad Forge representative directly.</span>
        </div>
      </div>
    </div>
  );
}
