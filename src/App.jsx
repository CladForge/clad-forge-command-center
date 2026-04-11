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
import Proposals from './pages/Proposals';
import Invoices from './pages/Invoices';
import TimeTracker from './pages/TimeTracker';
import BrandingGuide from './pages/BrandingGuide';
import Reports from './pages/Reports';
import Calendar from './pages/Calendar';
import AIAssistant from './pages/AIAssistant';
import Automations from './pages/Automations';
import Settings from './pages/Settings';
import Contractors from './pages/Contractors';
import CRM from './pages/CRM';
import Documents from './pages/Documents';
import Onboarding from './pages/Onboarding';
import OnboardingReview from './components/OnboardingReview';
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
    timeEntries, setTimeEntries,
    events, setEvents,
    contractors, setContractors,
    deals, setDeals,
    crmActivities, setCrmActivities,
    channelPartners, setChannelPartners,
    documents, setDocuments,
    notifications, setNotifications,
    addNotification,
    automations, setAutomations,
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

  // Not logged in — show login, but allow /onboard route through
  if (!session) {
    return (
      <Routes>
        <Route path="/onboard" element={<Onboarding />} />
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
            <Route path="/" element={<Dashboard clients={clients} projects={projects} sows={sows} activities={activities} settings={settings} invoices={invoices} timeEntries={timeEntries} notifications={notifications} setClients={setClients} addNotification={addNotification} />} />
            <Route path="/clients" element={<Clients clients={clients} setClients={setClients} projects={projects} sows={sows} settings={settings} />} />
            <Route path="/pipeline" element={<Pipeline projects={projects} setProjects={setProjects} clients={clients} />} />
            <Route path="/proposals" element={<Proposals clients={clients} projects={projects} sows={sows} setSOWs={setSOWs} settings={settings} />} />
            <Route path="/invoices" element={<Invoices clients={clients} projects={projects} settings={settings} invoices={invoices} setInvoices={setInvoices} />} />
            <Route path="/time" element={<TimeTracker projects={projects} clients={clients} entries={timeEntries} setEntries={setTimeEntries} />} />
            <Route path="/reports" element={<Reports clients={clients} projects={projects} sows={sows} invoices={invoices} timeEntries={timeEntries} settings={settings} />} />
            <Route path="/calendar" element={<Calendar events={events} setEvents={setEvents} projects={projects} invoices={invoices} clients={clients} />} />
            <Route path="/ai" element={<AIAssistant clients={clients} projects={projects} sows={sows} invoices={invoices} settings={settings} />} />
            <Route path="/contractors" element={<Contractors contractors={contractors} setContractors={setContractors} projects={projects} />} />
            <Route path="/crm" element={<CRM deals={deals} setDeals={setDeals} crmActivities={crmActivities} setCrmActivities={setCrmActivities} channelPartners={channelPartners} setChannelPartners={setChannelPartners} clients={clients} />} />
            <Route path="/documents" element={<Documents documents={documents} setDocuments={setDocuments} clients={clients} projects={projects} />} />
            <Route path="/automations" element={<Automations automations={automations} setAutomations={setAutomations} />} />
            <Route path="/branding" element={<BrandingGuide />} />
            <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} profile={profile} onSignOut={handleSignOut} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
