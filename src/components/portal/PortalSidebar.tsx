import { NavLink } from 'react-router-dom';
import { CLAD_FORGE_LOGO_DATA_URI } from '../../lib/brand';
import type { Profile, Client, Settings } from '../../lib/types';

// Demo migration: TypeScript proof point. The styling continues to use
// the existing .portal-sidebar* CSS classes in App.css; the Tailwind v4
// portion of the migration ran into palette-name conflicts (slate, stone)
// and cascade-layer issues that are better solved by a planned cleanup
// pass on @theme rather than fighting them per-component.
//
// What this file demonstrates:
//   - Strict-mode TypeScript on a real component
//   - Shared Profile/Client/Settings types from src/lib/types.ts
//   - Exhaustive icon-name union for compile-time safety on the icon switch
//   - Existing CSS keeps working untouched

type IconName = 'dashboard' | 'folder' | 'box' | 'file' | 'send' | 'repeat' | 'paperclip' | 'user' | 'message';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: IconName;
}

const NAV: NavItem[] = [
  { to: '/portal', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/portal/projects', label: 'Projects', icon: 'folder' },
  { to: '/portal/applications', label: 'Applications', icon: 'box' },
  { to: '/portal/invoices', label: 'Invoices', icon: 'file' },
  { to: '/portal/proposals', label: 'Proposals', icon: 'send' },
  { to: '/portal/expenses', label: 'Recurring', icon: 'repeat' },
  { to: '/portal/tickets', label: 'Tickets', icon: 'message' },
  { to: '/portal/documents', label: 'Documents', icon: 'paperclip' },
  { to: '/portal/account', label: 'Account', icon: 'user' },
];

interface PortalSidebarProps {
  profile: Profile;
  activeClient: Client | null;
  settings: Settings | null;
  onSignOut: () => void;
}

export default function PortalSidebar({ profile, activeClient, settings, onSignOut }: PortalSidebarProps) {
  const companyName = settings?.companyName || 'Clad Forge';
  const logoSrc = settings?.brandLogoUrl || CLAD_FORGE_LOGO_DATA_URI;

  // First letter for the avatar circle. Falls back through name → email → company.
  const avatarLetter = (profile?.fullName || profile?.email || activeClient?.company || '?')
    .slice(0, 1)
    .toUpperCase();

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
          <div className="portal-sidebar__user-avatar">{avatarLetter}</div>
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

// Inline SVG icons keep the bundle small and use currentColor so they
// inherit the link's text color (active vs. inactive).
function PortalNavIcon({ name }: { name: IconName }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
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
    case 'box':
      return (
        <svg {...props}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
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
    case 'message':
      return (
        <svg {...props}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
  }
}
