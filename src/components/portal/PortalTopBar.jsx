// Top bar for the client portal. Shows the current company (with a switcher
// if the user belongs to more than one) and the user's portal role.
export default function PortalTopBar({ activeClient, linkedClients, activeClientId, setActiveClientId, portalRole }) {
  const showSwitcher = (linkedClients?.length || 0) > 1;

  return (
    <header className="portal-topbar">
      <div className="portal-topbar__left">
        {showSwitcher ? (
          <select
            className="portal-topbar__switcher"
            value={activeClientId || ''}
            onChange={e => setActiveClientId(e.target.value)}
          >
            {linkedClients.map(c => (
              <option key={c.id} value={c.id}>{c.company}</option>
            ))}
          </select>
        ) : (
          <span className="portal-topbar__company">{activeClient?.company || 'Loading…'}</span>
        )}
        {portalRole && (
          <span className={`portal-topbar__role portal-topbar__role--${portalRole}`}>
            {portalRole.charAt(0).toUpperCase() + portalRole.slice(1)}
          </span>
        )}
      </div>
      <div className="portal-topbar__right">
        {/* Reserved for future: notifications, help, etc. */}
      </div>
    </header>
  );
}
