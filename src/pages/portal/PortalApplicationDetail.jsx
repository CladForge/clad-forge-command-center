import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppScreenshotsSection from '../../components/AppScreenshotsSection';

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TYPE_LABELS = {
  'website': 'Website',
  'web-app': 'Web App',
  'mobile-app': 'Mobile App',
  'api': 'API',
  'other': 'Other',
};

const STATUS_LABELS = {
  planning: 'Planning',
  'in-development': 'In Development',
  staging: 'Staging',
  live: 'Live',
  maintenance: 'Maintenance',
  archived: 'Archived',
};

export default function PortalApplicationDetail({
  applications, recurringExpenses, invoices,
  appScreenshots = [], annotationPins = [], markupSets = [], reloadScreenshots,
  profile,
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const app = applications.find(a => a.id === id);
  const myScreenshots = appScreenshots.filter(s => s.applicationId === id);
  const myPins = annotationPins.filter(p => myScreenshots.some(s => s.id === p.screenshotId));
  const mySets = markupSets.filter(s => s.applicationId === id);
  const [showMarkupsModal, setShowMarkupsModal] = useState(false);

  if (!app) {
    return (
      <div className="portal-page">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/applications')}>
          ← Back to applications
        </button>
        <div className="empty-state">
          <h3>Application not found</h3>
          <p>This application may have been archived or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  const tiedExpenses = recurringExpenses.filter(e => e.applicationId === app.id);
  const monthlyTotal = (app.monthlyCost || 0) + tiedExpenses
    .filter(e => e.status === 'active' && e.frequency === 'monthly')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const yearlyTotal = monthlyTotal * 12 + tiedExpenses
    .filter(e => e.status === 'active' && e.frequency === 'yearly')
    .reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="portal-page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/portal/applications')}>
        ← Back to applications
      </button>

      {/* Hero thumbnail (16:9). If no thumbnail set, the section is hidden
          to avoid an empty visual block at the top of the page. */}
      {app.thumbnailUrl && (
        <div className="app-detail-hero" style={{ marginTop: 16 }}>
          <img src={app.thumbnailUrl} alt={app.name} loading="lazy" />
        </div>
      )}

      <div className="portal-page__header" style={{ marginTop: 16 }}>
        <div>
          <h1>{app.name}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span className={`status-pill status-pill--app-${app.status}`}>
              {STATUS_LABELS[app.status]}
            </span>
            <span className="portal-page__subtitle">{TYPE_LABELS[app.type]}</span>
            {app.url && (
              <a
                href={app.url.startsWith('http') ? app.url : `https://${app.url}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--brand)', fontSize: '0.92rem' }}
              >
                {app.url.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {app.description && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>About</h3></div>
          <div style={{ padding: '16px 22px', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--ink)' }}>
            {app.description}
          </div>
        </div>
      )}

      {/* Billing summary */}
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel__header"><h3>Billing</h3></div>
        <div style={{ padding: '16px 22px' }}>
          {(monthlyTotal > 0 || tiedExpenses.length > 0) ? (
            <>
              <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Monthly
                  </span>
                  <span className="data-table__mono" style={{ fontSize: '1.4rem', fontWeight: 600 }}>
                    {fmtCurrency(monthlyTotal)}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Annual estimate
                  </span>
                  <span className="data-table__mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--slate)' }}>
                    {fmtCurrency(yearlyTotal)}
                  </span>
                </div>
              </div>
              {tiedExpenses.length > 0 && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Expense</th>
                      <th>Frequency</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiedExpenses.map(e => (
                      <tr key={e.id}>
                        <td>{e.title}</td>
                        <td className="data-table__muted">{e.frequency}</td>
                        <td><span className={`status-pill status-pill--${e.status}`}>{e.status}</span></td>
                        <td className="data-table__mono" style={{ textAlign: 'right' }}>{fmtCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>
              No recurring billing configured for this application yet.
            </p>
          )}
        </div>
      </div>

      {/* Status / launched info */}
      {app.launchedAt && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Timeline</h3></div>
          <div style={{ padding: '16px 22px', fontSize: '0.92rem' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--slate)', minWidth: 100 }}>Launched:</span>
              <span style={{ color: 'var(--ink)' }}>{app.launchedAt}</span>
            </div>
          </div>
        </div>
      )}

      {/* Screenshots + markup pins — opens in a fullscreen-ish modal so the
          review surface has real estate. Same pattern as the admin side. */}
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Screenshots & Markup</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate)', margin: '4px 0 0 0' }}>
              Upload screenshots of issues or areas you&apos;d like changed and drop pins with comments.
            </p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowMarkupsModal(true)}>
            Open Markup Reviews
          </button>
        </div>
        <div style={{ padding: '16px 22px 20px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {(() => {
            const totalPins = myPins.length;
            const openPins = myPins.filter(p => p.status === 'open').length;
            const activeSets = mySets.filter(s => s.status === 'active').length;
            const completedSets = mySets.filter(s => s.status === 'completed').length;
            return (
              <>
                <div className="markup-summary-stat">
                  <span className="markup-summary-stat__label">Sets</span>
                  <span className="markup-summary-stat__value">
                    {activeSets} active{completedSets > 0 ? ` · ${completedSets} completed` : ''}
                  </span>
                </div>
                <div className="markup-summary-stat">
                  <span className="markup-summary-stat__label">Screenshots</span>
                  <span className="markup-summary-stat__value">{myScreenshots.length}</span>
                </div>
                <div className="markup-summary-stat">
                  <span className="markup-summary-stat__label">Pins</span>
                  <span className="markup-summary-stat__value">
                    {totalPins}
                    {openPins > 0 && <span style={{ color: 'var(--brand)', marginLeft: 6 }}>· {openPins} open</span>}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {showMarkupsModal && (
        <div className="modal-overlay" onClick={() => setShowMarkupsModal(false)}>
          <div
            className="modal modal--wide modal--markups"
            onClick={e => e.stopPropagation()}
            style={{
              width: '95vw',
              maxWidth: 1600,
              height: '94vh',
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal__header" style={{ flexShrink: 0 }}>
              <div>
                <h2>Markups — {app.name}</h2>
                <span className="modal__subtitle">
                  {myScreenshots.length} screenshot{myScreenshots.length !== 1 ? 's' : ''}, {myPins.length} total pin{myPins.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button className="modal__close" onClick={() => setShowMarkupsModal(false)}>×</button>
            </div>
            <div className="modal__body" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
              <AppScreenshotsSection
                applicationId={id}
                screenshots={myScreenshots}
                pins={myPins}
                markupSets={mySets}
                currentUserId={profile?.id}
                isAdmin={false}
                onChange={reloadScreenshots}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes shown by admin to the client */}
      {app.notes && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel__header"><h3>Notes</h3></div>
          <div style={{ padding: '16px 22px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--slate)', whiteSpace: 'pre-line' }}>
            {app.notes}
          </div>
        </div>
      )}

      {/* Invoices for this application — filtered through project link */}
      {invoices && invoices.length > 0 && (
        (() => {
          // Match invoices via the recurring_expenses link — invoices
          // generated from a recurring expense for this app would show here.
          // For Phase 4e we don't have a direct invoice→app link, but we can
          // show invoices whose project is linked to this app once that
          // relationship exists. For now: just don't render this block.
          return null;
        })()
      )}
    </div>
  );
}
