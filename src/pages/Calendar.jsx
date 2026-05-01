import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateId } from '../data/initialData';
import { fetchAllFeeds } from '../lib/calendarFeeds';

// ─────────────────────────────────────────────────────────────────────
// Calendar — month-view grid where every day cell shows the actual
// event titles (not just dots), with auto-events derived from project
// deadlines, milestones, invoice due dates, SOW expirations, recurring
// expenses, and markup-set targets, plus optional iCal feed sync.
// ─────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Each event "type" maps to a consistent color across the calendar so
// the eye learns to scan by category. Manual events default to "custom"
// (brand orange); auto-generated events get type-specific colors so a
// red bar always means "deadline" no matter where it came from.
const TYPE_DEFS = {
  custom:           { label: 'Event',           color: '#ff8c00' },
  meeting:          { label: 'Meeting',         color: '#3b82f6' },
  milestone:        { label: 'Milestone',       color: '#3b82f6' },
  'follow-up':      { label: 'Follow-up',       color: '#a855f7' },
  project_deadline: { label: 'Project Deadline', color: '#ef4444' },
  invoice_due:      { label: 'Invoice Due',     color: '#f59e0b' },
  sow_expiration:   { label: 'Proposal Expires', color: '#a855f7' },
  recurring_due:    { label: 'Recurring Bill',  color: '#14b8a6' },
  markup_target:    { label: 'Markup Target',   color: '#ff8c00' },
  external:         { label: 'External',        color: '#3b82f6' },
};

