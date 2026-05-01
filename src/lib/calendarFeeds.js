// Minimal iCal / ICS feed parser and fetcher.
//
// Supports the common subset most calendar providers (Google, Outlook,
// Apple iCloud, Fastmail, etc.) emit: VEVENT blocks with SUMMARY,
// DTSTART, DTEND, DESCRIPTION, LOCATION, UID. Recurring events
// (RRULE) are NOT expanded — only the master event is returned. That's
// fine for "what's on my calendar this month" because most recurring
// meetings still have a sensible DTSTART, but it does mean weekly
// meetings won't appear on every future week. A real RRULE expander
// is a follow-up.
//
// Fetching is best-effort: most public iCal URLs (Google's `basic.ics`,
// Outlook's published calendar URL, etc.) are CORS-restricted from
// browser fetches. Direct fetch is attempted first; on CORS failure
// the caller can route through a proxy URL prefix supplied via the
// settings UI (e.g. corsproxy.io). For production, a Supabase edge
// function is the cleaner path — out of scope for this iteration.

// ── Parsing ─────────────────────────────────────────────────────────

function unescape(s) {
  return (s || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// "20260615T140000Z" / "20260615T140000" / "20260615" → { date, time }
function parseICalDate(value) {
  if (!value) return null;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const time = m[4] ? `${m[4]}:${m[5]}` : null;
  return { date, time, allDay: !m[4] };
}

// Unfold continuation lines per RFC 5545 (lines starting with whitespace
// are joined to the previous line) and parse VEVENT blocks.
export function parseIcal(text) {
  if (!text || typeof text !== 'string') return [];
  // Unfold: a line starting with space/tab continues the previous line.
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current && current.summary && current.start) events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);
      const key = keyPart.split(';')[0].toUpperCase();
      switch (key) {
        case 'SUMMARY':     current.summary = unescape(value); break;
        case 'DESCRIPTION': current.description = unescape(value); break;
        case 'LOCATION':    current.location = unescape(value); break;
        case 'UID':         current.uid = value; break;
        case 'DTSTART':     current.start = parseICalDate(value); break;
        case 'DTEND':       current.end = parseICalDate(value); break;
        default: break;
      }
    }
  }
  return events;
}

// ── Fetching ────────────────────────────────────────────────────────

// Some providers serve `webcal://` URLs which the browser can't fetch
// directly. Rewrite to https.
function normalizeFeedUrl(url) {
  if (!url) return url;
  return url.replace(/^webcal:\/\//i, 'https://');
}

// Public CORS proxy fallback. Best-effort, third-party — for production
// the user should configure their own proxy or use a Supabase edge
// function. The proxy URL pattern is well-known so we just expose it
// here and let the caller opt in.
export const CORS_PROXY_PREFIX = 'https://corsproxy.io/?url=';

// Fetch + parse a single feed. Tries direct fetch first; on failure
// (commonly CORS), retries through corsproxy.io. Returns:
//   { events: [...], error: null, viaProxy: false }
// or on total failure:
//   { events: [], error: 'message', viaProxy: false }
export async function fetchCalendarFeed(rawUrl, { useProxy = true } = {}) {
  const url = normalizeFeedUrl(rawUrl);
  if (!url || !/^https?:\/\//i.test(url)) {
    return { events: [], error: 'URL must start with http(s) or webcal' };
  }
  // Direct attempt first.
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      return { events: parseIcal(text), error: null, viaProxy: false };
    }
    return { events: [], error: `HTTP ${res.status}`, viaProxy: false };
  } catch (directErr) {
    if (!useProxy) {
      return { events: [], error: directErr.message || 'Fetch failed', viaProxy: false };
    }
    // Proxy retry — covers the typical CORS-blocked Google/Outlook case.
    try {
      const res = await fetch(CORS_PROXY_PREFIX + encodeURIComponent(url));
      if (res.ok) {
        const text = await res.text();
        return { events: parseIcal(text), error: null, viaProxy: true };
      }
      return { events: [], error: `Proxy HTTP ${res.status}`, viaProxy: true };
    } catch (proxyErr) {
      return {
        events: [],
        error: `Direct fetch blocked (CORS). Proxy also failed: ${proxyErr.message || 'unknown'}`,
        viaProxy: true,
      };
    }
  }
}

// Convenience: fetch all enabled feeds in parallel and flatten the
// resulting events into the Calendar's internal event shape.
//
//   feeds: [{ id, name, url, color, enabled }]
//   returns: { events: [...], statuses: [{ id, error, count, viaProxy }] }
export async function fetchAllFeeds(feeds) {
  const enabled = (feeds || []).filter(f => f.enabled !== false && f.url);
  if (enabled.length === 0) return { events: [], statuses: [] };

  const results = await Promise.all(
    enabled.map(async f => {
      const res = await fetchCalendarFeed(f.url);
      return { feed: f, ...res };
    })
  );

  const events = [];
  const statuses = [];
  for (const r of results) {
    statuses.push({
      id: r.feed.id,
      name: r.feed.name,
      error: r.error,
      count: r.events.length,
      viaProxy: r.viaProxy,
    });
    for (const ev of r.events) {
      events.push({
        id: 'ext-' + r.feed.id + '-' + (ev.uid || ev.summary + '-' + ev.start.date),
        date: ev.start.date,
        time: ev.start.time,
        title: ev.summary,
        type: 'external',
        description: ev.description,
        location: ev.location,
        feedId: r.feed.id,
        feedName: r.feed.name,
        color: r.feed.color || '#3b82f6',
      });
    }
  }
  return { events, statuses };
}
