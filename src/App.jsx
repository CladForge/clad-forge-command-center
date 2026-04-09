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
import Settings from './pages/Settings';
import './App.css';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);

  const {
    clients, projects, sows, activities, settings,
    setClients, setProjects, setSOWs, setSettings,
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

  // Not logged in
  if (!session) {
    return <Login />;
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
        <TopBar settings={settings} connected={connected} profile={profile} />
        <main className="app__content">
          <Routes>
            <Route path="/" element={<Dashboard clients={clients} projects={projects} sows={sows} activities={activities} settings={settings} />} />
            <Route path="/clients" element={<Clients clients={clients} setClients={setClients} projects={projects} sows={sows} settings={settings} />} />
            <Route path="/pipeline" element={<Pipeline projects={projects} setProjects={setProjects} clients={clients} />} />
            <Route path="/proposals" element={<Proposals clients={clients} projects={projects} sows={sows} setSOWs={setSOWs} settings={settings} />} />
            <Route path="/invoices" element={<Invoices clients={clients} projects={projects} settings={settings} />} />
            <Route path="/time" element={<TimeTracker projects={projects} clients={clients} />} />
            <Route path="/branding" element={<BrandingGuide />} />
            <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} profile={profile} onSignOut={handleSignOut} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
