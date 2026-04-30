import { NavLink } from 'react-router-dom';
import { CLAD_FORGE_LOGO_DATA_URI } from '../../lib/brand';
import type { Profile, Client, Settings } from '../../lib/types';

// Demo migration: this file is the proof point for TypeScript + Tailwind v4
// adoption. The previous .jsx version used ~22 custom CSS classes in
// App.css; this version uses Tailwind utilities exclusively, which means
// (1) no separate CSS file needed for layout, (2) the styles live next to
// the markup that uses them, (3) the @theme tokens in index.css make
// brand-aware utilities (bg-brand, text-ink) automatic.

type IconName = 'dashboard' | 'folder' | 'file' | 'send' | 'repeat' | 'paperclip' | 'user';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: IconName;
}

const NAV: NavItem[] = [
  { to: '/portal', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/portal/projects', label: 'Projects', icon: 'folder' },
  { to: '/portal/invoices', label: 'Invoices', icon: 'file' },
  { to: '/portal/proposals', label: 'Proposals', icon: 'send' },
  { to: '/portal/expenses', label: 'Recurring', icon: 'repeat' },
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
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-surface border-r border-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <img
          src={logoSrc}
          alt={companyName}
          className="w-9 h-9 shrink-0 drop-shadow-[0_2px_4px_rgba(255,140,0,0.2)]"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[0.95rem] font-bold text-ink tracking-tight leading-tight">
            {companyName}
          </span>
          <span className="text-[0.7rem] font-semibold text-brand uppercase tracking-[0.1em] mt-0.5">
            Client Portal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            // NavLink's className supports a function — Tailwind classes for
            // active vs. inactive states. Brand colors come from the @theme
            // bridge so light/dark mode "just works" via data-theme.
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[0.88rem] font-medium no-underline transition-all duration-150',
                isActive
                  ? 'bg-brand-pale text-brand font-semibold'
                  : 'text-slate hover:bg-brand-wash hover:text-ink',
              ].join(' ')
            }
          >
            <span className="flex items-center justify-center w-5 shrink-0" aria-hidden="true">
              <PortalNavIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer (user + sign out) */}
      <div className="flex flex-col gap-3 px-3.5 pt-3.5 pb-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center bg-brand-pale text-brand text-[0.9rem] font-bold">
            {avatarLetter}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[0.82rem] font-semibold text-ink truncate">
              {profile?.fullName || profile?.email || 'Portal User'}
            </span>
            {activeClient && (
              <span className="text-[0.72rem] text-slate truncate">{activeClient.company}</span>
            )}
          </div>
        </div>
        {/* Reuses the existing .btn--ghost style for visual consistency with
            unmigrated components. Button styling is a shared design-system
            concern — leaving as App.css until we migrate the button system. */}
        <button className="btn btn--ghost btn--sm w-full" onClick={onSignOut}>
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
  }
}
