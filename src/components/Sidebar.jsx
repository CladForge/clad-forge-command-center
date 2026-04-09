import { NavLink } from 'react-router-dom';
import logo from '../../images/cladforge-logo.svg';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { path: '/clients', label: 'Clients', icon: 'clients' },
      { path: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
      { path: '/proposals', label: 'Proposals', icon: 'sow' },
      { path: '/invoices', label: 'Invoices', icon: 'invoices' },
      { path: '/time', label: 'Time Tracker', icon: 'time' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { path: '/branding', label: 'Brand Guide', icon: 'branding' },
      { path: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  clients: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  pipeline: <><rect x="1" y="3" width="6" height="18" rx="1" /><rect x="9" y="7" width="6" height="14" rx="1" /><rect x="17" y="5" width="6" height="16" rx="1" /></>,
  sow: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  invoices: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
  time: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  branding: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="21.17" y1="8" x2="12" y2="8" /><line x1="3.95" y1="6.06" x2="8.54" y2="14" /><line x1="10.88" y1="21.94" x2="15.46" y2="14" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};

export default function Sidebar({ collapsed, onToggle, profile, onSignOut }) {
  const initials = (profile?.full_name || 'CF')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-logo">
          <img src={logo} alt="Clad Forge" />
        </div>
        {!collapsed && (
          <div className="sb-text">
            <h1>Clad Forge</h1>
            <p>Command Center</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {navSections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div className="nav-section-label">{section.label}</div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {icons[item.icon]}
                  </svg>
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
          <div className="sb-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sb-user-info">
              <div className="sb-user-name">{profile?.full_name || 'User'}</div>
              <div className="sb-user-role">{profile?.role || 'user'}</div>
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
