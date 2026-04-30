function formatFileSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

const TYPE_LABELS = {
  contract: 'Contract',
  invoice: 'Invoice',
  proposal: 'Proposal',
  report: 'Report',
  other: 'Other',
};

export default function PortalDocuments({ documents, projects }) {
  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Documents</h1>
          <p className="portal-page__subtitle">Files and reports related to your projects.</p>
        </div>
      </div>

      <div className="panel">
        {documents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📁</span>
            <h3>No documents yet</h3>
            <p>Documents shared with you will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Project</th>
                <th>Type</th>
                <th>Size</th>
                <th>Added</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {documents.map(d => {
                const project = projects.find(p => p.id === d.projectId);
                return (
                  <tr key={d.id}>
                    <td>
                      <span className="data-table__bold">{d.name}</span>
                      {d.notes && <span className="data-table__sub">{d.notes}</span>}
                    </td>
                    <td>{project?.title || '—'}</td>
                    <td className="data-table__muted">{TYPE_LABELS[d.type] || d.type}</td>
                    <td className="data-table__muted">{formatFileSize(d.fileSize)}</td>
                    <td className="data-table__muted">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {d.fileUrl ? (
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--ghost btn--sm"
                        >
                          Open ↗
                        </a>
                      ) : (
                        <span className="data-table__muted" style={{ fontSize: '0.78rem' }}>No file</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
