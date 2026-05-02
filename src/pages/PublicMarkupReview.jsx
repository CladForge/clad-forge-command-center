import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CLAD_FORGE_LOGO_DATA_URI } from '../lib/brand';
import AnnotatedScreenshot from '../components/AnnotatedScreenshot';

// Public-facing markup review surface for end customers (the customer of
// the middleman who has the portal account). They follow a /review/:token
// link, enter their name once (saved to localStorage), and can:
//   - View all screenshots in the markup set
//   - Upload their own screenshots (paste / drop / file picker)
//   - Drop new pins with comments on any screenshot
//   - Mark existing pins as resolved
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  // After uploading, store the new screenshot's id; an effect below
  // navigates to it once it appears in the screenshots state. ID-based
  // so it's immune to the reload timing race.
  const [pendingActiveScreenshotId, setPendingActiveScreenshotId] = useState(null);
  const containerRef = useRef(null);

  // ── Load via RPCs ────────────────────────────────────────────────────
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

  // Derive a safe-bounded active index inline to avoid a clamping effect
  const safeActiveIndex = screenshots.length === 0
    ? 0
    : Math.min(activeIndex, screenshots.length - 1);

  // Navigate to a freshly-uploaded screenshot once it appears in the
  // screenshots list. Robust against any reload timing.
  useEffect(() => {
    if (!pendingActiveScreenshotId) return;
    const idx = screenshots.findIndex(s => s.id === pendingActiveScreenshotId);
    if (idx !== -1) {
      setActiveIndex(idx);
      setExpandedPinId(null);
      setPendingActiveScreenshotId(null);
    }
  }, [pendingActiveScreenshotId, screenshots]);

  // ── Screenshot upload (paste / drop / file picker) ──────────────────
  async function uploadFile(file) {
    if (!file || !file.type?.startsWith('image/')) {
      setUploadError('That file does not look like an image. Please try a PNG or JPG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB. Try a smaller screenshot.');
      return;
    }
    setUploading(true);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUri = ev.target.result;
      const fallbackCaption = file.name && file.name !== 'image.png'
        ? file.name.replace(/\.[^.]+$/, '')
        : '';
      const { data, error } = await supabase.rpc('add_screenshot_by_token', {
        p_token: token,
        p_image_url: dataUri,
        p_caption: fallbackCaption,
        p_author_name: authorName,
      });
      if (error || !data) {
        setUploadError('Could not upload the image. The link may have expired.');
        setUploading(false);
        return;
      }
      // The RPC returns the new screenshot's id. Mark it as the
      // navigation target — the effect above navigates to it once
      // it lands in the screenshots state.
      setPendingActiveScreenshotId(data);
      await reload();
      setUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Could not read that image file.');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    e.target.value = '';
  }

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e) { if (e.currentTarget === e.target) setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  // Paste anywhere on page (ignoring text inputs)
  useEffect(() => {
    function handlePaste(e) {
      if (!authorName) return; // wait until they've set their name
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type?.startsWith('image/')) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) uploadFile(blob);
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorName, token]);

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
      alert('Could not save your comment. The link may have expired or the set is no longer accepting feedback.');
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
      alert('Could not mark that comment done. The link may have expired.');
      return;
    }
    await reload();
  }

  // Delete a pin (own pins only — RPC checks author_id IS NULL).
  async function handleDeletePin(pinId) {
    const { data, error } = await supabase.rpc('delete_pin_by_token', {
      p_token: token,
      p_pin_id: pinId,
    });
    if (error || !data) {
      alert('Could not delete this comment. It may have been left by the team rather than you, or the link may have expired.');
      return;
    }
    await reload();
  }

  // Delete the currently-active screenshot (own uploads only — RPC checks
  // captured_by IS NULL). Pins cascade-delete via the FK.
  async function handleDeleteActiveScreenshot() {
    const target = screenshots[safeActiveIndex];
    if (!target) return;
    const pinCount = pins.filter(p => p.screenshotId === target.id).length;
    const msg = pinCount > 0
      ? `Delete this screenshot and the ${pinCount} comment${pinCount !== 1 ? 's' : ''} on it? This cannot be undone.`
      : 'Delete this screenshot? This cannot be undone.';
    if (!window.confirm(msg)) return;
    const { data, error } = await supabase.rpc('delete_screenshot_by_token', {
      p_token: token,
      p_screenshot_id: target.id,
    });
    if (error || !data) {
      alert('Could not delete this screenshot. The team may have uploaded it, or the link may have expired.');
      return;
    }
    // Step back if we just removed the last screenshot in the list
    if (safeActiveIndex >= screenshots.length - 1 && safeActiveIndex > 0) {
      setActiveIndex(safeActiveIndex - 1);
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
          <p style={{ color: 'var(--slate)', maxWidth: 520, lineHeight: 1.6, marginBottom: 8 }}>
            You&apos;ve been invited to review the latest version of
            {application?.name ? <> <strong>{application.name}</strong></> : ' this app'}.
          </p>
          <p style={{ color: 'var(--slate)', maxWidth: 520, lineHeight: 1.6 }}>
            Type your name below to get started. We&apos;ll use it to tag any
            feedback you leave so the team knows it came from you.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              const trimmed = pendingName.trim();
              if (!trimmed) return;
              try { localStorage.setItem(NAME_STORAGE_KEY, trimmed); } catch { /* ignore */ }
              setAuthorName(trimmed);
            }}
            style={{ marginTop: 24, width: '100%', maxWidth: 380 }}
          >
            <input
              type="text"
              value={pendingName}
              onChange={e => setPendingName(e.target.value)}
              placeholder="Your name"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', fontSize: '1rem',
                border: '1px solid var(--border)', borderRadius: 10,
                background: 'var(--surface)', color: 'var(--ink)',
              }}
            />
            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%', marginTop: 14, padding: '12px 16px', fontSize: '0.95rem' }}
              disabled={!pendingName.trim()}
            >
              Start Reviewing →
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
    <div
      className="public-review"
      onDragOver={isReadOnly ? undefined : handleDragOver}
      onDragLeave={isReadOnly ? undefined : handleDragLeave}
      onDrop={isReadOnly ? undefined : handleDrop}
    >
      {isDragging && !isReadOnly && (
        <div className="app-screenshots__drop-overlay">
          <div className="app-screenshots__drop-overlay-text">Drop image to upload</div>
        </div>
      )}

      {/* Two-row header: brand on top, status + identity + actions below.
          Spreads everything out so it doesn't feel cramped. */}
      <header className="public-review__header">
        <div className="public-review__header-row public-review__header-row--top">
          <div className="public-review__header-brand">
            <img src={CLAD_FORGE_LOGO_DATA_URI} alt="Clad Forge" />
            <div className="public-review__header-brand-text">
              <span className="public-review__app-name">
                {application?.name || 'Markup Review'}
              </span>
              <span className="public-review__set-name">{set.name}</span>
            </div>
          </div>
          <div className="public-review__header-identity">
            <span className="public-review__identity-label">Reviewing as</span>
            <span className="public-review__identity-name">{authorName}</span>
            <button className="btn btn--ghost btn--sm" onClick={clearName}>
              Change name
            </button>
          </div>
        </div>
        <div className="public-review__header-row public-review__header-row--bottom">
          <div className="public-review__header-stats">
            <span className={`status-pill status-pill--mset-${setStatus}`}>
              {setStatus === 'completed' ? '✓ Completed' : setStatus === 'archived' ? 'Archived' : 'Active'}
            </span>
            <span className="public-review__header-count">
              <strong>{totalPins}</strong> comment{totalPins !== 1 ? 's' : ''}
              {totalPins > 0 && <> · <strong>{openPins}</strong> open</>}
            </span>
            <span className="public-review__header-count">
              <strong>{screenshots.length}</strong> screenshot{screenshots.length !== 1 ? 's' : ''}
            </span>
          </div>
          {!isReadOnly && (
            <div className="public-review__header-actions">
              <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }} title="Upload, paste, or drag in an image">
                {uploading ? 'Uploading…' : '📷 Add Screenshot'}
                <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      </header>

      {isReadOnly && (
        <div className="public-review__notice">
          This review set is {setStatus}. You can view existing feedback but
          new comments are no longer being accepted. Contact the team if you
          need to reopen it.
        </div>
      )}

      {/* Friendly how-it-works banner */}
      {!isReadOnly && (
        <div className="markup-workspace__hint-banner public-review__hint-banner">
          <span className="markup-workspace__hint-icon">💡</span>
          <span>
            <strong>How it works:</strong> Click anywhere on a screenshot to
            leave a comment. You can also paste an image
            (<strong>Ctrl+V</strong>), drag one in, or use{' '}
            <strong>📷 Add Screenshot</strong> above to add your own.
          </span>
        </div>
      )}

      {uploadError && <div className="modal__error" style={{ margin: '0 24px' }}>{uploadError}</div>}

      {/* Reuse the workspace-style layout: sidebar + viewer */}
      <div className="markup-workspace markup-workspace--public" ref={containerRef}>
        <div className="markup-workspace__body">
          <aside className="markup-workspace__sidebar">
            <div className="markup-workspace__sidebar-header">
              <span>Comments ({totalPins})</span>
            </div>
            {totalPins === 0 ? (
              <p className="markup-workspace__empty-sidebar">
                No comments yet. Click anywhere on a screenshot to leave the first one.
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
                <h3>No screenshots in this review yet</h3>
                <p>
                  {isReadOnly
                    ? 'The team hasn’t added any screenshots to review yet.'
                    : <>Paste an image (<strong>Ctrl+V</strong>), drag one in, or click <strong>📷 Add Screenshot</strong> at the top to add the first one.</>}
                </p>
              </div>
            ) : (
              <>
                <div className="markup-workspace__navbar">
                  <button
                    className="markup-workspace__nav-btn"
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
                    className="markup-workspace__nav-btn"
                    onClick={() => { setActiveIndex(i => (i + 1) % screenshots.length); setExpandedPinId(null); }}
                    disabled={screenshots.length < 2}
                  >
                    Next →
                  </button>
                  {/* Show Delete only on screenshots the customer uploaded
                      themselves (capturedBy is null for public uploads). */}
                  {!isReadOnly && active.capturedBy == null && (
                    <div className="markup-workspace__nav-extras">
                      <button
                        className="btn btn--ghost btn--sm btn--danger-hover"
                        onClick={handleDeleteActiveScreenshot}
                        title="Delete this screenshot (you uploaded it)"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <AnnotatedScreenshot
                  screenshot={active}
                  pins={activePins}
                  currentUserId={null}
                  isAdmin={false}
                  onAddPin={isReadOnly ? null : handleAddPin}
                  onResolvePin={isReadOnly ? null : handleResolvePin}
                  onDeletePin={isReadOnly ? null : handleDeletePin}
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
