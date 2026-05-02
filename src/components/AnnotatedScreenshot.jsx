import { useState, useRef } from 'react';

// Renders an image with overlaid pins. Click anywhere on the image to drop
// a new pin (popup form for the comment). Existing pins render as numbered
// circles; click one to expand its comment, or (admin) mark resolved.
//
// Pins store x/y as percentages of image dimensions, so they stay positioned
// correctly at any rendered size. The image is responsive (max-width: 100%).
//
// Props:
//   screenshot       AppScreenshot row
//   pins             AnnotationPin[] for this screenshot
//   currentUserId    auth user id (used to check pin authorship for delete)
//   isAdmin          boolean — admin can resolve any pin and delete any
//   onAddPin(xPct, yPct, body) — async, returns true on success
//   onResolvePin(pinId)         — async, admin only
//   onDeletePin(pinId)          — async (own pin or admin)

export default function AnnotatedScreenshot({
  screenshot, pins = [], currentUserId, isAdmin = false,
  onAddPin, onResolvePin, onDeletePin,
  // Optional controlled mode: parent (e.g. MarkupSetWorkspace sidebar) can
  // expand a specific pin by passing its id. forceExpandPinId overrides
  // local state. onPinExpandChange fires when the user toggles via marker click.
  forceExpandPinId, onPinExpandChange,
}) {
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  // Active "drop new pin" form: { x_pct, y_pct } or null
  const [draftPin, setDraftPin] = useState(null);
  const [draftBody, setDraftBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Currently expanded pin id (null = none). When parent passes
  // forceExpandPinId, that wins.
  const [internalExpandedPinId, setInternalExpandedPinId] = useState(null);
  const expandedPinId = forceExpandPinId !== undefined ? forceExpandPinId : internalExpandedPinId;
  function setExpandedPinId(id) {
    if (forceExpandPinId !== undefined && onPinExpandChange) {
      onPinExpandChange(id);
    } else {
      setInternalExpandedPinId(id);
    }
  }

  function handleImageClick(e) {
    if (submitting) return;
    if (draftPin) return; // already adding one
    if (!onAddPin) return; // read-only mode (no add handler wired)
    const rect = imageRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setDraftPin({ xPct, yPct });
    setDraftBody('');
    setExpandedPinId(null);
  }

  async function submitDraft(e) {
    e.preventDefault();
    if (!draftBody.trim() || !onAddPin) return;
    setSubmitting(true);
    const ok = await onAddPin(draftPin.xPct, draftPin.yPct, draftBody.trim());
    if (ok !== false) {
      setDraftPin(null);
      setDraftBody('');
    }
    setSubmitting(false);
  }

  return (
    <div className="annotated-screenshot" ref={containerRef}>
      <div className="annotated-screenshot__image-wrap">
        <img
          ref={imageRef}
          src={screenshot.imageUrl}
          alt={screenshot.caption || 'Screenshot'}
          className="annotated-screenshot__image"
          onClick={handleImageClick}
          draggable={false}
        />

        {/* Existing pins */}
        {pins.map((pin, i) => {
          const isExpanded = expandedPinId === pin.id;
          const canDelete = isAdmin || pin.authorId === currentUserId;
          return (
            <div
              key={pin.id}
              className={`annotation-pin annotation-pin--${pin.status} ${isExpanded ? 'annotation-pin--expanded' : ''}`}
              style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
            >
              <button
                className="annotation-pin__marker"
                onClick={e => {
                  e.stopPropagation();
                  setExpandedPinId(isExpanded ? null : pin.id);
                  setDraftPin(null);
                }}
                aria-label={`Pin ${i + 1}`}
              >
                {pin.status === 'resolved' ? '✓' : (i + 1)}
              </button>
              {isExpanded && (
                <div className="annotation-pin__popup" onClick={e => e.stopPropagation()}>
                  <p className="annotation-pin__body">{pin.body || '(no comment)'}</p>
                  {(pin.authorName || pin.createdAt) && (
                    <div className="annotation-pin__byline">
                      {pin.authorName && <strong>{pin.authorName}</strong>}
                      {pin.authorName && pin.createdAt && ' · '}
                      {pin.createdAt && new Date(pin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  <div className="annotation-pin__meta">
                    <span className={`status-pill priority-pill--${pin.status === 'resolved' ? 'low' : 'normal'}`}>
                      {pin.status === 'resolved' ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                  <div className="annotation-pin__actions">
                    {pin.status === 'open' && onResolvePin && (
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => onResolvePin(pin.id)}
                        title="Mark this comment as taken care of"
                      >
                        ✓ Mark Done
                      </button>
                    )}
                    {canDelete && onDeletePin && (
                      <button
                        className="btn btn--ghost btn--sm btn--danger-hover"
                        onClick={() => {
                          if (window.confirm('Delete this pin?')) {
                            onDeletePin(pin.id);
                            setExpandedPinId(null);
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                    <button className="btn btn--ghost btn--sm" onClick={() => setExpandedPinId(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Draft pin (still being typed) */}
        {draftPin && (
          <div
            className="annotation-pin annotation-pin--draft"
            style={{ left: `${draftPin.xPct}%`, top: `${draftPin.yPct}%` }}
          >
            <span className="annotation-pin__marker annotation-pin__marker--draft">+</span>
            <form className="annotation-pin__popup" onSubmit={submitDraft} onClick={e => e.stopPropagation()}>
              <label className="annotation-pin__draft-label">
                Leave a comment about this spot
              </label>
              <textarea
                value={draftBody}
                onChange={e => setDraftBody(e.target.value)}
                placeholder="What would you like changed here?"
                rows={3}
                autoFocus
                disabled={submitting}
              />
              <div className="annotation-pin__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => { setDraftPin(null); setDraftBody(''); }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={submitting || !draftBody.trim()}
                >
                  {submitting ? 'Saving…' : '✓ Submit Comment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Hint text below image — adapts to whether pin-add is wired in */}
      <p className="annotated-screenshot__hint">
        {onAddPin
          ? 'Click anywhere on the image to leave a comment. Existing comments are numbered — click any one to see the details.'
          : 'Comments are numbered. Click any one to read the details.'}
      </p>
    </div>
  );
}
