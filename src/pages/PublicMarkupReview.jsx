import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CLAD_FORGE_LOGO_DATA_URI } from '../lib/brand';
import AnnotatedScreenshot from '../components/AnnotatedScreenshot';

// Public-facing markup review surface for end customers (the customer of
// the middleman who has the portal account). They follow a /review/:token
// link, enter their name once (saved to localStorage), and can:
//   - View all screenshots in the markup set
//   - Drop new pins with comments
//   - Mark existing pins as resolved
//
// What they CANNOT do:
//   - See any other markup sets, applications, or client data
//   - Upload screenshots
//   - Edit or delete pins (other than resolving them)
//
// All data access goes through SECURITY DEFINER RPCs that validate the
// token server-side. There is no anon SELECT path on the underlying
// tables — the token is the gate.

const NAME_STORAGE_KEY = 'cladforge.markup.author_name';

function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return result;
}

export default function PublicMarkupReview() {
  const { token } = useParams();
  const [set, setSet] = useState(null);
  const [application, setApplication] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    try { return localStorage.getItem(NAME_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [pendingName, setPendingName] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedPinId, setExpandedPinId] = useState(null);
  const containerRef = useRef(null);

  // ── Load via RPCs ────────────────────────────────────────────────────
  // Initial load runs once for the token. `reload()` is the manual refresh
  // path called after pin mutations. Splitting these avoids the React
  // Compiler "synchronous setState in effect" lint while still keeping a
  // single source of truth for the fetch logic.
  async function reload() {
    if (!token) return;
    const [setRes, ssRes, pinsRes] = await Promise.all([
      supabase.rpc('get_markup_set_by_token', { p_token: token }),
      supabase.rpc('get_screenshots_by_token', { p_token: token }),
      supabase.rpc('get_pins_by_token', { p_token: token }),
    ]);
    if (setRes.error || !setRes.data) {
      setError('This review link is invalid, has been revoked, or the set has been archived.');
      setLoading(false);
      return;
    }
    setSet(snakeToCamel(setRes.data.set));
    setApplication(snakeToCamel(setRes.data.application));
    setScreenshots((ssRes.data || []).map(snakeToCamel));
    setPins((pinsRes.data || []).map(snakeToCamel));
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      const [setRes, ssRes, pinsRes] = await Promise.all([
        supabase.rpc('get_markup_set_by_token', { p_token: token }),
        supabase.rpc('get_screenshots_by_token', { p_token: token }),
        supabase.rpc('get_pins_by_token', { p_token: token }),
      ]);
      if (cancelled) return;
      if (setRes.error || !setRes.data) {
        setError('This review link is invalid, has been revoked, or the set has been archived.');
        setLoading(false);
        return;
      }
      setSet(snakeToCamel(setRes.data.set));
      setApplication(snakeToCamel(setRes.data.application));
      setScreenshots((ssRes.data || []).map(snakeToCamel));
      setPins((pinsRes.data || []).map(snakeToCamel));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  // ── Keyboard nav: arrow keys jump screenshots ───────────────────────
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (screenshots.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + screenshots.length) % screenshots.length);
        setExpandedPinId(null);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % screenshots.length);
        setExpandedPinId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenshots.length]);

  // Derive a safe-bounded active index inline so we don't need an effect
  // to clamp state when screenshots change. `screenshots[idx] || null`
  // handles the empty-array case naturally.
  const safeActiveIndex = screenshots.length === 0
    ? 0
    : Math.min(activeIndex, screenshots.length - 1);

  // ── Pin actions (RPC-backed) ────────────────────────────────────────
  async function handleAddPin(xPct, yPct, body) {
    if (!authorName) return false;
    const active = screenshots[safeActiveIndex];
    if (!active) return false;
    const { data, error } = await supabase.rpc('add_pin_by_token', {
      p_token: token,
      p_screenshot_id: active.id,
      p_x_pct: xPct,
      p_y_pct: yPct,
      p_body: body,
      p_author_name: authorName,
    });
    if (error || !data) {
      alert('Could not add pin. The link may have expired or the set is no longer accepting feedback.');
      return false;
    }
    await reload();
    return true;
  }

  async function handleResolvePin(pinId) {
    const { data, error } = await supabase.rpc('resolve_pin_by_token', {
      p_token: token,
      p_pin_id: pinId,
      p_author_name: authorName,
    });
    if (error || !data) {
      alert('Could not mark resolved. The link may have expired.');
      return;
    }
    await reload();
  }

  // Click a sidebar pin → jump to its screenshot + expand
  function jumpToPin(pin) {
    const idx = screenshots.findIndex(s => s.id === pin.screenshotId);
    if (idx === -1) return;
    setActiveIndex(idx);
    setExpandedPinId(pin.id);
    setTimeout(() => {
      containerRef.current?.querySelector('.markup-workspace__viewer')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="public-review">
        <div className="public-review__center">
          <div className="loading-spinner" />
          <p style={{ marginTop: 16, color: 'var(--slate)' }}>Loading review…</p>
        </div>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="public-review">
        <div className="public-review__center">
          <img src={CLAD_FORGE_LOGO_DATA_URI} alt="Clad Forge" className="public-review__logo" />
          <h1>Link Unavailable</h1>
          <p style={{ color: 'var(--slate)', maxWidth: 480, lineHeight: 1.6 }}>
            {error || 'This review link could not be loaded.'}
          </p>
          <p style={{ color: 'var(--slate-light)', fontSize: '0.85rem', marginTop: 12 }}>
            If you believe this is a mistake, contact the person who shared this link with you.
          </p>
        </div>
      </div>
    );
  }

  // First-visit name capture. Required before any pin actions work.
  if (!authorName) {
    return (
      <div className="public-review">
        <div className="public-review__center">
          <img src={CLAD_FORGE_LOGO_DATA_URI} alt="Clad Forge" className="public-review__logo" />
          <h1>{application?.name ? `Review: ${application.name}` : 'Markup Review'}</h1>
          <p style={{ color: 'var(--slate)', maxWidth: 480, lineHeight: 1.6 }}>
            Enter your name to start adding feedback. We&apos;ll show this name next to
            any pins you drop so the team knows who left them.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              const trimmed = pendingName.trim();
              if (!trimmed) return;
              try { localStorage.setItem(NAME_STORAGE_KEY, trimmed); } catch { /* ignore */ }
              setAuthorName(trimmed);
            }}
            style={{ marginTop: 24, width: '100%', maxWidth: 360 }}
          >
            <input
              type="text"
              value={pendingName}
              onChange={e => setPendingName(e.target.value)}
              placeholder="Your name"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', fontSize: '0.95rem',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--surface)', color: 'var(--ink)',
              }}
            />
            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%', marginTop: 12 }}
              disabled={!pendingName.trim()}
            >
              Start Reviewing
            </button>
          </form>
        </div>
      </div>
    );
  }

  const active = screenshots[safeActiveIndex] || null;
  const activePins = active ? pins.filter(p => p.screenshotId === active.id) : [];
  const totalPins = pins.length;
  const openPins = pins.filter(p => p.status === 'open').length;
  const setStatus = set.status || 'active';
  const isReadOnly = setStatus !== 'active';

  function clearName() {
    try { localStorage.removeItem(NAME_STORAGE_KEY); } catch { /* ignore */ }
    setAuthorName('');
    setPendingName('');
  }

  return (
    <div className="public-review">
      {/* Header bar — branding + identity */}
      <header className="public-review__header">
        <div className="public-review__header-brand">
          <img src={CLAD_FORGE_LOGO_DATA_URI} alt="Clad Forge" />
          <div>
            <span className="public-review__app-name">{application?.name || 'Markup Review'}</span>
            <span className="public-review__set-name">{set.name}</span>
          </div>
        </div>
        <div className="public-review__header-meta">
          <span className={`status-pill status-pill--mset-${setStatus}`}>
            {setStatus === 'completed' ? '✓ Completed' : setStatus === 'archived' ? 'Archived' : 'Active'}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
            {totalPins} pin{totalPins !== 1 ? 's' : ''}
            {totalPins > 0 && ` · ${openPins} open`}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
            Reviewing as <strong style={{ color: 'var(--ink)' }}>{authorName}</strong>
          </span>
          <button className="btn btn--ghost btn--sm" onClick={clearName}>Change name</button>
        </div>
      </header>

      {isReadOnly && (
        <div className="public-review__notice">
          This review set is {setStatus}. You can view existing feedback but
          new pins are no longer being accepted. Contact the team if you need
          to reopen it.
        </div>
      )}

      {/* Reuse the workspace-style layout: sidebar + viewer */}
      <div className="markup-workspace markup-workspace--public" ref={containerRef}>
        <div className="markup-workspace__body">
          <aside className="markup-workspace__sidebar">
            <div className="markup-workspace__sidebar-header">
              <span>Pins ({totalPins})</span>
            </div>
            {totalPins === 0 ? (
              <p className="markup-workspace__empty-sidebar">
                No pins yet. Click anywhere on a screenshot to drop the first one.
              </p>
            ) : (
              <ul className="markup-pin-list">
                {screenshots.map((s, ssIdx) => {
                  const sPins = pins.filter(p => p.screenshotId === s.id);
                  if (sPins.length === 0) return null;
                  return (
                    <li key={s.id} className="markup-pin-list__group">
                      <div className="markup-pin-list__group-header">
                        <span className="markup-pin-list__group-name">
                          {s.caption || `Screenshot ${ssIdx + 1}`}
                        </span>
                        <span className="markup-pin-list__group-count">{sPins.length}</span>
                      </div>
                      <ul className="markup-pin-list__items">
                        {sPins.map((p, pIdx) => (
                          <li key={p.id}>
                            <button
                              className={`markup-pin-list__item markup-pin-list__item--${p.status} ${expandedPinId === p.id && active?.id === s.id ? 'markup-pin-list__item--active' : ''}`}
                              onClick={() => jumpToPin(p)}
                              title={p.body || ''}
                            >
                              <span className="markup-pin-list__num">{pIdx + 1}</span>
                              <span className="markup-pin-list__body">
                                {p.body
                                  ? (p.body.length > 80 ? p.body.slice(0, 80) + '…' : p.body)
                                  : <em>(no comment)</em>}
                              </span>
                              <span className="markup-pin-list__dot" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div className="markup-workspace__viewer">
            {!active ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <span className="empty-state__icon">📸</span>
                <h3>No screenshots in this set yet</h3>
                <p>The team hasn&apos;t added any screenshots to review yet. Check back later.</p>
              </div>
            ) : (
              <>
                <div className="markup-workspace__navbar">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setActiveIndex(i => (i - 1 + screenshots.length) % screenshots.length); setExpandedPinId(null); }}
                    disabled={screenshots.length < 2}
                  >
                    ← Prev
                  </button>
                  <div className="markup-workspace__nav-indicator">
                    <span className="markup-workspace__nav-name">
                      {active.caption || `Screenshot ${safeActiveIndex + 1}`}
                    </span>
                    <span className="markup-workspace__nav-counter">
                      {safeActiveIndex + 1} of {screenshots.length}
                    </span>
                  </div>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setActiveIndex(i => (i + 1) % screenshots.length); setExpandedPinId(null); }}
                    disabled={screenshots.length < 2}
                  >
                    Next →
                  </button>
                </div>

                <AnnotatedScreenshot
                  screenshot={active}
                  pins={activePins}
                  currentUserId={null}
                  isAdmin={false}
                  onAddPin={isReadOnly ? null : handleAddPin}
                  onResolvePin={isReadOnly ? null : handleResolvePin}
                  onDeletePin={null}
                  forceExpandPinId={expandedPinId}
                  onPinExpandChange={setExpandedPinId}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
