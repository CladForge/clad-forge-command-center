import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  initialClients,
  initialProjects,
  initialSOWs,
  initialActivities,
  initialSettings,
  initialInvoices,
  initialTimeEntries,
  initialEvents,
  initialContractors,
  initialDeals,
  initialCrmActivities,
  initialChannelPartners,
  initialDocuments,
  initialNotifications,
  initialAutomations,
  generateId,
} from '../data/initialData';

// Snake_case <-> camelCase transforms
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

function camelToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj === null || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Known DB columns per table — prevents inserting fields that don't exist in Supabase
const TABLE_COLUMNS = {
  clients: ['id','name','company','email','phone','industry','status','notes','value','created_at','created_by','brand_colors','brand_fonts','brand_tone','brand_logo_url','website','company_size','contacts'],
  projects: ['id','title','client_id','stage','budget','deadline','description','created_at','created_by'],
  sows: ['id','client_id','project_title','description','scope_items','deliverables','timeline','budget','terms','status','created_at','created_by'],
  activities: ['id','type','message','icon','created_at','created_by'],
  settings: ['id','company_name','company_email','company_phone','company_address','company_website','tax_id','owner_name','owner_title','default_payment_terms','default_currency','default_tax_rate','invoice_prefix','invoice_next_number','default_invoice_notes','payment_instructions','auto_detect_overdue','sow_prefix','sow_footer','default_sow_terms','default_payment_schedule','default_hourly_rate','time_rounding','work_hours_per_day','pipeline_stages','default_stage','theme','accent_color','date_format','sidebar_collapsed','invoice_reminder_days','client_follow_up_days','project_deadline_warning_days','default_industry','custom_industries','updated_at'],
  invoices: ['id','invoice_number','client_id','client_name','project_id','project_title','items','tax_rate','discount','status','due_date','sent_date','paid_date','paid_amount','notes','created_at','created_by'],
  time_entries: ['id','project_id','description','hours','minutes','date','created_at','created_by'],
  events: ['id','title','description','date','time','end_time','type','color','entity_type','entity_id','created_at','created_by'],
  contractors: ['id','first_name','last_name','company','email','phone','specialty','rate','status','website','notes','date_added','assigned_projects','created_at','created_by'],
  deals: ['id','title','company','contact_name','contact_title','contact_email','contact_phone','stage','source','value','probability','expected_close_date','client_id','priority','next_step','tags','won_at','lost_at','created_at','updated_at','created_by'],
  crm_activities: ['id','deal_id','title','type','description','activity_date','completed','created_at','created_by'],
  channel_partners: ['id','name','title','company','industry','email','phone','location','notes','created_at','created_by'],
  documents: ['id','name','type','client_id','project_id','file_url','file_size','notes','status','created_at','created_by'],
  notifications: ['id','text','type','entity_type','entity_id','read','user_id','created_at'],
  automations: ['id','name','description','trigger_type','trigger_config','actions','status','run_count','last_run_at','created_at','created_by'],
};

// Strip fields not in the DB table before sending to Supabase
function stripForDB(tableName, snakeObj) {
  const cols = TABLE_COLUMNS[tableName];
  if (!cols) return snakeObj;
  const result = {};
  for (const [key, value] of Object.entries(snakeObj)) {
    if (cols.includes(key)) result[key] = value;
  }
  return result;
}

function formatTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function useSupabaseData() {
  const [clients, setClientsState] = useState(initialClients);
  const [projects, setProjectsState] = useState(initialProjects);
  const [sows, setSOWsState] = useState(initialSOWs);
  const [activities, setActivitiesState] = useState(initialActivities);
  const [settings, setSettingsState] = useState(initialSettings);
  const [invoices, setInvoicesState] = useState(initialInvoices);
  const [timeEntries, setTimeEntriesState] = useState(initialTimeEntries);
  const [events, setEventsState] = useState(initialEvents);
  const [contractors, setContractorsState] = useState(initialContractors);
  const [deals, setDealsState] = useState(initialDeals);
  const [crmActivities, setCrmActivitiesState] = useState(initialCrmActivities);
  const [channelPartners, setChannelPartnersState] = useState(initialChannelPartners);
  const [documents, setDocumentsState] = useState(initialDocuments);
  const [notifications, setNotificationsState] = useState(initialNotifications);
  const [automations, setAutomationsState] = useState(initialAutomations);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);

  // Load all data from Supabase on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [
          clientsRes, projectsRes, sowsRes, activitiesRes, settingsRes,
          invoicesRes, timeEntriesRes, eventsRes, contractorsRes,
          dealsRes, crmActivitiesRes, channelPartnersRes, documentsRes, notificationsRes, automationsRes,
        ] = await Promise.all([
          supabase.from('clients').select('*').order('created_at', { ascending: false }),
          supabase.from('projects').select('*').order('created_at', { ascending: false }),
          supabase.from('sows').select('*').order('created_at', { ascending: false }),
          supabase.from('activities').select('*').order('created_at', { ascending: false }),
          supabase.from('settings').select('*').eq('id', 'default').single(),
          supabase.from('invoices').select('*').order('created_at', { ascending: false }),
          supabase.from('time_entries').select('*').order('created_at', { ascending: false }),
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase.from('contractors').select('*').order('created_at', { ascending: false }),
          supabase.from('deals').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_activities').select('*').order('created_at', { ascending: false }),
          supabase.from('channel_partners').select('*').order('created_at', { ascending: false }),
          supabase.from('documents').select('*').order('created_at', { ascending: false }),
          supabase.from('notifications').select('*').order('created_at', { ascending: false }),
          supabase.from('automations').select('*').order('created_at', { ascending: false }),
        ]);

        if (clientsRes.error) throw clientsRes.error;

        setClientsState(clientsRes.data.map(snakeToCamel));
        setProjectsState(projectsRes.data.map(snakeToCamel));
        setSOWsState(sowsRes.data.map(snakeToCamel));

        // Format activity times
        setActivitiesState(activitiesRes.data.map(a => ({
          ...snakeToCamel(a),
          time: formatTime(a.created_at),
        })));

        if (settingsRes.data) {
          const s = snakeToCamel(settingsRes.data);
          const { id: _id, updatedAt: _u, ...rest } = s;
          setSettingsState(rest);
        }

        if (invoicesRes.data) setInvoicesState(invoicesRes.data.map(snakeToCamel));
        if (timeEntriesRes.data) setTimeEntriesState(timeEntriesRes.data.map(snakeToCamel));
        if (eventsRes.data) setEventsState(eventsRes.data.map(snakeToCamel));
        if (contractorsRes.data) setContractorsState(contractorsRes.data.map(snakeToCamel));
        if (dealsRes.data) setDealsState(dealsRes.data.map(snakeToCamel));
        if (crmActivitiesRes.data) setCrmActivitiesState(crmActivitiesRes.data.map(snakeToCamel));
        if (channelPartnersRes.data) setChannelPartnersState(channelPartnersRes.data.map(snakeToCamel));
        if (documentsRes.data) setDocumentsState(documentsRes.data.map(snakeToCamel));
        if (notificationsRes.data) setNotificationsState(notificationsRes.data.map(snakeToCamel));
        if (automationsRes.data) setAutomationsState(automationsRes.data.map(snakeToCamel));

        connectedRef.current = true;
        setConnected(true);
        console.log('[CladForge] Supabase connected — all data loaded');
      } catch (err) {
        console.warn('[CladForge] Supabase unavailable, using local data:', err.message);
        connectedRef.current = false;
        setConnected(false);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  // Add activity helper
  const addActivity = useCallback(async (type, message, icon) => {
    const activity = { id: generateId(), type, message, icon, time: 'Just now' };
    setActivitiesState(prev => [activity, ...prev]);

    if (connectedRef.current) {
      await supabase.from('activities').insert({
        id: activity.id,
        type,
        message,
        icon,
      });
    }
  }, []);

  // CLIENT CRUD
  const setClients = useCallback((updater) => {
    setClientsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (next.length > prev.length) {
        const newClient = next.find(n => !prev.some(p => p.id === n.id));
        if (newClient && connectedRef.current) {
          supabase.from('clients').insert(stripForDB('clients', camelToSnake(newClient))).then(({ error }) => { if (error) console.error('Client insert error:', error); });
          addActivity('client', `New client added: ${newClient.company}`, 'user-plus');
        }
      } else if (next.length < prev.length) {
        const removed = prev.find(p => !next.some(n => n.id === p.id));
        if (removed && connectedRef.current) {
          supabase.from('clients').delete().eq('id', removed.id).then(({ error }) => { if (error) console.error('Client delete error:', error); });
          addActivity('client', `Client removed: ${removed.company}`, 'pause');
        }
      } else {
        for (const item of next) {
          const old = prev.find(p => p.id === item.id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            if (connectedRef.current) {
              const { createdAt: _ca, ...rest } = item;
              supabase.from('clients').update(stripForDB('clients', camelToSnake(rest))).eq('id', item.id).then(({ error }) => { if (error) console.error('Client update error:', error); });
            }
            if (old.status !== item.status) {
              addActivity('client', `${item.company} status changed to ${item.status.replace('-', ' ')}`, 'arrow-right');
            }
          }
        }
      }

      return next;
    });
  }, [addActivity]);

  // PROJECT CRUD
  const setProjects = useCallback((updater) => {
    setProjectsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (next.length > prev.length) {
        const newProject = next.find(n => !prev.some(p => p.id === n.id));
        if (newProject && connectedRef.current) {
          supabase.from('projects').insert(stripForDB('projects', camelToSnake(newProject))).then(({ error }) => { if (error) console.error('Project insert error:', error); });
          addActivity('project', `New project created: ${newProject.title}`, 'play');
        }
      } else if (next.length < prev.length) {
        const removed = prev.find(p => !next.some(n => n.id === p.id));
        if (removed && connectedRef.current) {
          supabase.from('projects').delete().eq('id', removed.id).then(({ error }) => { if (error) console.error('Project delete error:', error); });
          addActivity('project', `Project removed: ${removed.title}`, 'pause');
        }
      } else {
        for (const item of next) {
          const old = prev.find(p => p.id === item.id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            if (connectedRef.current) {
              const { createdAt: _ca, ...rest } = item;
              supabase.from('projects').update(stripForDB('projects', camelToSnake(rest))).eq('id', item.id).then(({ error }) => { if (error) console.error('Project update error:', error); });
            }
            if (old.stage !== item.stage) {
              const stageLabels = { lead: 'Lead', proposal: 'Proposal', active: 'Active', review: 'Review', completed: 'Completed' };
              addActivity('project', `${item.title} moved to ${stageLabels[item.stage] || item.stage}`, 'arrow-right');
            }
          }
        }
      }

      return next;
    });
  }, [addActivity]);

  // SOW CRUD
  const setSOWs = useCallback((updater) => {
    setSOWsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (next.length > prev.length) {
        const newSOW = next.find(n => !prev.some(p => p.id === n.id));
        if (newSOW && connectedRef.current) {
          supabase.from('sows').insert(stripForDB('sows', camelToSnake(newSOW))).then(({ error }) => { if (error) console.error('SOW insert error:', error); });
          addActivity('sow', `SOW created: ${newSOW.projectTitle}`, 'file-text');
        }
      } else if (next.length < prev.length) {
        const removed = prev.find(p => !next.some(n => n.id === p.id));
        if (removed && connectedRef.current) {
          supabase.from('sows').delete().eq('id', removed.id).then(({ error }) => { if (error) console.error('SOW delete error:', error); });
        }
      } else {
        for (const item of next) {
          const old = prev.find(p => p.id === item.id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            if (connectedRef.current) {
              const { createdAt: _ca, ...rest } = item;
              supabase.from('sows').update(stripForDB('sows', camelToSnake(rest))).eq('id', item.id).then(({ error }) => { if (error) console.error('SOW update error:', error); });
            }
          }
        }
      }

      return next;
    });
  }, [addActivity]);

  // SETTINGS
  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (connectedRef.current) {
        const snaked = camelToSnake(next);
        supabase.from('settings').upsert(stripForDB('settings', { id: 'default', ...snaked, updated_at: new Date().toISOString() })).then(({ error }) => { if (error) console.error('Settings save error:', error); });
      }

      return next;
    });
  }, []);

  // Generic CRUD wrapper factory — uses connectedRef to avoid stale closure
  function makeSetter(setState, tableName, opts = {}) {
    const { labelField = 'title', entityLabel = tableName, activityType = tableName } = opts;
    return (updater) => {
      setState(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;

        if (next.length > prev.length) {
          const added = next.find(n => !prev.some(p => p.id === n.id));
          if (added && connectedRef.current) {
            supabase.from(tableName).insert(stripForDB(tableName, camelToSnake(added))).then(({ error }) => { if (error) console.error(`${entityLabel} insert error:`, error); });
            if (opts.logActivity !== false) {
              addActivity(activityType, `New ${entityLabel} added: ${added[labelField] || added.name || ''}`, opts.icon || 'plus');
            }
          }
        } else if (next.length < prev.length) {
          const removed = prev.find(p => !next.some(n => n.id === p.id));
          if (removed && connectedRef.current) {
            supabase.from(tableName).delete().eq('id', removed.id).then(({ error }) => { if (error) console.error(`${entityLabel} delete error:`, error); });
            if (opts.logActivity !== false) {
              addActivity(activityType, `${entityLabel} removed: ${removed[labelField] || removed.name || ''}`, 'pause');
            }
          }
        } else {
          for (const item of next) {
            const old = prev.find(p => p.id === item.id);
            if (old && JSON.stringify(old) !== JSON.stringify(item)) {
              if (connectedRef.current) {
                const { createdAt: _ca, ...rest } = item;
                supabase.from(tableName).update(stripForDB(tableName, camelToSnake(rest))).eq('id', item.id).then(({ error }) => { if (error) console.error(`${entityLabel} update error:`, error); });
              }
            }
          }
        }

        return next;
      });
    };
  }

  // INVOICE CRUD
  const setInvoices = useCallback(
    makeSetter(setInvoicesState, 'invoices', { labelField: 'invoiceNumber', entityLabel: 'invoice', icon: 'file-text' }),
    [addActivity]
  );

  // TIME ENTRY CRUD
  const setTimeEntries = useCallback(
    makeSetter(setTimeEntriesState, 'time_entries', { labelField: 'description', entityLabel: 'time entry', logActivity: false }),
    [addActivity]
  );

  // EVENT CRUD
  const setEvents = useCallback(
    makeSetter(setEventsState, 'events', { labelField: 'title', entityLabel: 'event', icon: 'calendar' }),
    [addActivity]
  );

  // CONTRACTOR CRUD
  const setContractors = useCallback(
    makeSetter(setContractorsState, 'contractors', { labelField: 'firstName', entityLabel: 'contractor', icon: 'user-plus' }),
    [addActivity]
  );

  // DEAL CRUD
  const setDeals = useCallback(
    makeSetter(setDealsState, 'deals', { labelField: 'title', entityLabel: 'deal', icon: 'trending-up' }),
    [addActivity]
  );

  // CRM ACTIVITY CRUD
  const setCrmActivities = useCallback(
    makeSetter(setCrmActivitiesState, 'crm_activities', { labelField: 'title', entityLabel: 'CRM activity', logActivity: false }),
    [addActivity]
  );

  // CHANNEL PARTNER CRUD
  const setChannelPartners = useCallback(
    makeSetter(setChannelPartnersState, 'channel_partners', { labelField: 'name', entityLabel: 'channel partner', icon: 'users' }),
    [addActivity]
  );

  // DOCUMENT CRUD
  const setDocuments = useCallback(
    makeSetter(setDocumentsState, 'documents', { labelField: 'name', entityLabel: 'document', icon: 'file' }),
    [addActivity]
  );

  // NOTIFICATION CRUD
  const setNotifications = useCallback(
    makeSetter(setNotificationsState, 'notifications', { labelField: 'text', entityLabel: 'notification', logActivity: false }),
    [addActivity]
  );

  // Helper to add a notification
  const addNotification = useCallback(async (text, type = 'info', entityType = '', entityId = '') => {
    const notification = { id: generateId(), text, type, entityType, entityId, read: false, createdAt: new Date().toISOString() };
    setNotificationsState(prev => [notification, ...prev]);
    if (connectedRef.current) {
      await supabase.from('notifications').insert(camelToSnake(notification));
    }
  }, []);

  // AUTOMATION CRUD
  const setAutomations = useCallback(
    makeSetter(setAutomationsState, 'automations', { labelField: 'name', entityLabel: 'automation', icon: 'zap' }),
    [addActivity]
  );

  return {
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
    loading,
    connected,
  };
}
