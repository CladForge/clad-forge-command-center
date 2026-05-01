import { useState } from 'react';
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

  const selected = screenshots.find(s => s.id === selectedId) || screenshots[0] || null;
  const selectedPins = selected ? pins.filter(p => p.screenshotId === selected.id) : [];

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
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
      const { error } = await supabase.from('app_screenshots').insert({
        id: newId,
        application_id: applicationId,
        image_url: dataUri,
        caption: file.name.replace(/\.[^.]+$/, ''),
        captured_by: currentUserId,
      });
      if (error) {
        setUploadError(error.message);
      } else {
        if (onChange) await onChange();
        setSelectedId(newId);
      }
      setUploading(false);
      // Reset input so user can re-upload the same filename
      e.target.value = '';
    };
    reader.readAsDataURL(file);
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
    <div className="app-screenshots">
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
              onChange={handleUpload}
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
          <p>Upload a screenshot of the application to start dropping markup pins.</p>
        </div>
      )}
    </div>
  );
}
