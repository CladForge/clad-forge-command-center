import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from '../data/initialData';
import AnnotatedScreenshot from './AnnotatedScreenshot';

// A self-contained screenshot management section for an application.
// Renders a list of screenshots, an upload control, and the annotation
// viewer for the selected screenshot. Used in both admin and portal
// application detail pages — same UX, different role context.
//
// Props:
//   applicationId   string
//   screenshots     AppScreenshot[] for this app
//   pins            AnnotationPin[] across all screenshots for this app
//   currentUserId   auth user id
//   isAdmin         boolean
//   onChange()      callback to reload data after mutations

export default function AppScreenshotsSection({
  applicationId, screenshots = [], pins = [], currentUserId, isAdmin = false, onChange,
}) {
  const [selectedId, setSelectedId] = useState(screenshots[0]?.id || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const selected = screenshots.find(s => s.id === selectedId) || screenshots[0] || null;
  const selectedPins = selected ? pins.filter(p => p.screenshotId === selected.id) : [];

  // Shared upload pipeline — used by file picker, paste handler, drag-drop.
  // Takes a File or Blob, validates, encodes as data URI, inserts row.
  async function uploadFile(file, suggestedCaption) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setUploadError('That doesn\'t look like an image.');
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
      // Pasted images land as `image.png` (no useful filename) — fall back to
      // a timestamped caption so it's not just a generic name in the picker.
      const fallbackCaption = suggestedCaption || (file.name && file.name !== 'image.png'
        ? file.name.replace(/\.[^.]+$/, '')
        : `Screenshot ${new Date().toLocaleString()}`);
      const { error } = await supabase.from('app_screenshots').insert({
        id: newId,
        application_id: applicationId,
        image_url: dataUri,
        caption: fallbackCaption,
        captured_by: currentUserId,
      });
      if (error) {
        setUploadError(error.message);
      } else {
        if (onChange) await onChange();
        setSelectedId(newId);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so user can re-upload the same filename
    e.target.value = '';
  }

  // Paste support — listen on window so the user can paste from anywhere on
  // the page. We ignore paste events originating from text inputs / textareas
  // / contentEditable elements so typing-paste in those still works normally.
  useEffect(() => {
    function handlePaste(e) {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) uploadFile(blob);
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, currentUserId]);

  // Drag-and-drop support
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e) {
    // Only clear if leaving the dropzone entirely (not its children)
    if (e.currentTarget === e.target) setIsDragging(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleAddPin(xPct, yPct, body) {
    if (!selected) return false;
    const { error } = await supabase.from('annotation_pins').insert({
      id: generateId(),
      screenshot_id: selected.id,
      x_pct: xPct,
      y_pct: yPct,
      body,
      author_id: currentUserId,
      status: 'open',
    });
    if (error) {
      alert('Could not add pin: ' + error.message);
      return false;
    }
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
    if (!selected) return;
    if (!window.confirm(`Delete this screenshot and all ${selectedPins.length} pin${selectedPins.length !== 1 ? 's' : ''} on it? This cannot be undone.`)) return;
    const { error } = await supabase.from('app_screenshots').delete().eq('id', selected.id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    setSelectedId(screenshots.find(s => s.id !== selected.id)?.id || null);
    if (onChange) await onChange();
  }

  const canDeleteSelected = selected && (isAdmin || selected.capturedBy === currentUserId);

  return (
    <div
      className={`app-screenshots ${isDragging ? 'app-screenshots--dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay shown while dragging a file over the section */}
      {isDragging && (
        <div className="app-screenshots__drop-overlay">
          <div className="app-screenshots__drop-overlay-text">
            Drop image to upload
          </div>
        </div>
      )}

      {/* Top bar: upload + screenshot picker */}
      <div className="app-screenshots__bar">
        <div className="app-screenshots__list">
          {screenshots.length === 0 ? (
            <span className="app-screenshots__empty-label">No screenshots yet</span>
          ) : (
            screenshots.map(s => {
              const pinCount = pins.filter(p => p.screenshotId === s.id).length;
              const openCount = pins.filter(p => p.screenshotId === s.id && p.status === 'open').length;
              return (
                <button
                  key={s.id}
                  className={`app-screenshots__chip ${selectedId === s.id ? 'app-screenshots__chip--active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                  title={s.caption || 'Untitled'}
                >
                  <span className="app-screenshots__chip-name">
                    {s.caption || 'Untitled'}
                  </span>
                  {pinCount > 0 && (
                    <span className={`app-screenshots__chip-count ${openCount > 0 ? 'app-screenshots__chip-count--open' : ''}`}>
                      {pinCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="app-screenshots__actions">
          <label className="btn btn--primary btn--sm" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '+ Upload Screenshot'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
          {selected && canDeleteSelected && (
            <button
              className="btn btn--ghost btn--sm btn--danger-hover"
              onClick={handleDeleteScreenshot}
              title="Delete screenshot"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <p className="app-screenshots__paste-hint">
        Paste an image with <kbd>Ctrl+V</kbd> · drop a file anywhere in this area · or click Upload Screenshot
      </p>

      {uploadError && <div className="modal__error" style={{ marginTop: 8 }}>{uploadError}</div>}

      {/* Viewer */}
      {selected ? (
        <div className="app-screenshots__viewer">
          <AnnotatedScreenshot
            screenshot={selected}
            pins={selectedPins}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onAddPin={handleAddPin}
            onResolvePin={handleResolvePin}
            onDeletePin={handleDeletePin}
          />
        </div>
      ) : (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="empty-state__icon">📸</span>
          <h3>No screenshots yet</h3>
          <p>Paste an image, drop one here, or click Upload Screenshot to get started.</p>
        </div>
      )}
    </div>
  );
}
