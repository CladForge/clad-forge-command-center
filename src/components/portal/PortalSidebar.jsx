import { NavLink } from 'react-router-dom';
import { CLAD_FORGE_LOGO_DATA_URI } from '../../lib/brand';

const NAV = [
  { to: '/portal', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/portal/projects', label: 'Projects', icon: 'folder' },
  { to: '/portal/invoices', label: 'Invoices', icon: 'file' },
  { to: '/portal/proposals', label: 'Proposals', icon: 'send' },
  { to: '/portal/expenses', label: 'Recurring', icon: 'repeat' },
  { to: '/portal/documents', label: 'Documents', icon: 'paperclip' },
  { to: '/portal/account', label: 'Account', icon: 'user' },
];

export default function PortalSidebar({ profile, activeClient, settings, onSignOut }) {
  const companyName = settings?.companyName || 'Clad Forge';
  const logoSrc = settings?.brandLogoUrl || CLAD_FORGE_LOGO_DATA_URI;

  return (
    <aside className="portal-sidebar">
      <div className="portal-sidebar__brand">
        <img src={logoSrc} alt={companyName} className="portal-sidebar__brand-logo" />
        <div className="portal-sidebar__brand-text">
          <span className="portal-sidebar__brand-name">{companyName}</span>
          <span className="portal-sidebar__brand-sub">Client Portal</span>
        </div>
      </div>

      <nav className="portal-sidebar__nav">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `portal-sidebar__link ${isActive ? 'portal-sidebar__link--active' : ''}`
            }
          >
            <span className="portal-sidebar__icon" aria-hidden="true">
              <PortalNavIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="portal-sidebar__footer">
        <div className="portal-sidebar__user">
          <div className="portal-sidebar__user-avatar">
            {(profile?.fullName || profile?.email || activeClient?.company || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="portal-sidebar__user-text">
            <span className="portal-sidebar__user-name">
              {profile?.fullName || profile?.email || 'Portal User'}
            </span>
            {activeClient && (
              <span className="portal-sidebar__user-company">{activeClient.company}</span>
            )}
          </div>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onSignOut} style={{ width: '100%' }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// Inline SVG icons — keeps the bundle light and color-aware (uses currentColor)
function PortalNavIcon({ name }) {
  const props = {
    width: 16, height: 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'file':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case 'send':
      return (
        <svg {...props}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case 'repeat':
      return (
        <svg {...props}>
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case 'paperclip':
      return (
        <svg {...props}>
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return <span>•</span>;
  }
}