function colorFor(type, fallback) { return TYPE_DEFS[type]?.color || fallback || '#ff8c00'; }
function labelFor(type) { return TYPE_DEFS[type]?.label || 'Event'; }

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}`; }
function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDayIndex(y, m) { return new Date(y, m, 1).getDay(); }

// Pretty "Mar 14" for sidebar agenda. Avoids Date constructor's
// timezone surprises by parsing the YYYY-MM-DD prefix directly.
function shortDate(s) {
  if (!s) return '';
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y) return '';
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}

function emptyEventForm(date) {
  return { title: '', date: date || '', time: '', type: 'custom', description: '' };
}

export default function Calendar({
  events = [],
  setEvents,
  projects = [],
  invoices = [],
  sows = [],
  recurringExpenses = [],
  milestones = [],
  markupSets = [],
  clients = [],
  settings = {},
}) {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [eventModal, setEventModal] = useState(null); // null | { mode: 'new'|'edit'|'view', event?, form? }
  const [externalEvents, setExternalEvents] = useState([]);
  const [feedStatuses, setFeedStatuses] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // ── External calendar sync ────────────────────────────────────────
  // Refetch once on mount and when the feed list changes. Cached in
  // local state until the user clicks "Sync now".
  const externalCalendars = settings.externalCalendars || [];
  const feedsKey = JSON.stringify(externalCalendars.map(f => ({ id: f.id, url: f.url, enabled: f.enabled })));
  useEffect(() => {
    let cancelled = false;
    if (externalCalendars.length === 0) {
      setExternalEvents([]);
      setFeedStatuses([]);
      return;
    }
    setSyncing(true);
    fetchAllFeeds(externalCalendars).then(({ events: ev, statuses }) => {
      if (cancelled) return;
      setExternalEvents(ev);
      setFeedStatuses(statuses);
      setSyncing(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedsKey]);

  // ── Aggregated event list (manual + auto-derived + external) ──────
  const allEvents = useMemo(() => {
    const list = [];

    // Manual events (admin-authored)
    for (const e of events) {
      list.push({
        id: e.id,
        date: e.date,
        time: e.time,
        title: e.title,
        type: e.type || 'custom',
        description: e.description,
        color: e.color || colorFor(e.type),
        manual: true,
      });
    }

    // Project deadlines — only for non-completed work; clicking jumps
    // to the project detail page.
    for (const p of projects) {
      if (!p.deadline || p.stage === 'completed') continue;
      const c = clients.find(x => x.id === p.clientId);
      list.push({
        id: 'proj-' + p.id,
        date: p.deadline,
        title: p.title + ' — deadline',
        type: 'project_deadline',
        color: colorFor('project_deadline'),
        context: c?.company,
        link: `/projects/${p.id}`,
      });
    }

    // Invoice due dates — only for invoices currently demanding
    // payment.
    for (const inv of invoices) {
      if (!inv.dueDate || (inv.status !== 'sent' && inv.status !== 'overdue')) continue;
      list.push({
        id: 'inv-' + inv.id,
        date: inv.dueDate,
        title: `${inv.invoiceNumber || 'Invoice'} due`,
        type: 'invoice_due',
        color: colorFor('invoice_due'),
        context: inv.clientCompany || inv.clientName,
        link: '/invoices',
      });
    }

    // Project milestones (Phase 4c). Skip completed/rejected.
    for (const m of milestones) {
      if (!m.targetDate) continue;
      if (m.status === 'completed' || m.status === 'rejected') continue;
      const proj = projects.find(p => p.id === m.projectId);
      list.push({
        id: 'milestone-' + m.id,
        date: m.targetDate,
        title: m.title,
        type: 'milestone',
        color: colorFor('milestone'),
        context: proj?.title,
        link: proj ? `/projects/${proj.id}` : null,
      });
    }

    // Proposal expirations — chase clients before their valid_until.
    for (const s of sows) {
      if (!s.validUntil) continue;
      if (s.status !== 'sent' && s.status !== 'draft') continue;
      const c = clients.find(x => x.id === s.clientId);
      list.push({
        id: 'sow-' + s.id,
        date: s.validUntil,
        title: `${s.proposalNumber || 'Proposal'} expires`,
        type: 'sow_expiration',
        color: colorFor('sow_expiration'),
        context: c?.company || s.projectTitle,
        link: '/proposals',
      });
    }

    // Recurring expense next-due dates (active only).
    for (const r of recurringExpenses) {
      if (!r.nextDue || r.status !== 'active') continue;
      list.push({
        id: 'rec-' + r.id,
        date: r.nextDue,
        title: r.title,
        type: 'recurring_due',
        color: colorFor('recurring_due'),
        link: '/recurring',
      });
    }

    // Markup-set target dates (Phase 5b).
    for (const ms of markupSets) {
      if (!ms.targetDate || ms.status !== 'active') continue;
      list.push({
        id: 'markup-' + ms.id,
        date: ms.targetDate,
        title: ms.name + ' — markup target',
        type: 'markup_target',
        color: colorFor('markup_target'),
      });
    }

    // External calendar events (iCal feeds).
    for (const ev of externalEvents) list.push(ev);

    return list;
  }, [events, projects, invoices, milestones, sows, recurringExpenses, markupSets, clients, externalEvents]);

  // Index events by date for O(1) lookups while rendering cells.
  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const e of allEvents) {
      if (!e.date) continue;
      const k = e.date.slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    // Sort each day's events by time (untimed first), then by title.
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return 1;
        if (b.time) return -1;
        return (a.title || '').localeCompare(b.title || '');
      });
    }
    return map;
  }, [allEvents]);

  // ── Navigation ────────────────────────────────────────────────────
  function shiftMonth(delta) {
    setCursor(({ year, month }) => {
      let m = month + delta;
      let y = year;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      return { year: y, month: m };
    });
  }
  function goToday() {
    const t = new Date();
    setCursor({ year: t.getFullYear(), month: t.getMonth() });
    setSelectedKey(todayKey());
  }

  // ── Event modal ───────────────────────────────────────────────────
  function openNewEvent() {
    setEventModal({ mode: 'new', form: emptyEventForm(selectedKey) });
  }
  function openEvent(ev) {
    if (ev.manual) {
      setEventModal({
        mode: 'edit',
        event: ev,
        form: {
          title: ev.title || '',
          date: ev.date || '',
          time: ev.time || '',
          type: ev.type || 'custom',
          description: ev.description || '',
        },
      });
    } else {
      setEventModal({ mode: 'view', event: ev });
    }
  }
  function closeModal() { setEventModal(null); }

  function saveEvent() {
    const f = eventModal.form;
    if (!f.title.trim() || !f.date) return;
    const color = colorFor(f.type);
    if (eventModal.mode === 'edit') {
      setEvents(prev => prev.map(e => e.id === eventModal.event.id ? { ...e, ...f, color } : e));
    } else {
      setEvents(prev => [...prev, { id: generateId(), ...f, color }]);
    }
    closeModal();
  }

  function deleteEvent() {
    const ev = eventModal.event;
    if (!ev || !ev.manual) return;
    if (!window.confirm(`Delete event "${ev.title || 'this event'}"? This cannot be undone.`)) return;
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    closeModal();
  }

  // ── Calendar grid math ────────────────────────────────────────────
  const { year, month } = cursor;
  const totalDays = daysInMonth(year, month);
  const lead = firstDayIndex(year, month);
  const tk = todayKey();
  const cells = []; // { day, dateKey, inMonth, isToday, isSelected, events }

  // Lead-in days from previous month — shown muted.
  const prevDays = daysInMonth(year, month === 0 ? 11 : month - 1);
  for (let i = lead - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const k = dateKey(y, m, d);
    cells.push({ day: d, dateKey: k, inMonth: false, isToday: k === tk, isSelected: k === selectedKey, events: eventsByDate.get(k) || [] });
  }
  // Current month.
  for (let d = 1; d <= totalDays; d++) {
    const k = dateKey(year, month, d);
    cells.push({ day: d, dateKey: k, inMonth: true, isToday: k === tk, isSelected: k === selectedKey, events: eventsByDate.get(k) || [] });
  }
  // Trailing days from next month — fill out to a multiple of 7.
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const [ly, lm, ld] = last.dateKey.split('-').map(Number);
    const next = new Date(ly, lm - 1, ld + 1);
    const k = dateKey(next.getFullYear(), next.getMonth(), next.getDate());
    cells.push({ day: next.getDate(), dateKey: k, inMonth: false, isToday: k === tk, isSelected: k === selectedKey, events: eventsByDate.get(k) || [] });
  }

  // ── Sidebar data ──────────────────────────────────────────────────
  const selectedEvents = eventsByDate.get(selectedKey) || [];

  // Next 7 days excluding today, sorted by date.
  const upcoming = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const startKey = dateKey(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const endKey = dateKey(end.getFullYear(), end.getMonth(), end.getDate());
    return allEvents
      .filter(e => e.date && e.date.slice(0, 10) >= startKey && e.date.slice(0, 10) <= endKey)
      .sort((a, b) => {
        const ad = a.date.slice(0, 10);
        const bd = b.date.slice(0, 10);
        if (ad !== bd) return ad < bd ? -1 : 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      })
      .slice(0, 12);
  }, [allEvents]);

  // Manual sync trigger — refetches all enabled feeds on demand.
  function syncFeeds() {
    if (externalCalendars.length === 0) return;
    setSyncing(true);
    fetchAllFeeds(externalCalendars).then(({ events: ev, statuses }) => {
      setExternalEvents(ev);
      setFeedStatuses(statuses);
      setSyncing(false);
    });
  }

  // Distinct event types currently visible — used to render the legend.
  const visibleTypes = useMemo(() => {
    const set = new Set();
    for (const e of allEvents) set.add(e.type);
    return Array.from(set);
  }, [allEvents]);

  return (
    <div className="cal page--fill">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="cal__header">
        <div className="cal__nav">
          <button className="btn btn--ghost btn--sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
          <button className="btn btn--ghost btn--sm" onClick={goToday}>Today</button>
          <button className="btn btn--ghost btn--sm" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
        </div>
        <h2 className="cal__title">{MONTH_NAMES[month]} {year}</h2>
        <div className="cal__actions">
          {externalCalendars.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={syncFeeds}
              disabled={syncing}
              title="Refetch external calendar feeds"
            >
              {syncing ? 'Syncing…' : 'Sync feeds'}
            </button>
          )}
          <button className="btn btn--primary btn--sm" onClick={openNewEvent}>+ New Event</button>
        </div>
      </div>

      <div className="cal__layout">
        {/* ── Month grid ──────────────────────────────────────── */}
        <div className="cal__main">
          <div className="cal__weekheader">
            {DAY_LABELS.map(d => <div key={d} className="cal__weekday">{d}</div>)}
          </div>
          <div className="cal__grid">
            {cells.map((c, i) => (
              <CalendarCell
                key={i}
                cell={c}
                onSelect={() => setSelectedKey(c.dateKey)}
                onOpenEvent={openEvent}
              />
            ))}
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className="cal__sidebar">
          <SidebarSection
            title={selectedKey === tk ? 'Today' : `${shortDate(selectedKey)} (${selectedEvents.length})`}
            events={selectedEvents}
            onOpen={openEvent}
            empty="No events on this day"
          />
          <SidebarSection
            title="Next 7 Days"
            events={upcoming}
            onOpen={openEvent}
            empty="Nothing scheduled this week"
            showDate
          />

          {/* Legend — only colors that are actually present */}
          {visibleTypes.length > 0 && (
            <div className="cal__legend">
              <div className="cal__legend-title">Legend</div>
              {visibleTypes.map(t => (
                <div key={t} className="cal__legend-row">
                  <span className="cal__legend-dot" style={{ background: colorFor(t) }} />
                  <span>{labelFor(t)}</span>
                </div>
              ))}
            </div>
          )}

          {/* External feed sync status */}
          {feedStatuses.length > 0 && (
            <div className="cal__feed-status">
              <div className="cal__legend-title">External feeds</div>
              {feedStatuses.map(s => (
                <div key={s.id} className={`cal__feed-row ${s.error ? 'cal__feed-row--error' : ''}`}>
                  <span className="cal__feed-name">{s.name}</span>
                  <span className="cal__feed-meta">
                    {s.error
                      ? `error: ${s.error}`
                      : `${s.count} events${s.viaProxy ? ' · via proxy' : ''}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Event modal ─────────────────────────────────────── */}
      {eventModal && (
        <EventModal
          modal={eventModal}
          onClose={closeModal}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onChangeForm={(field, value) =>
            setEventModal(m => ({ ...m, form: { ...m.form, [field]: value } }))
          }
          onNavigate={url => { closeModal(); navigate(url); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// One day cell. Renders up to 3 event pills inline with a "+N more"
// affordance for overflow; clicking the cell selects it (sidebar
// updates), clicking a pill opens that event's modal.
// ─────────────────────────────────────────────────────────────────────
function CalendarCell({ cell, onSelect, onOpenEvent }) {
  const VISIBLE = 3;
  const visible = cell.events.slice(0, VISIBLE);
  const hidden = cell.events.length - visible.length;
  const className = [
    'cal__cell',
    !cell.inMonth && 'cal__cell--out',
    cell.isToday && 'cal__cell--today',
    cell.isSelected && 'cal__cell--selected',
  ].filter(Boolean).join(' ');
  return (
    <div className={className} onClick={onSelect}>
      <div className="cal__cell-head">
        <span className="cal__cell-num">{cell.day}</span>
        {cell.events.length > 0 && (
          <span className="cal__cell-count">{cell.events.length}</span>
        )}
      </div>
      <div className="cal__cell-events">
        {visible.map(ev => (
          <button
            key={ev.id}
            type="button"
            className="cal__event-pill"
            style={{ '--ev-color': ev.color }}
            onClick={(e) => { e.stopPropagation(); onOpenEvent(ev); }}
            title={ev.title}
          >
            {ev.time && <span className="cal__event-pill-time">{ev.time}</span>}
            <span className="cal__event-pill-title">{ev.title}</span>
          </button>
        ))}
        {hidden > 0 && (
          <span className="cal__event-more">+{hidden} more</span>
        )}
      </div>
    </div>
  );
}

// Sidebar list of events with optional date prefix (used by the
// "Next 7 Days" rollup).
function SidebarSection({ title, events, onOpen, empty, showDate = false }) {
  return (
    <div className="cal__sidebar-section">
      <h3 className="cal__sidebar-title">{title}</h3>
      {events.length === 0 ? (
        <div className="cal__sidebar-empty">{empty}</div>
      ) : (
        <div className="cal__sidebar-list">
          {events.map(ev => (
            <button
              key={ev.id}
              type="button"
              className="cal__sidebar-event"
              style={{ '--ev-color': ev.color }}
              onClick={() => onOpen(ev)}
            >
              <span className="cal__sidebar-event-strip" />
              <div className="cal__sidebar-event-body">
                <span className="cal__sidebar-event-title">{ev.title}</span>
                <span className="cal__sidebar-event-meta">
                  {showDate && shortDate(ev.date)}
                  {showDate && (ev.time || '·')}
                  {!showDate && (ev.time || 'All day')}
                  {ev.context && <span className="cal__sidebar-event-context"> · {ev.context}</span>}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Add / edit / view-only modal. Auto-events render in view mode (no
// edit form) with a "Go to source" button when a link is available.
function EventModal({ modal, onClose, onSave, onDelete, onChangeForm, onNavigate }) {
  const isEdit = modal.mode === 'edit' || modal.mode === 'new';
  const ev = modal.event;
  const f = modal.form;

  if (!isEdit) {
    // View-only — auto-generated event details.
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <div className="modal__header">
            <div>
              <h2 style={{ margin: 0 }}>{ev.title}</h2>
              <span className="modal__subtitle" style={{ color: ev.color, marginTop: 4, display: 'inline-block' }}>
                {labelFor(ev.type)}
              </span>
            </div>
            <button className="modal__close" onClick={onClose}>×</button>
          </div>
          <div className="modal__body">
            <div className="cal__view-row">
              <span className="cal__view-label">Date</span>
              <span>{shortDate(ev.date)}</span>
            </div>
            {ev.time && (
              <div className="cal__view-row">
                <span className="cal__view-label">Time</span>
                <span>{ev.time}</span>
              </div>
            )}
            {ev.context && (
              <div className="cal__view-row">
                <span className="cal__view-label">Context</span>
                <span>{ev.context}</span>
              </div>
            )}
            {ev.location && (
              <div className="cal__view-row">
                <span className="cal__view-label">Location</span>
                <span>{ev.location}</span>
              </div>
            )}
            {ev.feedName && (
              <div className="cal__view-row">
                <span className="cal__view-label">Feed</span>
                <span>{ev.feedName}</span>
              </div>
            )}
            {ev.description && (
              <div className="cal__view-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="cal__view-label">Notes</span>
                <p style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {ev.description}
                </p>
              </div>
            )}
          </div>
          <div className="modal__footer">
            {ev.link && (
              <button className="btn btn--primary btn--sm" onClick={() => onNavigate(ev.link)}>
                Go to source
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Create / edit.
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal__header">
          <h2>{modal.mode === 'edit' ? 'Edit Event' : 'New Event'}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={f.title}
              onChange={e => onChangeForm('title', e.target.value)}
              placeholder="e.g. Client kickoff call"
              autoFocus
            />
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={f.date} onChange={e => onChangeForm('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={f.time} onChange={e => onChangeForm('time', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Type</label>
            <select value={f.type} onChange={e => onChangeForm('type', e.target.value)}>
              <option value="custom">Custom</option>
              <option value="meeting">Meeting</option>
              <option value="follow-up">Follow-up</option>
            </select>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Notes</label>
            <textarea
              rows={4}
              value={f.description}
              onChange={e => onChangeForm('description', e.target.value)}
              placeholder="Optional details, attendees, agenda…"
            />
          </div>
        </div>
        <div className="modal__footer">
          {modal.mode === 'edit' && (
            <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={onDelete}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary btn--sm" onClick={onSave} disabled={!f.title.trim() || !f.date}>
            {modal.mode === 'edit' ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
