import { useState } from 'react';
import { buildInvoiceHTML } from '../Invoices';

function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcTotal(items, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  processing: 'Processing',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export default function PortalInvoices({ invoices, activeClient, settings }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? invoices
    : invoices.filter(i => i.status === filter);

  const counts = {
    all: invoices.length,
    sent: invoices.filter(i => i.status === 'sent').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  };

  function openInvoice(inv) {
    if (inv.shareToken) {
      // Open the existing public invoice page in a new tab — handles payment
      // and PDF download via the share-token flow we already built.
      window.open(`/invoice/${inv.shareToken}`, '_blank', 'noopener,noreferrer');
    } else {
      alert('This invoice does not have a shareable link yet. Please contact your Clad Forge contact.');
    }
  }

  function handleDownload(inv) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildInvoiceHTML(inv, activeClient, settings));
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Invoices</h1>
          <p className="portal-page__subtitle">View and pay your invoices online.</p>
        </div>
      </div>

      <div className="filter-chips" style={{ marginBottom: 20 }}>
        {['all', 'sent', 'overdue', 'paid'].map(s => (
          <button
            key={s}
            className={`filter-chip ${filter === s ? 'filter-chip--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]} <span className="filter-chip__count">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🧾</span>
            <h3>No invoices to show</h3>
            <p>{filter === 'all' ? 'You don\'t have any invoices yet.' : 'No invoices match this filter.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Project</th>
                <th>Status</th>
                <th>Due</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const total = calcTotal(inv.items, inv.taxRate, inv.discount);
                const isPayable = inv.status === 'sent' || inv.status === 'overdue';
                return (
                  <tr key={inv.id}>
                    <td>
                      <span className="data-table__mono data-table__bold">{inv.invoiceNumber}</span>
                      <span className="data-table__sub">{inv.issueDate || '—'}</span>
                    </td>
                    <td>{inv.projectTitle || '—'}</td>
                    <td><span className={`status-pill status-pill--${inv.status}`}>{STATUS_LABELS[inv.status]}</span></td>
                    <td className="data-table__muted">
                      {inv.status === 'paid' && inv.paidDate
                        ? `Paid ${inv.paidDate}`
                        : inv.dueDate || 'On receipt'}
                    </td>
                    <td className="data-table__mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmtCurrency(total)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleDownload(inv)}
                          title="Download PDF"
                        >
                          PDF
                        </button>
                        <button
                          className={`btn btn--sm ${isPayable ? 'btn--primary' : 'btn--ghost'}`}
                          onClick={() => openInvoice(inv)}
                        >
                          {isPayable ? 'View & Pay' : 'View'}
                        </button>
                      </div>
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
