function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  pending: 'Awaiting Review',
  accepted: 'Accepted',
  rejected: 'Declined',
};

export default function PortalProposals({ sows }) {
  function openProposal(sow) {
    if (sow.shareToken) {
      window.open(`/sign/${sow.shareToken}`, '_blank', 'noopener,noreferrer');
    } else {
      alert('This proposal does not have a shareable link yet. Please contact your Clad Forge contact.');
    }
  }

  // Filter out drafts — clients shouldn't see proposals you haven't sent yet
  const visible = sows.filter(s => s.status !== 'draft');

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Proposals</h1>
          <p className="portal-page__subtitle">Review and sign proposals sent to you.</p>
        </div>
      </div>

      <div className="panel">
        {visible.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📄</span>
            <h3>No proposals yet</h3>
            <p>Proposals sent to you will appear here for review and signing.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Proposal</th>
                <th>Project</th>
                <th>Status</th>
                <th>Sent</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(sow => {
                const isReviewable = sow.status === 'sent' || sow.status === 'pending';
                return (
                  <tr key={sow.id}>
                    <td>
                      <span className="data-table__mono data-table__bold">{sow.proposalNumber || '—'}</span>
                      <span className="data-table__sub">
                        {sow.validUntil ? `Valid until ${sow.validUntil}` : ''}
                      </span>
                    </td>
                    <td>{sow.projectTitle || '—'}</td>
                    <td><span className={`status-pill status-pill--${sow.status}`}>{STATUS_LABELS[sow.status] || sow.status}</span></td>
                    <td className="data-table__muted">{sow.sentDate || '—'}</td>
                    <td className="data-table__mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {sow.budget ? fmtCurrency(sow.budget) : '—'}
                    </td>
                    <td>
                      <button
                        className={`btn btn--sm ${isReviewable ? 'btn--primary' : 'btn--ghost'}`}
                        onClick={() => openProposal(sow)}
                      >
                        {isReviewable ? 'Review & Sign' : 'View'}
                      </button>
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
