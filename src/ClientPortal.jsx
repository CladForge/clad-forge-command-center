import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useClientPortalData } from './hooks/useClientPortalData';
import PortalSidebar from './components/portal/PortalSidebar';
import PortalTopBar from './components/portal/PortalTopBar';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalProjects from './pages/portal/PortalProjects';
import PortalProjectDetail from './pages/portal/PortalProjectDetail';
import PortalInvoices from './pages/portal/PortalInvoices';
import PortalProposals from './pages/portal/PortalProposals';
import PortalRecurring from './pages/portal/PortalRecurring';
import PortalAccount from './pages/portal/PortalAccount';
import PortalApplications from './pages/portal/PortalApplications';
import PortalApplicationDetail from './pages/portal/PortalApplicationDetail';
import { CLAD_FORGE_LOGO_DATA_URI } from './lib/brand';

// Top-level component for the client portal. Mounted by App.jsx when the
// authenticated user has profile.role === 'client'. Has its own routes,
// data hook, and layout — completely separate from the admin app.
export default function ClientPortal({ profile, onSignOut }) {
  const location = useLocation();
  const navigate = useNavigate();
  const data = useClientPortalData(profile?.id);

  // Apply theme from settings (matches admin app behavior)
  useEffect(() => {
    const theme = data.settings?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, [data.settings?.theme]);

  // Anyone hitting a non-portal URL gets pushed to /portal so we don't leak
  // any admin paths into client routing.
  useEffect(() => {
    if (!location.pathname.startsWith('/portal')) {
      navigate('/portal', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Loading state — initial memberships fetch
  if (data.loading && !data.activeClient && data.memberships.length === 0) {
    return (
      <div className="portal-placeholder">
        <div className="portal-placeholder__card">
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
          <p className="portal-placeholder__sub">Loading your portal…</p>
        </div>
      </div>
    );
  }

  // No memberships — user is authenticated as 'client' but isn't linked to
  // any company yet. Tell them to contact admin.
  if (!data.loading && data.memberships.length === 0) {
    return (
      <div className="portal-placeholder">
        <div className="portal-placeholder__card">
          <img src={CLAD_FORGE_LOGO_DATA_URI} alt="Clad Forge" className="portal-placeholder__logo" />
          <h1 className="portal-placeholder__title">Portal Access Pending</h1>
          <p className="portal-placeholder__lede">
            Your account is signed in, but it isn&apos;t linked to a company yet.
            Please contact your Clad Forge representative so they can finish setting up your portal access.
          </p>
          <div className="portal-placeholder__actions">
            <button className="btn btn--primary" onClick={onSignOut}>Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  // Error state — something went wrong loading
  if (data.error) {
    return (
      <div className="portal-placeholder">
        <div className="portal-placeholder__card">
          <img src={CLAD_FORGE_LOGO_DATA_URI} alt="Clad Forge" className="portal-placeholder__logo" />
          <h1 className="portal-placeholder__title">Could Not Load Portal</h1>
          <p className="portal-placeholder__lede">{data.error}</p>
          <div className="portal-placeholder__actions">
            <button className="btn btn--primary" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal">
      <PortalSidebar
        profile={profile}
        activeClient={data.activeClient}
        settings={data.settings}
        onSignOut={onSignOut}
      />
      <div className="portal-main">
        <PortalTopBar
          activeClient={data.activeClient}
          linkedClients={data.linkedClients}
          activeClientId={data.activeClientId}
          setActiveClientId={data.setActiveClientId}
          portalRole={data.portalRole}
        />
        <main className="portal-content">
          {data.loading && data.activeClient ? (
            // Subsequent loads (e.g. switching company) — show light spinner
            // but keep layout so it doesn't feel jarring.
            <div style={{ padding: 80, textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <Routes>
              <Route path="/portal" element={
                <PortalDashboard
                  activeClient={data.activeClient}
                  projects={data.projects}
                  invoices={data.invoices}
                  sows={data.sows}
                  applications={data.applications}
                />
              } />
              <Route path="/portal/projects" element={
                <PortalProjects projects={data.projects} invoices={data.invoices} />
              } />
              <Route path="/portal/projects/:id" element={
                <PortalProjectDetail
                  projects={data.projects}
                  invoices={data.invoices}
                  milestones={data.milestones}
                  reloadMilestones={data.reloadMilestones}
                />
              } />
              <Route path="/portal/invoices" element={
                <PortalInvoices
                  invoices={data.invoices}
                  activeClient={data.activeClient}
                  settings={data.settings}
                />
              } />
              <Route path="/portal/proposals" element={
                <PortalProposals
                  sows={data.sows}
                  activeClient={data.activeClient}
                  settings={data.settings}
                />
              } />
              <Route path="/portal/applications" element={
                <PortalApplications
                  applications={data.applications}
                  recurringExpenses={data.recurringExpenses}
                />
              } />
              <Route path="/portal/applications/:id" element={
                <PortalApplicationDetail
                  applications={data.applications}
                  recurringExpenses={data.recurringExpenses}
                  invoices={data.invoices}
                  appScreenshots={data.appScreenshots}
                  annotationPins={data.annotationPins}
                  markupSets={data.markupSets}
                  reloadScreenshots={data.reloadScreenshots}
                  profile={profile}
                />
              } />
              <Route path="/portal/expenses" element={
                <PortalRecurring recurringExpenses={data.recurringExpenses} />
              } />
              <Route path="/portal/account" element={
                <PortalAccount
                  profile={profile}
                  activeClient={data.activeClient}
                  settings={data.settings}
                  memberships={data.memberships}
                  onSignOut={onSignOut}
                />
              } />
              <Route path="*" element={<Navigate to="/portal" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
