import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialSettings } from '../data/initialData';
import OnboardingReview from '../components/OnboardingReview';
import { resolveCardOrder, pickKpiColumns, colorFor, MAX_VISIBLE_KPI_CARDS, resolveDashboardPreferences } from '../lib/dashboardCards';

export default function Dashboard({ clients, projects, sows, settings: rawSettings, invoices = [], tickets = [], applications = [], recurringExpenses = [], annotationPins = [], appScreenshots = [], setClients, addNotification }) {
  const settings = { ...initialSettings, ...rawSettings };
  const prefs = resolveDashboardPreferences(settings.dashboardPreferences);
  const sectionsOn = prefs.sections;
  const navigate = useNavigate();

  // ═══ COMPUTED METRICS ═══

  const activeClients = clients.filter(c => c.status === 'active').length;
  const prospects = clients.filter(c => c.status === 'prospect').length;
  const activeProjects = projects.filter(p => p.stage === 'active').length;
  const totalProjectBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  // "Pipeline value" = budgets of projects that haven't reached completion.
  // Uses everything except 'completed' to capture both active and review work.
  const pipelineValue = projects
    .filter(p => p.stage !== 'completed')
    .reduce((s, p) => s + (p.budget || 0), 0);

  const invoiceTotal = (items, taxRate = 0, discount = 0) => {
    const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
    return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
  };

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalRevenue = paidInvoices.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);

  // Revenue billed in the *current calendar month* — uses paidDate (when
  // money actually came in) rather than issueDate so the number matches a
  // typical "this month I made X" mental model.
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthPaid = paidInvoices.filter(i => (i.paidDate || '').startsWith(monthKey));
  const thisMonthRevenue = thisMonthPaid.reduce((s, i) => s + invoiceTotal(i.items, i.taxRate, i.discount), 0);

  // Avg days from issueDate → paidDate across all paid invoices that have
  // both dates. Skip rows missing either to avoid NaN poisoning.
  const paidWithDates = paidInvoices.filter(i => i.issueDate && i.paidDate);
  const avgDaysToPay = paidWithDates.length === 0 ? 0 : Math.round(
    paidWithDates.reduce((s, i) => {
      const days = (new Date(i.paidDate) - new Date(i.issueDate)) / 86400000;
      return s + Math.max(days, 0);
    }, 0) / paidWithDates.length
  );

  const proposalTotal = (pkgs) => (pkgs || []).reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0);
  const pendingProposals = sows.filter(s => s.status === 'sent');
  const pendingValue = pendingProposals.reduce((s, p) => s + proposalTotal(p.packages), 0);
  const acceptedProposals = sows.filter(s => s.status === 'accepted');
  const acceptedValue = acceptedProposals.reduce((s, p) => s + proposalTotal(p.packages), 0);
  // Win rate: accepted vs accepted+declined (i.e., "decided" proposals only).
  // Excludes drafts and still-pending sends so the percent doesn't tank just
  // because there's open work.
  const decidedProposals = sows.filter(s => s.status === 'accepted' || s.status === 'declined');
  const winRate = decidedProposals.length === 0 ? 0
    : Math.round((acceptedProposals.length / decidedProposals.length) * 100);

  // Open tickets = anything pre-resolved. Counted across all clients since
  // this is the admin dashboard.
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress' || t.status === 'in-progress');
  // Subset of open tickets that are urgent or high priority — what should
  // get touched today, separate from the broader queue size.
  const urgentTickets = openTickets.filter(t => t.priority === 'urgent' || t.priority === 'high');

  // Live applications = currently running deliverables. Includes 'live' and
  // 'maintenance' since both represent apps in production.
  const liveApplications = applications.filter(a => a.status === 'live' || a.status === 'maintenance');

  // Monthly recurring revenue: active monthly expenses + 1/12 of yearly ones.
  // (Yearly amortization keeps the number meaningful even if your contract
  // mix shifts toward annual billing.)
  const activeRecurring = recurringExpenses.filter(e => e.status === 'active');
  const monthlyRecurring = activeRecurring.reduce((s, e) => {
    if (e.frequency === 'monthly') return s + (e.amount || 0);
    if (e.frequency === 'yearly')  return s + (e.amount || 0) / 12;
    return s;
  }, 0);

  // Open markup pins across every application — represents client feedback
  // waiting on an admin response. Surfaced here because it's otherwise only
  // visible by clicking into individual app screenshots.
  const openMarkupPins = annotationPins.filter(p => p.status === 'open');

  // Projects whose deadline is within the configured horizon OR already
  // past, and not yet completed. Default 14 days matches a typical sprint
  // window; configurable via Settings > Dashboard.
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueHorizon = new Date(todayStart);
  dueHorizon.setDate(dueHorizon.getDate() + prefs.dueSoonDays);
  const projectsDueSoon = projects.filter(p => {
    if (p.stage === 'completed') return false;
    if (!p.deadline) return false;
    const due = new Date(p.deadline);
    return due <= dueHorizon;
  });
  const projectsOverdue = projectsDueSoon.filter(p => new Date(p.deadline) < todayStart);

  // Net new clients this month — pulls from createdAt so it counts whoever
  // landed in the system this calendar month (not just status changes).
  const newClientsThisMonth = clients.filter(c =>
    (c.createdAt || '').startsWith(monthKey)
  );

  // ═══ CHART DATA ═══

  // Pipeline by stage
  const pipelineStages = [
    { id: 'lead', label: 'Lead', color: '#9ca3af' },
    { id: 'proposal', label: 'Proposal', color: '#d97706' },
    { id: 'active', label: 'Active', color: '#b45309' },
    { id: 'review', label: 'Review', color: '#2563eb' },
    { id: 'completed', label: 'Completed', color: '#059669' },
  ];

  const pipelineData = pipelineStages.map(stage => ({
    ...stage,
    count: projects.filter(p => p.stage === stage.id).length,
    value: projects.filter(p => p.stage === stage.id).reduce((s, p) => s + (p.budget || 0), 0),
  }));

  const maxPipelineValue = Math.max(...pipelineData.map(d => d.value), 1);

  // ── Overdue invoices list (replacement for Invoice Status donut) ──
  // Catches anything explicitly flagged 'overdue' plus 'sent' invoices
  // whose due date has already passed (in case auto-detect hasn't run).
  // Sorted by oldest-due first so the most pressing chase is at the top.
  const overdueList = invoices
    .filter(i => {
      if (i.status === 'overdue') return true;
      if (i.status === 'sent' && i.dueDate && new Date(i.dueDate) < todayStart) return true;
      return false;
    })
    .map(i => {
      const c = clients.find(cl => cl.id === i.clientId);
      const due = i.dueDate ? new Date(i.dueDate) : null;
      const daysOverdue = due ? Math.floor((todayStart - due) / 86400000) : null;
      return {
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        clientName: c?.company || i.clientCompany || '—',
        amount: invoiceTotal(i.items, i.taxRate, i.discount),
        daysOverdue,
        shareToken: i.shareToken,
      };
    })
    .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0))
    .slice(0, 6);

  // ── Action Items list (replacement for Top Clients ranking) ──
  // Unified queue of "things waiting on you", pulled from three sources:
  //   - open markup pins (resolved through screenshot → app → client)
  //   - urgent / high-priority tickets in open or in-progress state
  //   - proposals still 'sent' more than 3 days after going out
  // Each item has a uniform shape so the renderer is dumb.
  const STALE_PROPOSAL_DAYS = prefs.staleProposalDays;
  const pinItems = annotationPins
    .filter(p => p.status === 'open')
    .map(p => {
      const sc = appScreenshots.find(s => s.id === p.screenshotId);
      const app = sc ? applications.find(a => a.id === sc.applicationId) : null;
      const client = app ? clients.find(cl => cl.id === app.clientId) : null;
      const ageDays = p.createdAt ? Math.floor((now - new Date(p.createdAt)) / 86400000) : 0;
      return {
        type: 'pin',
        id: 'pin-' + p.id,
        title: app ? `Markup pin on ${app.name}` : 'Markup pin',
        sub: client?.company || '',
        ageDays,
        onClick: () => navigate('/clients'),
      };
    });
  const ticketItems = tickets
    .filter(t =>
      (t.priority === 'urgent' || t.priority === 'high') &&
      (t.status === 'open' || t.status === 'in_progress' || t.status === 'in-progress')
    )
    .map(t => {
      const client = clients.find(c => c.id === t.clientId);
      const ageDays = t.createdAt ? Math.floor((now - new Date(t.createdAt)) / 86400000) : 0;
      return {
        type: 'ticket',
        id: 'ticket-' + t.id,
        title: t.subject || 'Ticket',
        sub: client?.company || '',
        ageDays,
        priority: t.priority,
        onClick: () => navigate('/tickets'),
      };
    });
  const staleProposalItems = sows
    .filter(s => s.status === 'sent')
    .map(s => {
      const sentAt = s.sentDate || s.createdAt;
      const ageDays = sentAt ? Math.floor((now - new Date(sentAt)) / 86400000) : 0;
      return { sow: s, ageDays };
    })
    .filter(({ ageDays }) => ageDays >= STALE_PROPOSAL_DAYS)
    .map(({ sow, ageDays }) => {
      const client = clients.find(c => c.id === sow.clientId);
      return {
        type: 'proposal',
        id: 'proposal-' + sow.id,
        title: sow.projectTitle || 'Proposal',
        sub: client?.company || '',
        ageDays,
        onClick: () => navigate('/proposals'),
      };
    });
  const actionItems = [...pinItems, ...ticketItems, ...staleProposalItems]
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 7);

  // ── Application Health table (replacement for By Industry chart) ──
  // Each row pairs an app with the recurring revenue it carries (its own
  // monthlyCost + linked active recurring expenses) and how many open
  // tickets reference it. Sort: most-trouble-first (open tickets desc),
  // tiebreak by MRR contribution.
  const appHealth = applications
    .map(app => {
      const linkedExpenses = recurringExpenses.filter(e =>
        e.applicationId === app.id && e.status === 'active'
      );
      const monthlyContrib = (app.monthlyCost || 0) + linkedExpenses.reduce((s, e) => {
        if (e.frequency === 'monthly') return s + (e.amount || 0);
        if (e.frequency === 'yearly')  return s + (e.amount || 0) / 12;
        return s;
      }, 0);
      const appOpenTickets = tickets.filter(t =>
        t.applicationId === app.id &&
        (t.status === 'open' || t.status === 'in_progress' || t.status === 'in-progress')
      ).length;
      const client = clients.find(c => c.id === app.clientId);
      return { app, monthlyContrib, openTickets: appOpenTickets, clientName: client?.company || '' };
    })
    .sort((a, b) => b.openTickets - a.openTickets || b.monthlyContrib - a.monthlyContrib)
    .slice(0, 6);

  // Monthly revenue (configurable trailing window). Window length pulls
  // from prefs.chartMonths so users can pick 3/6/12 in Settings.
  const chartMonths = prefs.chartMonths;
  const monthlyRevenue = useMemo(() => {
    const months = [];
    for (let i = chartMonths - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const revenue = paidInvoices
        .filter(inv => inv.paidDate?.startsWith(key) || inv.issueDate?.startsWith(key))
        .reduce((s, inv) => s + invoiceTotal(inv.items, inv.taxRate, inv.discount), 0);
      months.push({ key, label, revenue });
    }
    return months;
  }, [paidInvoices, chartMonths]);

  const maxMonthlyRev = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  // Upcoming deadlines
  const upcomingDeadlines = projects
    .filter(p => p.deadline && p.stage !== 'completed' && p.stage !== 'on-hold')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  return (
    <div className="dash">
      {/* ═══ WELCOME BANNER (toggleable) ═══ */}
      {sectionsOn.welcomeBanner && (
        <div className="dash__welcome">
          <div className="dash__welcome-content">
            <h2>Welcome back, {settings.ownerName?.split(' ')[0] || 'there'}!</h2>
          </div>
          <div className="dash__welcome-actions">
            <button className="btn btn--primary" onClick={() => navigate('/proposals')}>+ New Proposal</button>
            <button className="btn btn--primary" onClick={() => navigate('/invoices')}>+ New Invoice</button>
          </div>
        </div>
      )}

      {/* ═══ PENDING ONBOARDING ═══ (always shown when there are submissions) */}
      {setClients && <OnboardingReview setClients={setClients} addNotification={addNotification} />}

      {/* ═══ KPI CARDS ═══
           Built from a registry so Settings > Dashboard can toggle / reorder.
           The card props are computed up-front so the render below stays a
           dumb lookup-and-render. */}
      {(() => {
        // Each registry entry maps to a row of display props (label/value/
        // sub/onClick). Color comes from the per-card config (registry
        // default or saved override) — see colorFor() in lib/dashboardCards.
        // If you add a new card to KPI_CARD_DEFS, add the matching key below.
        const cardProps = {
          // ── Default cards ─────────────────────────────────────────────
          totalRevenue:   { label: 'Total Revenue',   value: formatCurrency(totalRevenue), sub: `${paidInvoices.length} paid invoices`, onClick: () => navigate('/invoices') },
          outstanding:    { label: 'Outstanding',     value: formatCurrency(totalOutstanding), sub: totalOverdue > 0 ? `${formatCurrency(totalOverdue)} overdue` : `${outstandingInvoices.length} invoices`, onClick: () => navigate('/invoices') },
          activeClients:  { label: 'Active Clients',  value: activeClients, sub: `${prospects} prospects`, onClick: () => navigate('/clients') },
          activeProjects: { label: 'Active Projects', value: activeProjects, sub: formatCurrency(totalProjectBudget) + ' total budget', onClick: () => navigate('/pipeline') },
          proposals:      { label: 'Proposals',       value: sows.length, sub: `${formatCurrency(pendingValue)} pending`, onClick: () => navigate('/proposals') },

          // ── Optional cards (off by default; toggle in Settings) ──────
          thisMonthRevenue:  { label: 'Revenue This Month', value: formatCurrency(thisMonthRevenue), sub: `${thisMonthPaid.length} invoice${thisMonthPaid.length === 1 ? '' : 's'} paid`, onClick: () => navigate('/invoices') },
          overdue:           { label: 'Overdue',            value: overdueInvoices.length, sub: formatCurrency(totalOverdue), onClick: () => navigate('/invoices') },
          pendingProposals:  { label: 'Pending Proposals',  value: pendingProposals.length, sub: `${formatCurrency(pendingValue)} pending`, onClick: () => navigate('/proposals') },
          acceptedProposals: { label: 'Accepted Proposals', value: acceptedProposals.length, sub: `${formatCurrency(acceptedValue)} won`, onClick: () => navigate('/proposals') },
          winRate:             { label: 'Win Rate',           value: `${winRate}%`, sub: decidedProposals.length === 0 ? 'no decisions yet' : `${acceptedProposals.length} of ${decidedProposals.length} decided`, onClick: () => navigate('/proposals') },
          pipelineValue:       { label: 'Pipeline Value',     value: formatCurrency(pipelineValue), sub: `${projects.filter(p => p.stage !== 'completed').length} open projects`, onClick: () => navigate('/pipeline') },
          projectsDueSoon:     { label: 'Projects Due Soon',  value: projectsDueSoon.length, sub: projectsOverdue.length > 0 ? `${projectsOverdue.length} overdue` : 'next 14 days', onClick: () => navigate('/pipeline') },
          newClientsThisMonth: { label: 'New Clients (Month)',value: newClientsThisMonth.length, sub: clients.length === 0 ? 'no clients yet' : `${clients.length} all-time`, onClick: () => navigate('/clients') },
          avgDaysToPay:        { label: 'Avg Days to Pay',    value: avgDaysToPay, sub: paidWithDates.length === 0 ? 'no paid invoices yet' : `across ${paidWithDates.length} paid`, onClick: () => navigate('/invoices') },
          openTickets:         { label: 'Open Tickets',       value: openTickets.length, sub: `${tickets.length} total`, onClick: () => navigate('/tickets') },
          urgentTickets:       { label: 'Urgent Tickets',     value: urgentTickets.length, sub: urgentTickets.length === 0 ? 'all clear' : 'high or urgent priority', onClick: () => navigate('/tickets') },
          openMarkupPins:      { label: 'Open Markup Pins',   value: openMarkupPins.length, sub: openMarkupPins.length === 0 ? 'caught up' : 'awaiting your response', onClick: () => navigate('/clients') },
          liveApplications:    { label: 'Live Apps',          value: liveApplications.length, sub: `${applications.length} total`, onClick: () => navigate('/clients') },
          monthlyRecurring:    { label: 'Monthly Recurring',  value: formatCurrency(monthlyRecurring), sub: `${activeRecurring.length} active`, onClick: () => navigate('/recurring') },
        };
        const order = resolveCardOrder(settings.dashboardKpiCards);
        // Defensive cap — if older saved settings have more than the max
        // enabled, only render the first MAX_VISIBLE_KPI_CARDS. Settings UI
        // also enforces this on toggle, but the data could pre-date the cap.
        const visible = order
          .filter(c => c.enabled !== false && cardProps[c.id])
          .slice(0, MAX_VISIBLE_KPI_CARDS);
        if (visible.length === 0) return null;
        // Compute a balanced column count up-front and pass it via a CSS
        // variable. CSS auto-fit fills greedily (6/1 for 7 cards); this
        // gives 4/3 instead. See pickKpiColumns() for the tradeoffs.
        const cols = pickKpiColumns(visible.length);
        return (
          <div className="dash__kpis" style={{ '--kpi-cols': cols }}>
            {visible.map(c => <KpiCard key={c.id} color={colorFor(c)} {...cardProps[c.id]} />)}
          </div>
        );
      })()}

      {/* ═══ ROW 1 — Monthly Revenue + Pipeline Value ═══
           Two visual-summary charts paired together. Each is independently
           toggleable; the row collapses if both are hidden and stretches a
           single visible one full-width via the cols-N modifier class. */}
      {(() => {
        const cells = [sectionsOn.monthlyRevenue, sectionsOn.pipelineValue].filter(Boolean).length;
        if (cells === 0) return null;
        return (
        <div className={`dash__row dash__row--cols-${cells}`}>
          {sectionsOn.monthlyRevenue && (
            <div className="dash__card dash__card--2">
              <div className="dash__card-header">
                <h3>Monthly Revenue</h3>
                <span className="dash__card-badge">Last {chartMonths} Months</span>
              </div>
              <div className="dash__bar-chart">
                {monthlyRevenue.map(month => (
                  <div key={month.key} className="dash__bar-col">
                    <span className="dash__bar-value">{month.revenue > 0 ? formatCompact(month.revenue) : ''}</span>
                    <div className="dash__bar-track">
                      <div
                        className="dash__bar-fill"
                        style={{ height: `${(month.revenue / maxMonthlyRev) * 100}%` }}
                      />
                    </div>
                    <span className="dash__bar-label">{month.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sectionsOn.pipelineValue && (
            <div className="dash__card">
              <div className="dash__card-header">
                <h3>Pipeline Value</h3>
                <span className="dash__card-badge">{formatCurrency(totalProjectBudget)}</span>
              </div>
              <div className="dash__h-bars">
                {pipelineData.map(stage => (
                  <div key={stage.id} className="dash__h-bar-row">
                    <span className="dash__h-bar-label">
                      <span className="dash__h-bar-dot" style={{ background: stage.color }} />
                      {stage.label}
                    </span>
                    <div className="dash__h-bar-track">
                      <div className="dash__h-bar-fill" style={{ width: `${(stage.value / maxPipelineValue) * 100}%`, background: stage.color }} />
                    </div>
                    <span className="dash__h-bar-value">{formatCompact(stage.value)}</span>
                    <span className="dash__h-bar-count">{stage.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* ═══ ROW 2 — Overdue Invoices ═══
           Standalone row: when visible it spans full width so the worklist
           can show more entries before scrolling. When hidden the row
           disappears entirely. */}
      {sectionsOn.overdueInvoices && (
        <div className="dash__row dash__row--cols-1">
          <div className="dash__card">
            <div className="dash__card-header">
              <h3>Overdue Invoices</h3>
              <button className="dash__card-link" onClick={() => navigate('/invoices')}>View all →</button>
            </div>
            <div className="dash__overdue-list">
              {overdueList.length === 0 ? (
                <div className="dash__chart-empty">All invoices current — nothing overdue</div>
              ) : (
                overdueList.map(inv => (
                  <div
                    key={inv.id}
                    className="dash__overdue-row"
                    onClick={() => navigate('/invoices')}
                  >
                    <div className="dash__overdue-info">
                      <span className="dash__overdue-num">{inv.invoiceNumber || '—'}</span>
                      <span className="dash__overdue-client">{inv.clientName}</span>
                    </div>
                    <div className="dash__overdue-meta">
                      <span className="dash__overdue-amt">{formatCurrency(inv.amount)}</span>
                      <span className="dash__overdue-days">
                        {inv.daysOverdue == null ? 'overdue' : `${inv.daysOverdue}d late`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ROW 3 — Action Items / Application Health / Upcoming Deadlines ═══
           Order is intentional: Action Items first because that's the
           "what should I do today" surface; App Health second for
           portfolio status; Deadlines last as a forward-looking list.
           Recent Activity moved to Settings > Activity. */}
      {(() => {
        const cells = [
          sectionsOn.actionItems,
          sectionsOn.appHealth,
          sectionsOn.upcomingDeadlines,
        ].filter(Boolean).length;
        if (cells === 0) return null;
        return (
        <div className={`dash__row dash__row--cols-${cells}`}>
        {sectionsOn.actionItems && (
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Action Items</h3>
            <span className="dash__card-badge">{actionItems.length}</span>
          </div>
          <div className="dash__actions-list">
            {actionItems.length === 0 ? (
              <div className="dash__chart-empty">Nothing waiting on you — nice work</div>
            ) : (
              actionItems.map(item => (
                <div
                  key={item.id}
                  className={`dash__action-row dash__action-row--${item.type}`}
                  onClick={item.onClick}
                >
                  <span className={`dash__action-tag dash__action-tag--${item.type}`}>
                    {item.type === 'pin'      && 'Markup'}
                    {item.type === 'ticket'   && (item.priority === 'urgent' ? 'Urgent' : 'High')}
                    {item.type === 'proposal' && 'Proposal'}
                  </span>
                  <div className="dash__action-info">
                    <span className="dash__action-title">{item.title}</span>
                    {item.sub && <span className="dash__action-sub">{item.sub}</span>}
                  </div>
                  <span className="dash__action-age">{item.ageDays}d</span>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {sectionsOn.appHealth && (
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Application Health</h3>
            <button className="dash__card-link" onClick={() => navigate('/clients')}>View all →</button>
          </div>
          <div className="dash__app-health">
            {appHealth.length === 0 ? (
              <div className="dash__chart-empty">No applications tracked yet</div>
            ) : (
              appHealth.map(({ app, monthlyContrib, openTickets, clientName }) => (
                <div
                  key={app.id}
                  className="dash__app-row"
                  onClick={() => navigate('/clients')}
                >
                  <div className="dash__app-info">
                    <span className="dash__app-name">{app.name}</span>
                    <span className="dash__app-client">{clientName}</span>
                  </div>
                  <span className={`status-pill status-pill--app-${app.status}`}>
                    {app.status === 'in-development' ? 'Dev' : app.status === 'maintenance' ? 'Maint' : app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                  </span>
                  <span
                    className={`dash__app-tickets ${openTickets > 0 ? 'dash__app-tickets--has' : ''}`}
                    title={`${openTickets} open ticket${openTickets === 1 ? '' : 's'}`}
                  >
                    {openTickets > 0 ? `${openTickets} open` : '—'}
                  </span>
                  <span className="dash__app-mrr">
                    {monthlyContrib > 0 ? formatCurrency(monthlyContrib) + '/mo' : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {sectionsOn.upcomingDeadlines && (
        <div className="dash__card">
          <div className="dash__card-header">
            <h3>Upcoming Deadlines</h3>
            <button className="dash__card-link" onClick={() => navigate('/pipeline')}>Pipeline →</button>
          </div>
          <div className="dash__deadlines">
            {upcomingDeadlines.map(project => {
              const days = Math.ceil((new Date(project.deadline) - new Date()) / 86400000);
              const client = clients.find(c => c.id === project.clientId);
              return (
                <div key={project.id} className="dash__deadline-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="dash__deadline-info">
                    <span className="dash__deadline-title">
                      {project.projectNumber && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--brand)', marginRight: 6, fontWeight: 500 }}>
                          {project.projectNumber}
                        </span>
                      )}
                      {project.title}
                    </span>
                    <span className="dash__deadline-client">{client?.company || ''}</span>
                  </div>
                  <span className={`dash__deadline-days ${days <= 7 ? 'dash__deadline-days--warn' : ''} ${days <= 0 ? 'dash__deadline-days--overdue' : ''}`}>
                    {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                  </span>
                </div>
              );
            })}
            {upcomingDeadlines.length === 0 && <div className="dash__chart-empty">No upcoming deadlines</div>}
          </div>
        </div>
        )}
        </div>
        );
      })()}
    </div>
  );
}

/* ═══ HELPER COMPONENTS ═══ */

function KpiCard({ label, value, sub, color, onClick }) {
  // The color is plumbed via a CSS custom property so all the visual
  // treatment (top accent, value tint, hover glow, soft wash) can pull
  // from a single source. See `.dash__kpi` rules in App.css.
  return (
    <div className="dash__kpi" style={{ '--card-color': color }} onClick={onClick}>
      <span className="dash__kpi-label">{label}</span>
      <span className="dash__kpi-value">{value}</span>
      <span className="dash__kpi-sub">{sub}</span>
    </div>
  );
}

function formatCurrency(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCompact(n) {
  if (n === 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '$' + n.toLocaleString();
}
