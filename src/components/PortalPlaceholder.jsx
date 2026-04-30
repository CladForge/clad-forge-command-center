import { CLAD_FORGE_LOGO_DATA_URI } from '../lib/brand';

// Phase 1 placeholder shown to users with role='client' before the client
// portal UI exists. Replaced by the real <ClientPortal /> tree in Phase 2.
export default function PortalPlaceholder({ profile, onSignOut }) {
  return (
    <div className="portal-placeholder">
      <div className="portal-placeholder__card">
        <img
          src={CLAD_FORGE_LOGO_DATA_URI}
          alt="Clad Forge"
          className="portal-placeholder__logo"
        />
        <h1 className="portal-placeholder__title">Your Portal Is Being Set Up</h1>
        <p className="portal-placeholder__lede">
          Welcome to Clad Forge. We&apos;re finishing the last bits of your client
          portal — once it&apos;s live, you&apos;ll be able to sign back in here to
          see your projects, invoices, and approvals in one place.
        </p>
        <p className="portal-placeholder__sub">
          {profile?.fullName ? `Signed in as ${profile.fullName}` : 'You are signed in.'}
          {' '}You&apos;ll get an email the moment your portal is ready.
        </p>
        <div className="portal-placeholder__actions">
          <button className="btn btn--primary" onClick={onSignOut}>Sign Out</button>
        </div>
        <div className="portal-placeholder__footer">
          <span>Need help in the meantime? Reach out to your Clad Forge contact directly.</span>
        </div>
      </div>
    </div>
  );
}
