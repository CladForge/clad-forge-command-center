function fmtCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortalRecurring({ recurringExpenses }) {
  const active = recurringExpenses.filter(e => e.status === 'active');
  const paused = recurringExpenses.filter(e => e.status !== 'active');
  const monthlyTotal = active.reduce((s, e) => {
    const amount = e.amount || 0;
    if (e.frequency === 'monthly') return s + amount;
    if (e.frequency === 'yearly') return s + amount / 12;
    if (e.frequency === 'quarterly') return s + amount / 3;
    if (e.frequency === 'weekly') return s + amount * 4.33;
    return s + amount;
  }, 0);

  return (
    <div className="portal-page">
      <div className="portal-page__header">
        <div>
          <h1>Recurring Expenses</h1>
          <p className="portal-page__subtitle">
            Subscriptions, retainers, and ongoing costs on your account.
          </p>
        </div>
      </div>

      {recurringExpenses.length > 0 && (
        <div className="portal-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--brand)' }} />
            <span className="stat-card__label">Active Subscriptions</span>
            <span className="stat-card__value">{active.length}</span>
            <span className="stat-card__sub">{paused.length} paused or ended</span>
          </div>
          <div className="stat-card">
            <div className="stat-card__accent" style={{ background: 'var(--info)' }} />
            <span className="stat-card__label">Monthly Equivalent</span>
            <span className="stat-card__value">{fmtCurrency(monthlyTotal)}</span>
            <span className="stat-card__sub">across all active expenses</span>
          </div>
        </div>
      )}

      <div className="panel">
        {recurringExpenses.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">↻</span>
            <h3>No recurring expenses</h3>
            <p>Recurring charges on your account will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Frequency</th>
                <th>Status</th>
                <th>Next Due</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recurringExpenses.map(e => (
                <tr key={e.id}>
                  <td>
                    <span className="data-table__bold">{e.title}</span>
                    {e.description && <span className="data-table__sub">{e.description}</span>}
                  </td>
                  <td>{e.frequency || '—'}</td>
                  <td><span className={`status-pill status-pill--${e.status}`}>{e.status}</span></td>
                  <td className="data-table__muted">{e.nextDue || '—'}</td>
                  <td className="data-table__mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {fmtCurrency(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
