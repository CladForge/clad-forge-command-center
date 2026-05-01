import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useSupabaseData } from './hooks/useSupabaseData';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Pipeline from './pages/Pipeline';
import ProjectDetail from './pages/ProjectDetail';
import Proposals from './pages/Proposals';
import Invoices from './pages/Invoices';
import BrandingGuide from './pages/BrandingGuide';
import Reports from './pages/Reports';
import Calendar from './pages/Calendar';
import AIAssistant from './pages/AIAssistant';
import Automations from './pages/Automations';
import RecurringExpenses from './pages/RecurringExpenses';
import Finances from './pages/Finances';
import Settings from './pages/Settings';
import Documents from './pages/Documents';
import Onboarding from './pages/Onboarding';
import OnboardingReview from './components/OnboardingReview';
import ProposalSign from './pages/ProposalSign';
import InvoiceView from './pages/InvoiceView';
import AcceptInvite from './pages/AcceptInvite';
import PortalPlaceholder from './components/PortalPlaceholder';
import ClientPortal from './ClientPortal';
import './App.css';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);

  const {
    clients, setClients,
    projects, setProjects,
    sows, setSOWs,
    activities,
    settings, setSettings,
    invoices, setInvoices,
    events, setEvents,
    documents, setDocuments,
    notifications, setNotifications,
    addNotification,
    automations, setAutomations,
    recurringExpenses, setRecurringExpenses,
    financeEntries, setFinanceEntries,
    taxPayments, setTaxPayments,
    clientUsers, setClientUsers, reloadClientUsers,
    profiles, reloadProfiles,
    milestones, setMilestones,
    applications, setApplications,
    appScreenshots, annotationPins, markupSets, reloadAdminScreenshots,
    loading, connected,
  } = useSupabaseData();

  // Listen for auth changes
  useEffect(() => {
    async function fetchProfile(userId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Apply saved theme on load
  useEffect(() => {
    const savedTheme = settings?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [settings?.theme]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // (Migration adds 'client' to profiles.role CHECK and edge function force-
  // updates role to 'client' on invite. See supabase-migration.sql.)

  // The accept-invite page renders BEFORE any session/loading checks because
  // its whole job is to handle the magic-link auth handoff. supabase-js may
  // be processing the URL hash mid-render; <AcceptInvite /> manages its own
  // loading state and waits for the session to materialize.
  if (window.location.pathname === '/accept-invite') {
    return <AcceptInvite />;
  }

  // Loading state
  if (session === undefined) {
    return (
      <div className="app app--loading">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <span className="loading-text">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in — show login, but allow public routes through
  if (!session) {
    return (
      <Routes>
        <Route path="/onboard" element={<Onboarding />} />
        <Route path="/sign/:token" element={<ProposalSign />} />
        <Route path="/invoice/:token" element={<InvoiceView />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Data still loading
  if (loading) {
    return (
      <div className="app app--loading">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <span className="loading-text">Initializing Command Center...</span>
        </div>
      </div>
    );
  }

  // Public pages — render without sidebar/topbar even when logged in
  if (window.location.pathname.startsWith('/sign/') || window.location.pathname.startsWith('/invoice/')) {
    return (
      <Routes>
        <Route path="/sign/:token" element={<ProposalSign />} />
        <Route path="/invoice/:token" element={<InvoiceView />} />
      </Routes>
    );
  }

  // Client portal users: route AWAY from the admin app entirely. ClientPortal
  // has its own routes, data hook, and layout — admins and clients never
  // share rendered components. Falls back to <PortalPlaceholder /> if profile
  // is still loading (rare race condition).
  if (profile?.role === 'client') {
    if (!profile?.id) {
      return <PortalPlaceholder profile={profile} onSignOut={handleSignOut} />;
    }
    // Merge auth email/full_name into profile since the profiles table doesn't
    // store email (it lives on auth.users) and a user may not have a full_name
    // yet right after invite acceptance.
    const enrichedProfile = {
      ...profile,
      email: session?.user?.email || '',
      fullName: profile.fullName || profile.full_name || session?.user?.user_metadata?.full_name || '',
    };
    return <ClientPortal profile={enrichedProfile} onSignOut={handleSignOut} />;
  }

  return (
    <div className="app">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        profile={profile}
        onSignOut={handleSignOut}
      />
      <div className={`app__main ${sidebarCollapsed ? 'app__main--expanded' : ''}`}>
        <TopBar settings={settings} connected={connected} profile={profile} notifications={notifications} setNotifications={setNotifications} />
        <main className="app__content">
          <Routes>
            <Route path="/" element={<Dashboard clients={clients} projects={projects} sows={sows} settings={settings} invoices={invoices} applications={applications} recurringExpenses={recurringExpenses} annotationPins={annotationPins} appScreenshots={appScreenshots} notifications={notifications} setClients={setClients} addNotification={addNotification} />} />
            <Route path="/clients" element={<Clients clients={clients} setClients={setClients} projects={projects} sows={sows} settings={settings} invoices={invoices} clientUsers={clientUsers} setClientUsers={setClientUsers} reloadClientUsers={reloadClientUsers} profiles={profiles} reloadProfiles={reloadProfiles} applications={applications} setApplications={setApplications} appScreenshots={appScreenshots} annotationPins={annotationPins} markupSets={markupSets} recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses} reloadAdminScreenshots={reloadAdminScreenshots} profile={profile} />} />
            <Route path="/pipeline" element={<Pipeline projects={projects} setProjects={setProjects} clients={clients} sows={sows} setSOWs={setSOWs} />} />
            <Route path="/projects/:id" element={<ProjectDetail projects={projects} setProjects={setProjects} clients={clients} sows={sows} invoices={invoices} documents={documents} milestones={milestones} setMilestones={setMilestones} />} />
            <Route path="/proposals" element={<Proposals clients={clients} projects={projects} setProjects={setProjects} sows={sows} setSOWs={setSOWs} settings={settings} />} />
            <Route path="/invoices" element={<Invoices clients={clients} projects={projects} settings={settings} invoices={invoices} setInvoices={setInvoices} />} />
            <Route path="/recurring" element={<RecurringExpenses clients={clients} projects={projects} expenses={recurringExpenses} setExpenses={setRecurringExpenses} settings={settings} />} />
            <Route path="/finances" element={<Finances clients={clients} projects={projects} invoices={invoices} settings={settings} entries={financeEntries} setEntries={setFinanceEntries} taxPayments={taxPayments} setTaxPayments={setTaxPayments} />} />
            <Route path="/reports" element={<Reports clients={clients} projects={projects} sows={sows} invoices={invoices} recurringExpenses={recurringExpenses} applications={applications} annotationPins={annotationPins} settings={settings} />} />
            <Route path="/calendar" element={<Calendar events={events} setEvents={setEvents} projects={projects} invoices={invoices} sows={sows} recurringExpenses={recurringExpenses} milestones={milestones} markupSets={markupSets} clients={clients} settings={settings} setSettings={setSettings} />} />
            <Route path="/ai" element={<AIAssistant clients={clients} projects={projects} sows={sows} invoices={invoices} settings={settings} />} />
            <Route path="/documents" element={<Documents documents={documents} setDocuments={setDocuments} clients={clients} projects={projects} />} />
            <Route path="/automations" element={<Automations automations={automations} setAutomations={setAutomations} />} />
            <Route path="/branding" element={<BrandingGuide settings={settings} />} />
            <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} profile={profile} onSignOut={handleSignOut} activities={activities} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
