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
