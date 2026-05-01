// Shared application card. Renders the same layout on both the admin
// ClientProfile and the portal Applications list.
//
// Props:
//   app           Application row (with thumbnailUrl, name, status, type, url, description)
//   monthlyCost   number — total monthly cost to display (admin: app.monthlyCost only;
//                 portal: app.monthlyCost + linked recurring expenses)
//   onClick       called when card body is clicked (portal: navigate to detail page)
//   onEdit        admin-only: open edit modal
//   onDelete      admin-only: delete with confirm
//   adminMode     boolean — show edit/delete affordances when true

const STATUS_LABELS = {
  planning: 'Planning',
  'in-development': 'In Development',
  staging: 'Staging',
  live: 'Live',
  maintenance: 'Maintenance',
  archived: 'Archived',
};

const TYPE_LABELS = {
  website: 'Website',
  'web-app': 'Web App',
  'mobile-app': 'Mobile App',
  api: 'API',
  other: 'Other',
};

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AppCard({ app, monthlyCost, onClick, onEdit, onDelete, adminMode = false }) {
  const liveUrl = app.url
    ? (app.url.startsWith('http') ? app.url : `https://${app.url}`)
    : null;
  const displayUrl = app.url
    ? app.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  function handleCardClick(e) {
    // Don't trigger card-click when admin clicks edit/delete or anyone clicks the URL
    if (e.target.closest('[data-card-stop]')) return;
    if (onClick) onClick();
  }

  return (
    <div
      className={`app-card ${onClick ? 'app-card--clickable' : ''}`}
      onClick={onClick ? handleCardClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Thumbnail (16:9) */}
      <div className="app-card__thumb">
        {app.thumbnailUrl ? (
          <img src={app.thumbnailUrl} alt={app.name} loading="lazy" />
        ) : (
          <div className="app-card__thumb-fallback" aria-hidden="true">
            <AppTypeIcon type={app.type} />
          </div>
        )}
        <span className={`status-pill status-pill--app-${app.status} app-card__status`}>
          {STATUS_LABELS[app.status] || app.status}
        </span>
      </div>

      {/* Body */}
      <div className="app-card__body">
        <div className="app-card__heading">
          <h3 className="app-card__title">{app.name}</h3>
          <span className="app-card__type">{TYPE_LABELS[app.type] || app.type}</span>
        </div>

        {app.description && (
          <p className="app-card__desc">{app.description}</p>
        )}

        <div className="app-card__footer">
          {liveUrl ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-card-stop
              className="app-card__link"
              onClick={e => e.stopPropagation()}
            >
              {displayUrl} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className="app-card__link app-card__link--disabled">No URL set</span>
          )}

          {monthlyCost > 0 && (
            <span className="app-card__cost">{fmtCurrency(monthlyCost)}/mo</span>
          )}
        </div>

        {adminMode && (onEdit || onDelete) && (
          <div className="app-card__actions" data-card-stop>
            {onEdit && (
              <button className="btn btn--ghost btn--sm" onClick={onEdit}>Edit</button>
            )}
            {onDelete && (
              <button className="btn btn--ghost btn--sm btn--danger-hover" onClick={onDelete} title="Delete">×</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple type-keyed icon for the thumbnail fallback
function AppTypeIcon({ type }) {
  const props = {
    width: 56, height: 56, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { opacity: 0.6 },
  };
  switch (type) {
    case 'website':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'web-app':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'mobile-app':
      return (
        <svg {...props}>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    case 'api':
      return (
        <svg {...props}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
  }
}
