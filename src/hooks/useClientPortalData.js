import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Snake_case -> camelCase, matching useSupabaseData's transform
function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// Loads ALL the data a portal user needs, scoped to the company they're
// currently viewing. A portal user can belong to multiple client companies
// (Owner of Acme Co, Billing of Beta Co) — `memberships` lists them all and
// `activeClientId` controls which company's data is loaded into the portal.
//
// Phase 2 relies on client-side filtering for security. Phase 3 hardens this
// at the database level via RLS so a determined user can't bypass the UI.
//
// Note: time entries, activities, contractors, etc. are not loaded here on
// purpose — clients don't see those. Add only what the portal actually shows.
export function useClientPortalData(authUserId) {
  const [memberships, setMemberships] = useState([]);
  const [linkedClients, setLinkedClients] = useState([]);
  const [activeClientId, setActiveClientIdState] = useState(null);
  const [activeClient, setActiveClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [sows, setSOWs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [applications, setApplications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketComments, setTicketComments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Step 1: load memberships once. This determines which clients this user
  // has access to. Also fetches the company names so we can show them in a
  // switcher without making N more queries.
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;

    async function loadMemberships() {
      const { data: cuRows, error: cuErr } = await supabase
        .from('client_users')
        .select('*')
        .eq('auth_user_id', authUserId);

      if (cancelled) return;
      if (cuErr) {
        setError('Could not load your portal access. Please contact your Clad Forge contact.');
        setLoading(false);
        return;
      }

      const camelMemberships = (cuRows || []).map(snakeToCamel);
      setMemberships(camelMemberships);

      if (camelMemberships.length === 0) {
        setLoading(false); // Empty state — handled by ClientPortal
        return;
      }

      const ids = camelMemberships.map(m => m.clientId);
      const { data: clientRows } = await supabase
        .from('clients').select('id, company, brand_logo_url, brand_colors').in('id', ids);
      if (cancelled) return;

      setLinkedClients((clientRows || []).map(snakeToCamel));

      // Default to the first membership unless we already picked one
      setActiveClientIdState(prev => prev || camelMemberships[0].clientId);

      // Best-effort last-seen update — fire and forget
      supabase.from('client_users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId)
        .then(() => {});
    }

    loadMemberships();
    return () => { cancelled = true; };
  }, [authUserId]);

  // Step 2: when the active client changes, reload everything scoped to it.
  // Settings is global (singleton with id='default') so we load it here too,
  // since the portal shows your company branding from settings.
  useEffect(() => {
    if (!activeClientId) return;
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        const [clientRes, projectsRes, invoicesRes, sowsRes, documentsRes, recurringRes, settingsRes, applicationsRes, ticketsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', activeClientId).single(),
          supabase.from('projects').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
          supabase.from('invoices').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
          supabase.from('sows').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
          supabase.from('documents').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
          supabase.from('recurring_expenses').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
          supabase.from('settings').select('*').eq('id', 'default').single(),
          supabase.from('applications').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
          supabase.from('service_tickets').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false }),
        ]);

        if (cancelled) return;

        if (clientRes.data) setActiveClient(snakeToCamel(clientRes.data));
        const projectsList = (projectsRes.data || []).map(snakeToCamel);
        setProjects(projectsList);
        // Hide drafts and cancelled rows from clients — they should only see
        // invoices/proposals the admin has actually sent. Filtering at the
        // source keeps this consistent across every portal page (dashboard,
        // list, project detail) without per-page filter logic.
        setInvoices(
          (invoicesRes.data || [])
            .map(snakeToCamel)
            .filter(i => i.status !== 'draft' && i.status !== 'cancelled')
        );
        setSOWs(
          (sowsRes.data || [])
            .map(snakeToCamel)
            .filter(s => s.status !== 'draft')
        );
        setDocuments((documentsRes.data || []).map(snakeToCamel));
        setRecurringExpenses((recurringRes.data || []).map(snakeToCamel));
        if (settingsRes.data) setSettings(snakeToCamel(settingsRes.data));
        // Hide archived applications from clients (admin can see them all
        // via the admin app; clients only care about active ones).
        setApplications(
          (applicationsRes.data || [])
            .map(snakeToCamel)
            .filter(a => a.status !== 'archived')
        );

        // Tickets — RLS already scopes; we still set client-side for clarity
        setTickets((ticketsRes.data || []).map(snakeToCamel));

        // Comments — load all comments for this client's tickets in one go.
        // RLS auto-filters internal-only comments. For larger tenants we'd
        // load lazily per-ticket, but for MVP this is fine.
        const ticketIds = (ticketsRes.data || []).map(t => t.id);
        if (ticketIds.length > 0) {
          const { data: commentsData } = await supabase
            .from('ticket_comments')
            .select('*')
            .in('ticket_id', ticketIds)
            .order('created_at', { ascending: true });
          if (!cancelled) setTicketComments((commentsData || []).map(snakeToCamel));
        } else {
          setTicketComments([]);
        }

        // Milestones: scoped to the active client's projects. Hide draft
        // milestones — they're admin-only working state, not for client eyes.
        const projectIds = projectsList.map(p => p.id);
        if (projectIds.length > 0) {
          const { data: milestonesData } = await supabase
            .from('project_milestones')
            .select('*')
            .in('project_id', projectIds)
            .order('position', { ascending: true });
          if (!cancelled) {
            setMilestones(
              (milestonesData || [])
                .map(snakeToCamel)
                .filter(m => m.status !== 'draft')
            );
          }
        } else {
          setMilestones([]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [activeClientId]);

  const setActiveClientId = useCallback((id) => {
    setActiveClientIdState(id);
  }, []);

  // Convenience: the user's role within the active client
  const activeMembership = memberships.find(m => m.clientId === activeClientId) || null;
  const portalRole = activeMembership?.portalRole || 'viewer';

  /**
   * Reload milestones (used after a client decides on one — RPC-driven
   * updates don't fire onAuthStateChange so we re-fetch optimistically).
   */
  const reloadMilestones = useCallback(async () => {
    const projectIds = projects.map(p => p.id);
    if (projectIds.length === 0) return;
    const { data } = await supabase
      .from('project_milestones')
      .select('*')
      .in('project_id', projectIds)
      .order('position', { ascending: true });
    setMilestones(
      (data || []).map(snakeToCamel).filter(m => m.status !== 'draft')
    );
  }, [projects]);

  /** Reload tickets + their comments (used after client posts a new
   *  ticket or comment — instant optimistic refresh). */
  const reloadTickets = useCallback(async () => {
    if (!activeClientId) return;
    const { data: tData } = await supabase
      .from('service_tickets').select('*')
      .eq('client_id', activeClientId)
      .order('created_at', { ascending: false });
    const ts = (tData || []).map(snakeToCamel);
    setTickets(ts);

    const ticketIds = ts.map(t => t.id);
    if (ticketIds.length > 0) {
      const { data: cData } = await supabase
        .from('ticket_comments').select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });
      setTicketComments((cData || []).map(snakeToCamel));
    } else {
      setTicketComments([]);
    }
  }, [activeClientId]);

  return {
    memberships,
    linkedClients,
    activeClientId,
    setActiveClientId,
    activeClient,
    portalRole,
    projects,
    invoices,
    sows,
    documents,
    recurringExpenses,
    milestones,
    reloadMilestones,
    applications,
    tickets,
    ticketComments,
    reloadTickets,
    settings,
    loading,
    error,
  };
}
