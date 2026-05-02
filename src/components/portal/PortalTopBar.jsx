import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const pageTitles = {
  '/portal': 'Dashboard',
  '/portal/projects': 'Projects',
  '/portal/applications': 'Applications',
  '/portal/proposals': 'Proposals',
  '/portal/invoices': 'Invoices',
  '/portal/expenses': 'Recurring Charges',
  '/portal/account': 'Account',
};

// Title resolver supports nested routes (/portal/projects/:id, etc.) by
// matching the longest known prefix.
function titleFor(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles)
    .filter(p => pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return match ? pageTitles[match] : 'Portal';
}

// Top bar mirrors the admin TopBar: title on the left, status indicators
// and clock on the right. The company switcher (multi-org users) and
// portal role pill replace the admin's connection-status block.
export default function PortalTopBar({
  activeClient, linkedClients, activeClientId, setActiveClientId, portalRole,
}) {
  const location = useLocation();
  const title = titleFor(location.pathname);
  const showSwitcher = (linkedClients?.length || 0) > 1;

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__spacer" />

      <div className="topbar__right">
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
          activeClient?.company && (
            <span className="topbar__company">{activeClient.company}</span>
          )
        )}
        {portalRole && (
          <span className={`portal-topbar__role portal-topbar__role--${portalRole}`}>
            {portalRole.charAt(0).toUpperCase() + portalRole.slice(1)}
          </span>
        )}
        <PortalTopBarClock />
      </div>
    </header>
  );
}

function PortalTopBarClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="topbar__clock">
      {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
    </span>
  );
}
