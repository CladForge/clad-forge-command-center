import { useState, useEffect, useCallback } from 'react';
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

        setConnected(true);
      } catch (err) {
        console.warn('Supabase unavailable, using local data:', err.message);
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

    if (connected) {
      await supabase.from('activities').insert({
        id: activity.id,
        type,
        message,
        icon,
      });
    }
  }, [connected]);

  // CLIENT CRUD
  const setClients = useCallback((updater) => {
    setClientsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      // Determine what changed
      if (next.length > prev.length) {
        // Added
        const newClient = next.find(n => !prev.some(p => p.id === n.id));
        if (newClient && connected) {
          supabase.from('clients').insert(camelToSnake(newClient));
          addActivity('client', `New client added: ${newClient.name} (${newClient.company})`, 'user-plus');
        }
      } else if (next.length < prev.length) {
        // Deleted
        const removed = prev.find(p => !next.some(n => n.id === p.id));
        if (removed && connected) {
          supabase.from('clients').delete().eq('id', removed.id);
          addActivity('client', `Client removed: ${removed.name}`, 'pause');
        }
      } else {
        // Updated
        for (const item of next) {
          const old = prev.find(p => p.id === item.id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            if (connected) {
              const { createdAt: _ca, ...rest } = item;
              supabase.from('clients').update(camelToSnake(rest)).eq('id', item.id);
            }
            if (old.status !== item.status) {
              addActivity('client', `${item.name} status changed to ${item.status.replace('-', ' ')}`, 'arrow-right');
            }
          }
        }
      }

      return next;
    });
  }, [connected, addActivity]);

  // PROJECT CRUD
  const setProjects = useCallback((updater) => {
    setProjectsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (next.length > prev.length) {
        const newProject = next.find(n => !prev.some(p => p.id === n.id));
        if (newProject && connected) {
          supabase.from('projects').insert(camelToSnake(newProject));
          addActivity('project', `New project created: ${newProject.title}`, 'play');
        }
      } else if (next.length < prev.length) {
        const removed = prev.find(p => !next.some(n => n.id === p.id));
        if (removed && connected) {
          supabase.from('projects').delete().eq('id', removed.id);
          addActivity('project', `Project removed: ${removed.title}`, 'pause');
        }
      } else {
        for (const item of next) {
          const old = prev.find(p => p.id === item.id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            if (connected) {
              const { createdAt: _ca, ...rest } = item;
              supabase.from('projects').update(camelToSnake(rest)).eq('id', item.id);
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
  }, [connected, addActivity]);

  // SOW CRUD
  const setSOWs = useCallback((updater) => {
    setSOWsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (next.length > prev.length) {
        const newSOW = next.find(n => !prev.some(p => p.id === n.id));
        if (newSOW && connected) {
          supabase.from('sows').insert(camelToSnake(newSOW));
          addActivity('sow', `SOW created: ${newSOW.projectTitle}`, 'file-text');
        }
      } else if (next.length < prev.length) {
        const removed = prev.find(p => !next.some(n => n.id === p.id));
        if (removed && connected) {
          supabase.from('sows').delete().eq('id', removed.id);
        }
      } else {
        for (const item of next) {
          const old = prev.find(p => p.id === item.id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            if (connected) {
              const { createdAt: _ca, ...rest } = item;
              supabase.from('sows').update(camelToSnake(rest)).eq('id', item.id);
            }
          }
        }
      }

      return next;
    });
  }, [connected, addActivity]);

  // SETTINGS
  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (connected) {
        const snaked = camelToSnake(next);
        supabase.from('settings').upsert({ id: 'default', ...snaked, updated_at: new Date().toISOString() });
      }

      return next;
    });
  }, [connected]);

  // Generic CRUD wrapper factory
  function makeSetter(setState, tableName, opts = {}) {
    const { labelField = 'title', entityLabel = tableName, activityType = tableName } = opts;
    return (updater) => {
      setState(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;

        if (next.length > prev.length) {
          const added = next.find(n => !prev.some(p => p.id === n.id));
          if (added && connected) {
            supabase.from(tableName).insert(camelToSnake(added));
            if (opts.logActivity !== false) {
              addActivity(activityType, `New ${entityLabel} added: ${added[labelField] || added.name || ''}`, opts.icon || 'plus');
            }
          }
        } else if (next.length < prev.length) {
          const removed = prev.find(p => !next.some(n => n.id === p.id));
          if (removed && connected) {
            supabase.from(tableName).delete().eq('id', removed.id);
            if (opts.logActivity !== false) {
              addActivity(activityType, `${entityLabel} removed: ${removed[labelField] || removed.name || ''}`, 'pause');
            }
          }
        } else {
          for (const item of next) {
            const old = prev.find(p => p.id === item.id);
            if (old && JSON.stringify(old) !== JSON.stringify(item)) {
              if (connected) {
                const { createdAt: _ca, ...rest } = item;
                supabase.from(tableName).update(camelToSnake(rest)).eq('id', item.id);
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
    [connected, addActivity]
  );

  // TIME ENTRY CRUD
  const setTimeEntries = useCallback(
    makeSetter(setTimeEntriesState, 'time_entries', { labelField: 'description', entityLabel: 'time entry', logActivity: false }),
    [connected, addActivity]
  );

  // EVENT CRUD
  const setEvents = useCallback(
    makeSetter(setEventsState, 'events', { labelField: 'title', entityLabel: 'event', icon: 'calendar' }),
    [connected, addActivity]
  );

  // CONTRACTOR CRUD
  const setContractors = useCallback(
    makeSetter(setContractorsState, 'contractors', { labelField: 'firstName', entityLabel: 'contractor', icon: 'user-plus' }),
    [connected, addActivity]
  );

  // DEAL CRUD
  const setDeals = useCallback(
    makeSetter(setDealsState, 'deals', { labelField: 'title', entityLabel: 'deal', icon: 'trending-up' }),
    [connected, addActivity]
  );

  // CRM ACTIVITY CRUD
  const setCrmActivities = useCallback(
    makeSetter(setCrmActivitiesState, 'crm_activities', { labelField: 'title', entityLabel: 'CRM activity', logActivity: false }),
    [connected, addActivity]
  );

  // CHANNEL PARTNER CRUD
  const setChannelPartners = useCallback(
    makeSetter(setChannelPartnersState, 'channel_partners', { labelField: 'name', entityLabel: 'channel partner', icon: 'users' }),
    [connected, addActivity]
  );

  // DOCUMENT CRUD
  const setDocuments = useCallback(
    makeSetter(setDocumentsState, 'documents', { labelField: 'name', entityLabel: 'document', icon: 'file' }),
    [connected, addActivity]
  );

  // NOTIFICATION CRUD
  const setNotifications = useCallback(
    makeSetter(setNotificationsState, 'notifications', { labelField: 'text', entityLabel: 'notification', logActivity: false }),
    [connected, addActivity]
  );

  // Helper to add a notification
  const addNotification = useCallback(async (text, type = 'info', entityType = '', entityId = '') => {
    const notification = { id: generateId(), text, type, entityType, entityId, read: false, createdAt: new Date().toISOString() };
    setNotificationsState(prev => [notification, ...prev]);
    if (connected) {
      await supabase.from('notifications').insert(camelToSnake(notification));
    }
  }, [connected]);

  // AUTOMATION CRUD
  const setAutomations = useCallback(
    makeSetter(setAutomationsState, 'automations', { labelField: 'name', entityLabel: 'automation', icon: 'zap' }),
    [connected, addActivity]
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
