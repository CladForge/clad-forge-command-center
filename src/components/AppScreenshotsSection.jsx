import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from '../data/initialData';
import MarkupSetWorkspace from './MarkupSetWorkspace';

// Top-level entry to the per-application markup feature. Two modes:
//   1. "list"      — shows all markup sets as cards + an "Unfiled" group
//                    if any screenshots have no set. User picks one to enter.
//   2. "workspace" — shows MarkupSetWorkspace for the selected set. Sidebar
//                    + viewer + prev/next nav + mark-complete.
//
// Used in both admin (via Clients > Applications > Markups modal) and
// portal (via PortalApplicationDetail). Same component, isAdmin flag
// gates admin-only affordances (mark complete, resolve any pin).

export default function AppScreenshotsSection({
  applicationId,
  screenshots = [],
  pins = [],
  markupSets = [],
  currentUserId,
  isAdmin = false,
  onChange,
}) {
  const [activeSetId, setActiveSetId] = useState(null);

  // Only consider screenshots that belong to a real markup set. Screenshots
  // with set_id=null are treated as legacy/orphan and not surfaced anywhere
  // in the UI — admins can clean them up with:
  //   DELETE FROM app_screenshots WHERE set_id IS NULL;

  // ── List mode ────────────────────────────────────────────────────────
  if (!activeSetId) {
    return (
      <SetList
        applicationId={applicationId}
        screenshots={screenshots}
        pins={pins}
        markupSets={markupSets}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onChange={onChange}
        onOpenSet={setActiveSetId}
      />
    );
  }

  // ── Workspace mode ──────────────────────────────────────────────────
  const activeSet = markupSets.find(s => s.id === activeSetId);
  const setScreenshots = screenshots.filter(s => s.setId === activeSetId);
  const ssIds = setScreenshots.map(s => s.id);
  const setPins = pins.filter(p => ssIds.includes(p.screenshotId));

  return (
    <MarkupSetWorkspace
      set={activeSet}
      screenshots={setScreenshots}
      pins={setPins}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      onChange={onChange}
      onBack={() => setActiveSetId(null)}
      applicationId={applicationId}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sets list view — cards for each set + "+ New Set" + Unfiled group
// ─────────────────────────────────────────────────────────────────────

function SetList({
  applicationId, screenshots, pins, markupSets, currentUserId, isAdmin,
  onChange, onOpenSet,
}) {
  const [showNewModal, setShowNewModal] = useState(false);

  // Group sets by status for visual ordering: active first, then completed
  const activeSets = markupSets.filter(s => s.status === 'active');
  const completedSets = markupSets.filter(s => s.status === 'completed' || s.status === 'archived');

  function pinCountsForSet(setId) {
    const ssIds = screenshots.filter(s => s.setId === setId).map(s => s.id);
    const set = pins.filter(p => ssIds.includes(p.screenshotId));
    return {
      total: set.length,
      open: set.filter(p => p.status === 'open').length,
      resolved: set.filter(p => p.status === 'resolved').length,
      screenshotCount: ssIds.length,
    };
  }

  return (
    <div className="markup-sets-list">
      <div className="markup-sets-list__header">
        <div>
          <p className="markup-sets-list__hint">
            Sets group screenshots into a review package — e.g. "Pre-launch QA" or "Phase 2 review".
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowNewModal(true)}>
          + New Set
        </button>
      </div>

      {markupSets.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">📦</span>
          <h3>No markup sets yet</h3>
          <p>Create your first set to start collecting screenshots and pins.</p>
        </div>
      ) : (
        <>
          {activeSets.length > 0 && (
            <div className="markup-sets-list__group">
              <h4 className="markup-sets-list__group-title">Active</h4>
              <div className="markup-sets-grid">
                {activeSets.map(set => (
                  <SetCard
                    key={set.id}
                    set={set}
                    counts={pinCountsForSet(set.id)}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    onOpen={() => onOpenSet(set.id)}
                    onChange={onChange}
                  />
                ))}
              </div>
            </div>
          )}

          {completedSets.length > 0 && (
            <div className="markup-sets-list__group">
              <h4 className="markup-sets-list__group-title">Completed</h4>
              <div className="markup-sets-grid">
                {completedSets.map(set => (
                  <SetCard
                    key={set.id}
                    set={set}
                    counts={pinCountsForSet(set.id)}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    onOpen={() => onOpenSet(set.id)}
                    onChange={onChange}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showNewModal && (
        <NewSetModal
          applicationId={applicationId}
          currentUserId={currentUserId}
          onClose={() => setShowNewModal(false)}
          onCreated={async (newSetId) => {
            setShowNewModal(false);
            if (onChange) await onChange();
            if (newSetId) onOpenSet(newSetId);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// One card per set
// ─────────────────────────────────────────────────────────────────────

function SetCard({ set, counts, isAdmin, currentUserId, onOpen, onChange }) {
  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete set "${set.name}" and ALL its screenshots and pins? This cannot be undone.`)) return;
    const { error } = await supabase.from('markup_sets').delete().eq('id', set.id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    if (onChange) await onChange();
  }

  const canDelete = isAdmin || set.createdBy === currentUserId;

  return (
    <div className="markup-set-card" onClick={onOpen} role="button" tabIndex={0}>
      <div className="markup-set-card__top">
        <span className="markup-set-card__name">{set.name}</span>
        <span className={`status-pill status-pill--mset-${set.status}`}>
          {set.status === 'completed' ? '✓ Complete' : set.status === 'archived' ? 'Archived' : 'Active'}
        </span>
      </div>
      {set.description && <p className="markup-set-card__desc">{set.description}</p>}
      {set.targetDate && (
        <p className="markup-set-card__sub">Target: {set.targetDate}</p>
      )}
      <div className="markup-set-card__bottom">
        <SetCardCounts counts={counts} />
        {canDelete && set.status !== 'completed' && (
          <button
            className="markup-set-card__delete"
            onClick={handleDelete}
            aria-label="Delete set"
            title="Delete set"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function SetCardCounts({ counts }) {
  return (
    <div className="markup-set-card__counts">
      <span><strong>{counts.screenshotCount}</strong> screenshot{counts.screenshotCount !== 1 ? 's' : ''}</span>
      <span><strong>{counts.total}</strong> pin{counts.total !== 1 ? 's' : ''}</span>
      {counts.open > 0 && (
        <span className="markup-set-card__open">
          <strong>{counts.open}</strong> open
        </span>
      )}
      {counts.total > 0 && counts.open === 0 && (
        <span className="markup-set-card__resolved">All resolved</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// New Set modal
// ─────────────────────────────────────────────────────────────────────

function NewSetModal({ applicationId, currentUserId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', targetDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Please give this set a name.'); return; }
    setSubmitting(true);
    setError('');
    const newId = generateId();
    const { error: insertErr } = await supabase.from('markup_sets').insert({
      id: newId,
      application_id: applicationId,
      name: form.name.trim(),
      description: form.description.trim(),
      target_date: form.targetDate,
      status: 'active',
      created_by: currentUserId,
    });
    if (insertErr) { setError(insertErr.message); setSubmitting(false); return; }
    if (onCreated) await onCreated(newId);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal__header">
          <h2>New Markup Set</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="modal__body">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Pre-launch QA, Phase 2 review"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's this set for? Specific area? Phase?"
              rows={2}
              disabled={submitting}
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Target date (optional)</label>
            <input
              type="date"
              value={form.targetDate}
              onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
              disabled={submitting}
            />
          </div>
          {error && <div className="modal__error">{error}</div>}
          <div className="modal__footer" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting || !form.name.trim()}>
              {submitting ? 'Creating…' : 'Create Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
