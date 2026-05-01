export default function PortalAccount({ profile, activeClient, settings, memberships, onSignOut }) {
  const portalRole = memberships.find(m => m.clientId === activeClient?.id)?.portalRole || '—';
  const acceptedAt = memberships.find(m => m.clientId === activeClient?.id)?.acceptedAt;

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Account</h1>
          <p className="portal-page__subtitle">Your portal access and contact info.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel__header"><h3>Your Account</h3></div>
        <div style={{ padding: '20px 22px' }}>
          <dl className="portal-account__dl">
            <div className="portal-account__row">
              <dt>Name</dt>
              <dd>{profile?.fullName || '—'}</dd>
            </div>
            <div className="portal-account__row">
              <dt>Email</dt>
              <dd>{profile?.email || '—'}</dd>
            </div>
            <div className="portal-account__row">
              <dt>Company</dt>
              <dd>{activeClient?.company || '—'}</dd>
            </div>
            <div className="portal-account__row">
              <dt>Your Role</dt>
              <dd style={{ textTransform: 'capitalize' }}>{portalRole}</dd>
            </div>
            <div className="portal-account__row">
              <dt>Member Since</dt>
              <dd>{acceptedAt ? new Date(acceptedAt).toLocaleDateString() : '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Payment Methods — Phase 2 stub. The eventual flow:
            1. "Connect bank account" button kicks off Stripe Financial
               Connections (or a SetupIntent + manual micro-deposits flow)
               via a new edge function.
            2. Client confirms via Stripe Elements; the resulting
               us_bank_account payment method is saved to their Stripe
               customer.
            3. Client signs an ACH authorization mandate (legal
               requirement under NACHA rules).
            4. A scheduled cron walks recurring_expenses on each
               next_due date, generates an invoice, and immediately
               charges the saved payment method via PaymentIntent
               (off_session).
          For now we surface the affordance so the client knows it's
          coming and the admin handles billing the usual way. */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel__header">
          <h3>Payment Methods</h3>
          <span className="status-pill status-pill--draft">Coming soon</span>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: '0.92rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: 12 }}>
            We&apos;re building a secure way to connect your bank account so
            recurring fees on your applications can be withdrawn
            automatically on each item&apos;s due date. You&apos;ll review the
            connection, sign an ACH authorization, and see every charge
            in your invoices list.
          </p>
          <button className="btn btn--ghost" disabled style={{ cursor: 'not-allowed', opacity: 0.6 }}>
            Connect bank account (coming soon)
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--slate-light)', marginTop: 10 }}>
            Until then, your Clad Forge representative will continue to send
            invoices the usual way for any active billing items.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel__header"><h3>Need Help?</h3></div>
        <div style={{ padding: '20px 22px', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--slate)' }}>
          <p>Contact your Clad Forge representative directly:</p>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {settings?.companyEmail && (
              <a href={`mailto:${settings.companyEmail}`} style={{ color: 'var(--brand)' }}>
                {settings.companyEmail}
              </a>
            )}
            {settings?.companyPhone && (
              <a href={`tel:${settings.companyPhone}`} style={{ color: 'var(--brand)' }}>
                {settings.companyPhone}
              </a>
            )}
            {!settings?.companyEmail && !settings?.companyPhone && (
              <span>Contact info will appear here once your portal is fully set up.</span>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header"><h3>Sign Out</h3></div>
        <div style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate)', marginBottom: 12 }}>
            Signing out will end this session. You can sign back in anytime with your email and password.
          </p>
          <button className="btn btn--secondary" onClick={onSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
