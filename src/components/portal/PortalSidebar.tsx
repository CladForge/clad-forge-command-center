import { NavLink } from 'react-router-dom';
import { CLAD_FORGE_LOGO_DATA_URI } from '../../lib/brand';
import type { Profile, Client, Settings } from '../../lib/types';

// Portal sidebar reuses the admin .sidebar / .sb-* / .nav-item classes from
// App.css so both surfaces feel identical. Nav items reflect what a client
// actually needs to see — projects, applications, invoices, proposals,
// recurring, account.

type IconName =
  | 'dashboard' | 'folder' | 'box' | 'invoices'
  | 'sow' | 'recurring' | 'user';

interface NavSection {
  label: string;
  items: { to: string; label: string; icon: IconName; end?: boolean }[];
}

const NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/portal', label: 'Dashboard', icon: 'dashboard', end: true },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/portal/projects', label: 'Projects', icon: 'folder' },
      { to: '/portal/applications', label: 'Applications', icon: 'box' },
      { to: '/portal/proposals', label: 'Proposals', icon: 'sow' },
      { to: '/portal/invoices', label: 'Invoices', icon: 'invoices' },
      { to: '/portal/expenses', label: 'Recurring', icon: 'recurring' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/portal/account', label: 'Account', icon: 'user' },
    ],
  },
];

interface PortalSidebarProps {
  profile: Profile;
  activeClient: Client | null;
  settings: Settings | null;
  collapsed: boolean;
  onToggle: () => void;
  onSignOut: () => void;
}

export default function PortalSidebar({
  profile, activeClient, settings, collapsed, onToggle, onSignOut,
}: PortalSidebarProps) {
  const companyName = settings?.companyName || 'Clad Forge';
  const logoSrc = settings?.brandLogoUrl || CLAD_FORGE_LOGO_DATA_URI;

  // Initials for the avatar circle. Falls back through name → email → company.
  const source = profile?.fullName || profile?.email || activeClient?.company || '?';
  const initials = source
    .split(/\s+/)
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-logo">
          <img src={logoSrc} alt={companyName} />
        </div>
        {!collapsed && (
          <div className="sb-text">
            <h1>{companyName}</h1>
            <p>Client Portal</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {NAV.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div className="nav-section-label">{section.label}</div>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                <span className="nav-icon">
                  <PortalNavIcon name={item.icon} />
                </span>
                {!collapsed && <span className="nav-text">{item.label}</span>}
                {collapsed && <span className="nav-tip">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User / Footer */}
      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-user-avatar">{initials || '?'}</div>
          {!collapsed && (
            <div className="sb-user-info">
              <div className="sb-user-name">
                {profile?.fullName || profile?.email || 'Portal User'}
              </div>
              <div className="sb-user-role">
                {activeClient?.company || 'client'}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="sb-signout" onClick={onSignOut}>Sign Out</button>
        )}
      </div>

      {/* Collapse toggle */}
      <button className="sb-toggle" onClick={onToggle}>
        {collapsed ? '›' : '‹'}
      </button>
    </aside>
  );
}

// Inline SVG icons. currentColor lets the active state tint them.
function PortalNavIcon({ name }: { name: IconName }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'box':
      return (
        <svg {...props}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'invoices':
      return (
        <svg {...props}>
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case 'sow':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'recurring':
      return (
        <svg {...props}>
          <path d="M17 1l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}
