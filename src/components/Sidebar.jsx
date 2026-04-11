import { NavLink } from 'react-router-dom';
import logo from '../../images/cladforge-logo.svg';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: 'dashboard' },
      { path: '/reports', label: 'Reports', icon: 'reports' },
      { path: '/calendar', label: 'Calendar', icon: 'calendar' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { path: '/clients', label: 'Clients', icon: 'clients' },
      { path: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
      { path: '/crm', label: 'CRM', icon: 'crm' },
      { path: '/contractors', label: 'Contractors', icon: 'contractors' },
      { path: '/proposals', label: 'Proposals', icon: 'sow' },
      { path: '/invoices', label: 'Invoices', icon: 'invoices' },
      { path: '/documents', label: 'Documents', icon: 'documents' },
      { path: '/time', label: 'Time Tracker', icon: 'time' },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { path: '/ai', label: 'AI Assistant', icon: 'ai' },
      { path: '/automations', label: 'Automations', icon: 'automations' },
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
  reports: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  ai: <><path d="M12 2a4 4 0 0 1 4 4c0 1.1-.45 2.1-1.17 2.83L12 12l-2.83-3.17A4 4 0 0 1 12 2z" /><path d="M12 12l4.24 4.24" /><path d="M12 12l-4.24 4.24" /><path d="M12 12v6" /><circle cx="12" cy="21" r="1" /><circle cx="7.76" cy="19.24" r="1" /><circle cx="16.24" cy="19.24" r="1" /></>,
  automations: <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  crm: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>,
  contractors: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
  documents: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></>,
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
