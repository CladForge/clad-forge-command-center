import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from '../data/initialData';
import AnnotatedScreenshot from './AnnotatedScreenshot';

// Workspace for reviewing a single markup set. Layout:
//   [Sidebar: pin summary, color-coded, click to jump]   [Viewer: prev/next + screenshot]
//
// Props:
//   set                MarkupSet | null  (null = "Unfiled" pseudo-set)
//   screenshots        AppScreenshot[] for this set (already filtered)
//   pins               AnnotationPin[] across this set's screenshots
//   currentUserId      string
//   isAdmin            boolean
//   onChange()         reload data after mutations
//   onBack             return to sets list
//   applicationId      needed when uploading new screenshots

export default function MarkupSetWorkspace({
  set, screenshots = [], pins = [], currentUserId, isAdmin = false,
  onChange, onBack, applicationId,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedPinId, setExpandedPinId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Clamp activeIndex when screenshots change
  useEffect(() => {
    if (activeIndex >= screenshots.length && screenshots.length > 0) {
      setActiveIndex(screenshots.length - 1);
    } else if (screenshots.length === 0 && activeIndex !== 0) {
      setActiveIndex(0);
    }
  }, [screenshots.length, activeIndex]);

  const active = screenshots[activeIndex] || null;
  const activePins = active ? pins.filter(p => p.screenshotId === active.id) : [];

  // Pin counts for the whole set (across all screenshots)
  const totalPins = pins.length;
  const openPins = pins.filter(p => p.status === 'open').length;
  const allResolved = totalPins > 0 && openPins === 0;
  const isCompletedSet = set?.status === 'completed';

  // ── Keyboard nav (left/right arrows) ─────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Don't hijack arrow keys when typing in a text field
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

  // ── Upload (paste / drop / picker) ──────────────────────────────────
  async function uploadFile(file) {
    if (!file || !file.type?.startsWith('image/')) {
      setUploadError('Please provide an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }
    setUploading(true);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUri = ev.target.result;
      const newId = generateId();
      const fallbackCaption = (file.name && file.name !== 'image.png'
        ? file.name.replace(/\.[^.]+$/, '')
        : `Screenshot ${new Date().toLocaleString()}`);
      const { error } = await supabase.from('app_screenshots').insert({
        id: newId,
        application_id: applicationId,
        set_id: set?.id || null,
        image_url: dataUri,
        caption: fallbackCaption,
        captured_by: currentUserId,
      });
      if (error) {
        setUploadError(error.message);
      } else if (onChange) {
        await onChange();
        // Jump to the newly added screenshot. Screenshots in the
        // workspace are now ordered oldest-first (see AppScreenshotsSection),
        // so the new one is at the end of the array. The closure value of
        // screenshots.length is N (pre-upload) which equals the new item's
        // index after the parent reloads.
        setActiveIndex(screenshots.length);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    function handlePaste(e) {
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
  }, [set?.id, applicationId]);

  function handleFileInput(e) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    e.target.value = '';
  }
  function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e) { if (e.currentTarget === e.target) setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  // ── Pin actions (delegated from AnnotatedScreenshot) ────────────────
  async function handleAddPin(xPct, yPct, body) {
    if (!active) return false;
    const { error } = await supabase.from('annotation_pins').insert({
      id: generateId(), screenshot_id: active.id,
      x_pct: xPct, y_pct: yPct, body,
      author_id: currentUserId, status: 'open',
    });
    if (error) { alert('Could not add pin: ' + error.message); return false; }
    if (onChange) await onChange();
    return true;
  }
  async function handleResolvePin(pinId) {
    const { error } = await supabase
      .from('annotation_pins')
      .update({ status: 'resolved', resolved_by: currentUserId, resolved_at: new Date().toISOString() })
      .eq('id', pinId);
    if (error) { alert('Could not mark resolved: ' + error.message); return; }
    if (onChange) await onChange();
  }
  async function handleDeletePin(pinId) {
    const { error } = await supabase.from('annotation_pins').delete().eq('id', pinId);
    if (error) { alert('Could not delete: ' + error.message); return; }
    if (onChange) await onChange();
  }
  async function handleDeleteScreenshot() {
    if (!active) return;
    if (!window.confirm(`Delete this screenshot and all ${activePins.length} pin${activePins.length !== 1 ? 's' : ''} on it? This cannot be undone.`)) return;
    const { error } = await supabase.from('app_screenshots').delete().eq('id', active.id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    if (onChange) await onChange();
  }

  // ── Share-link management (admin + portal users can both manage) ────
  // Lets the middleman (or admin) generate a /review/:token URL for the
  // end customer. Token persists on markup_sets.share_token. All
  // mutations route through the manage_markup_share_token RPC so portal
  // users (whose RLS forbids direct UPDATE on markup_sets) can also
  // create/regenerate/revoke for their own client's sets.
  const [shareCopied, setShareCopied] = useState(false);
  const shareUrl = set?.shareToken
    ? `${window.location.origin}/review/${set.shareToken}`
    : null;

  async function callShareRpc(action) {
    if (!set) return null;
    const { data, error } = await supabase.rpc('manage_markup_share_token', {
      p_set_id: set.id, p_action: action,
    });
    if (error) {
      alert('Could not update share link: ' + error.message);
      return null;
    }
    if (data === null) {
      alert('You are not authorized to manage this share link.');
      return null;
    }
    if (onChange) await onChange();
    // RPC returns the new token (or '' for revoke)
    return data || null;
  }

  async function copyShareLink() {
    let token = set?.shareToken;
    if (!token) {
      token = await callShareRpc('create');
      if (!token) return;
    }
    const url = `${window.location.origin}/review/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-secure contexts — fall back to prompt.
      window.prompt('Copy this link to share:', url);
    }
  }

  async function regenerateShareLink() {
    if (!set) return;
    if (!window.confirm('Regenerate the share link? The old link will stop working immediately and anyone using it will need a new URL.')) return;
    await callShareRpc('regenerate');
  }

  async function revokeShareLink() {
    if (!set) return;
    if (!window.confirm('Revoke the share link? Anyone using it will lose access immediately.')) return;
    await callShareRpc('revoke');
  }

  // ── Mark set complete (admin only) ──────────────────────────────────
  async function markSetComplete() {
    if (!set) return;
    if (!window.confirm(`Mark "${set.name}" as complete? You can reopen it later if needed.`)) return;
    const { error } = await supabase.from('markup_sets')
      .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: currentUserId })
      .eq('id', set.id);
    if (error) { alert('Could not mark complete: ' + error.message); return; }
    if (onChange) await onChange();
  }
  async function reopenSet() {
    if (!set) return;
    const { error } = await supabase.from('markup_sets')
      .update({ status: 'active', completed_at: null, completed_by: null })
      .eq('id', set.id);
    if (error) { alert('Could not reopen: ' + error.message); return; }
    if (onChange) await onChange();
  }

  // Click sidebar pin → jump to screenshot + expand
  function jumpToPin(pin) {
    const idx = screenshots.findIndex(s => s.id === pin.screenshotId);
    if (idx === -1) return;
    setActiveIndex(idx);
    setExpandedPinId(pin.id);
    // Scroll viewer to top so pin is visible
    setTimeout(() => {
      containerRef.current?.querySelector('.markup-workspace__viewer')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  const setName = set?.name || 'Unfiled Screenshots';
  const setDate = set?.targetDate;
  const setStatus = set?.status || 'active';

  return (
    <div
      className={`markup-workspace ${isDragging ? 'markup-workspace--dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={containerRef}
    >
      {isDragging && (
        <div className="app-screenshots__drop-overlay">
          <div className="app-screenshots__drop-overlay-text">Drop image to upload</div>
        </div>
      )}

      {/* Top bar */}
      <div className="markup-workspace__topbar">
        <button className="btn btn--ghost btn--sm" onClick={onBack} title="Back to sets">
          ← Sets
        </button>
        <div className="markup-workspace__title">
          <h3>{setName}</h3>
          <div className="markup-workspace__meta">
            {set && (
              <span className={`status-pill status-pill--mset-${setStatus}`}>
                {setStatus === 'completed' ? '✓ Completed' : setStatus === 'archived' ? 'Archived' : 'Active'}
              </span>
            )}
            {setDate && <span>Target: {setDate}</span>}
            <span>
              {totalPins} pin{totalPins !== 1 ? 's' : ''}
              {totalPins > 0 && ` · ${openPins} open`}
            </span>
          </div>
        </div>
        <div className="markup-workspace__actions">
          {!isCompletedSet && set && (
            <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }} title="Upload, paste, or drag in an image">
              {uploading ? 'Uploading…' : '📷 Add Screenshot'}
              <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
          {/* Share link: visible to admins AND portal users so the
              middleman can generate one for their end customer. */}
          {set && !isCompletedSet && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={copyShareLink}
              title={shareUrl
                ? 'Copy review link — share with the end customer'
                : 'Generate a public review link for the end customer'}
            >
              {shareCopied ? '✓ Copied' : (shareUrl ? '🔗 Copy Review Link' : '🔗 Share with Customer')}
            </button>
          )}
          {set && shareUrl && !isCompletedSet && (
            <>
              <button
                className="btn btn--ghost btn--sm"
                onClick={regenerateShareLink}
                title="Generate a fresh link (the old one stops working)"
              >
                Regenerate
              </button>
              <button
                className="btn btn--ghost btn--sm btn--danger-hover"
                onClick={revokeShareLink}
                title="Revoke the link (immediately blocks all access)"
              >
                Revoke
              </button>
            </>
          )}
          {isAdmin && set && !isCompletedSet && (
            <button
              className="btn btn--primary btn--sm"
              onClick={markSetComplete}
              disabled={!allResolved}
              title={allResolved ? 'Mark this set as complete' : `${openPins} pin${openPins !== 1 ? 's' : ''} still open`}
            >
              {allResolved ? '✓ Mark Complete' : `${openPins} open`}
            </button>
          )}
          {isAdmin && set && isCompletedSet && (
            <button className="btn btn--ghost btn--sm" onClick={reopenSet}>
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Visible share-URL bar when a link exists — confirms what got copied
          and gives the middleman something to paste into a chat manually. */}
      {set && shareUrl && !isCompletedSet && (
        <div className="markup-workspace__share-bar">
          <span className="markup-workspace__share-label">Public review link:</span>
          <code className="markup-workspace__share-url">{shareUrl}</code>
          <span className="markup-workspace__share-hint">
            Anyone with this link can drop pins and resolve them on this set only.
          </span>
        </div>
      )}

      {uploadError && <div className="modal__error">{uploadError}</div>}

      {/* Friendly how-it-works banner — visible to every audience the first
          time they land on a workspace. Keeps the language plain so non-
          technical reviewers know exactly what to do. */}
      {!isCompletedSet && (
        <div className="markup-workspace__hint-banner">
          <span className="markup-workspace__hint-icon">💡</span>
          <span>
            <strong>How it works:</strong> Click anywhere on a screenshot to
            drop a pin and leave a comment. You can also paste an image
            (Ctrl+V), drag one in, or use <em>Add Screenshot</em> above.
          </span>
        </div>
      )}

      {/* Body: sidebar + viewer */}
      <div className="markup-workspace__body">
        {/* Sidebar */}
        <aside className="markup-workspace__sidebar">
          <div className="markup-workspace__sidebar-header">
            <span>Pins ({totalPins})</span>
          </div>
          {totalPins === 0 ? (
            <p className="markup-workspace__empty-sidebar">
              No comments yet. Click anywhere on a screenshot to add one.
            </p>
          ) : (
            <ul className="markup-pin-list">
              {screenshots.map((s, ssIdx) => {
                const sPins = pins.filter(p => p.screenshotId === s.id);
                if (sPins.length === 0) return null;
                return (
                  <li key={s.id} className="markup-pin-list__group">
                    <div className="markup-pin-list__group-header">
                      <span className="markup-pin-list__group-name">{s.caption || `Screenshot ${ssIdx + 1}`}</span>
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
                              {p.body ? (p.body.length > 80 ? p.body.slice(0, 80) + '…' : p.body) : <em>(no comment)</em>}
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

        {/* Viewer */}
        <div className="markup-workspace__viewer">
          {!active ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <span className="empty-state__icon">📸</span>
              <h3>Add a screenshot to start</h3>
              <p>
                Paste an image with <strong>Ctrl+V</strong>, drag one in,
                or click <strong>📷 Add Screenshot</strong> at the top.
              </p>
            </div>
          ) : (
            <>
              {/* Nav bar — centered prev/next so reviewers can flip pages
                  easily. Delete sits in the right rail so it doesn't clutter
                  the primary nav. */}
              <div className="markup-workspace__navbar">
                <button
                  className="markup-workspace__nav-btn"
                  onClick={() => { setActiveIndex(i => (i - 1 + screenshots.length) % screenshots.length); setExpandedPinId(null); }}
                  disabled={screenshots.length < 2}
                >
                  ← Prev
                </button>
                <div className="markup-workspace__nav-indicator">
                  <span className="markup-workspace__nav-name">{active.caption || `Screenshot ${activeIndex + 1}`}</span>
                  <span className="markup-workspace__nav-counter">
                    {activeIndex + 1} of {screenshots.length}
                  </span>
                </div>
                <button
                  className="markup-workspace__nav-btn"
                  onClick={() => { setActiveIndex(i => (i + 1) % screenshots.length); setExpandedPinId(null); }}
                  disabled={screenshots.length < 2}
                >
                  Next →
                </button>
                {(isAdmin || active.capturedBy === currentUserId) && (
                  <div className="markup-workspace__nav-extras">
                    <button
                      className="btn btn--ghost btn--sm btn--danger-hover"
                      onClick={handleDeleteScreenshot}
                      title="Delete this screenshot"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <AnnotatedScreenshot
                screenshot={active}
                pins={activePins}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onAddPin={handleAddPin}
                onResolvePin={handleResolvePin}
                onDeletePin={handleDeletePin}
                forceExpandPinId={expandedPinId}
                onPinExpandChange={setExpandedPinId}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
