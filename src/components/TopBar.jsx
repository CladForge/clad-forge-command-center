import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const pageTitles = {
  '/': 'Dashboard',
  '/clients': 'Client Tracker',
  '/pipeline': 'Project Pipeline',
  '/sow': 'SOW / Proposals',
  '/invoices': 'Invoices',
  '/time': 'Time Tracker',
  '/branding': 'Brand Guide',
  '/settings': 'Settings',
};

export default function TopBar({ connected }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__spacer" />

      <div className="topbar__right">
        <div className="topbar__status">
          <span className={`topbar__status-dot ${connected ? '' : 'topbar__status-dot--offline'}`} />
          <span className="topbar__status-text">
            {connected ? 'Connected' : 'Local'}
          </span>
        </div>
        <TopBarClock />
      </div>
    </header>
  );
}

function TopBarClock() {
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
