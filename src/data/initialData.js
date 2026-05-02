export const initialClients = [
  {
    id: 'c1',
    company: 'Lark Solutions',
    email: 'info@larksolutions.com',
    phone: '(903) 555-0142',
    industry: 'Construction',
    status: 'active',
    notes: 'Long-term client. Referred TradeLink. Prefers bi-weekly check-ins.',
    value: 48000,
    createdAt: '2025-09-15',
  },
  {
    id: 'c2',
    company: 'TradeLink',
    email: 'info@tradelink.io',
    phone: '(214) 555-0198',
    industry: 'Logistics',
    status: 'active',
    notes: 'Needs custom dashboard for fleet tracking. Phase 2 starting soon.',
    value: 72000,
    createdAt: '2025-11-03',
  },
  {
    id: 'c3',
    company: 'Lark Solutions',
    email: 'contact@larksolutions.com',
    phone: '(903) 555-0177',
    industry: 'Construction',
    status: 'active',
    notes: 'Operations lead. Primary contact for tool development projects.',
    value: 35000,
    createdAt: '2026-01-10',
  },
  {
    id: 'c4',
    company: 'Meridian Energy',
    email: 'info@meridianenergy.com',
    phone: '(713) 555-0234',
    industry: 'Energy & Utilities',
    status: 'prospect',
    notes: 'Met at Houston Industrial Expo. Interested in system restructuring.',
    value: 0,
    createdAt: '2026-03-20',
  },
  {
    id: 'c5',
    company: 'Ironclad Manufacturing',
    email: 'info@ironcladmfg.com',
    phone: '(469) 555-0311',
    industry: 'Manufacturing',
    status: 'on-hold',
    notes: 'Website project paused due to internal restructuring. Follow up Q3.',
    value: 28000,
    createdAt: '2025-07-22',
  },
];

export const initialProjects = [
  {
    id: 'p1',
    title: 'Lark Solutions — Operations Portal',
    clientId: 'c1',
    stage: 'active',
    budget: 32000,
    deadline: '2026-06-30',
    description: 'Custom operations dashboard with real-time field crew tracking and job scheduling.',
    createdAt: '2026-01-15',
  },
  {
    id: 'p2',
    title: 'TradeLink — Fleet Dashboard',
    clientId: 'c2',
    stage: 'proposal',
    budget: 45000,
    deadline: '2026-08-15',
    description: 'Real-time fleet monitoring dashboard with route optimization and driver analytics.',
    createdAt: '2026-03-01',
  },
  {
    id: 'p3',
    title: 'Lark Solutions — Website Rebuild',
    clientId: 'c3',
    stage: 'completed',
    budget: 18000,
    deadline: '2026-02-28',
    description: 'Full website rebuild with performance optimization and AI-assisted search.',
    createdAt: '2025-10-20',
  },
  {
    id: 'p4',
    title: 'Meridian Energy — System Audit',
    clientId: 'c4',
    stage: 'lead',
    budget: 15000,
    deadline: '2026-09-01',
    description: 'Legacy system audit for cloud migration readiness assessment.',
    createdAt: '2026-03-22',
  },
  {
    id: 'p5',
    title: 'Ironclad Mfg — Product Catalog',
    clientId: 'c5',
    stage: 'on-hold',
    budget: 22000,
    deadline: '2026-10-01',
    description: 'Interactive product catalog with 3D model viewer and spec sheet generator.',
    createdAt: '2025-08-05',
  },
  {
    id: 'p6',
    title: 'TradeLink — API Integration',
    clientId: 'c2',
    stage: 'review',
    budget: 28000,
    deadline: '2026-05-15',
    description: 'REST API integration layer connecting TradeLink ERP with third-party logistics providers.',
    createdAt: '2025-12-10',
  },
];

export const initialSOWs = [
  {
    id: 'sow1',
    proposalNumber: '26-001',
    clientId: 'c2',
    projectId: 'p2',
    projectTitle: 'TradeLink — Fleet Dashboard',
    description: 'Design and develop a real-time fleet monitoring dashboard with route optimization, driver analytics, and maintenance scheduling capabilities.',
    packages: [
      { id: 'pkg1', name: 'UI/UX Design', description: 'Wireframes, mockups, and interactive prototype for dashboard interface', price: 10000, optional: false, items: [{ text: 'Design System & Mockups', included: true }, { text: 'Interactive prototype', included: true }] },
      { id: 'pkg2', name: 'Frontend Development', description: 'React-based dashboard with real-time data visualization components', price: 15000, optional: false, items: [{ text: 'MVP Dashboard build', included: true }, { text: 'Data visualization components', included: true }] },
      { id: 'pkg3', name: 'API Development', description: 'RESTful API layer for fleet data aggregation and processing', price: 12000, optional: false, items: [{ text: 'API & Integration Layer', included: true }, { text: 'Third-party GPS integration', included: true }] },
      { id: 'pkg4', name: 'Training & Documentation', description: 'End-user training sessions and technical documentation', price: 8000, optional: true, items: [{ text: 'User training sessions', included: true }, { text: 'Technical documentation', included: true }] },
    ],
    timeline: { startDate: '2026-05-01', endDate: '2026-08-15' },
    terms: 'Payment schedule: 30% upon signing, 30% at MVP delivery, 40% upon final delivery. All work remains property of Clad Forge until final payment is received. Includes 30 days of post-delivery support.',
    validUntil: '2026-04-28',
    status: 'draft',
    createdAt: '2026-03-28',
  },
];

export const initialActivities = [
  { id: 'a1', type: 'client', message: 'New prospect added: Rachel Simmons (Meridian Energy)', time: '2 hours ago', icon: 'user-plus' },
  { id: 'a2', type: 'project', message: 'TradeLink API Integration moved to Review', time: '5 hours ago', icon: 'arrow-right' },
  { id: 'a3', type: 'sow', message: 'SOW drafted for TradeLink Fleet Dashboard', time: '1 day ago', icon: 'file-text' },
  { id: 'a4', type: 'project', message: 'Lark Solutions Website Rebuild completed', time: '2 days ago', icon: 'check' },
  { id: 'a5', type: 'client', message: 'Ironclad Manufacturing status changed to On Hold', time: '3 days ago', icon: 'pause' },
  { id: 'a6', type: 'project', message: 'Lark Solutions Operations Portal started', time: '5 days ago', icon: 'play' },
];

export const initialSettings = {
  // ── Company Profile ──
  companyName: 'Clad Forge',
  companyEmail: 'cort@cladforge.com',
  companyPhone: '+1 (800) 555-1234',
  companyAddress: 'Tyler, Texas',
  companyWebsite: 'https://cladforge.com',
  taxId: '',
  ownerName: 'Courtland Adaire',
  ownerTitle: 'Founder & Engineer',

  // ── Invoicing ──
  defaultPaymentTerms: 'Net 15',
  defaultCurrency: 'USD',
  defaultTaxRate: 0,
  invoicePrefix: 'INV',
  invoiceNextNumber: 1,
  defaultInvoiceNotes: 'Thank you for your business. Please remit payment by the due date.',
  paymentInstructions: '',
  autoDetectOverdue: true,

  // ── Bank Details (shown on invoice Bank Transfer panel) ──
  bankName: '',
  bankAccountName: '',
  bankRoutingNumber: '',
  bankAccountNumber: '',
  bankWireRoutingNumber: '',
  bankSwiftCode: '',
  bankVerificationNote: 'If these details differ from what you expect, call us directly before sending payment to verify. Never act on banking changes received only via email.',

  invoiceEmailSubject: 'Invoice {{invoice_number}} — {{project_title}} | {{company_name}}',
  invoiceEmailBody: `Hi {{name}},

I hope this message finds you well. Please find Invoice {{invoice_number}} at the link below:

{{invoice_link}}

Project: {{project_title}}
Invoice #: {{invoice_number}}
Amount Due: {{total_due}}
Due Date: {{due_date}}

You can view the full invoice, download a copy, and confirm your payment directly from the link above.

Thank you for your business!

Best regards,
{{owner_name}}
{{company_name}}
{{company_email}}
{{company_phone}}`,

  // ── SOW / Proposals ──
  sowPrefix: 'SOW',
  sowFooter: 'This Statement of Work is subject to the terms and conditions of the Master Services Agreement between Clad Forge and the Client.',
  defaultSowTerms: 'Payment schedule: 30% upon signing, 30% at midpoint delivery, 40% upon final delivery. All work remains property of Clad Forge until final payment is received. Includes 30 days of post-delivery support.',
  defaultPaymentSchedule: '30 / 30 / 40',

  sowEmailSubject: 'Proposal {{proposal_number}} — {{project_title}} | {{company_name}}',
  sowEmailBody: `Hi {{name}},

Thank you for the opportunity to put this together. Please review and sign the proposal at the link below:

{{proposal_link}}

Proposal #: {{proposal_number}}
Project: {{project_title}}
Total Investment: {{total_amount}}
Valid Until: {{valid_until}}

Happy to jump on a quick call if you have questions before signing.

Best regards,
{{owner_name}}
{{company_name}}
{{company_email}}
{{company_phone}}`,

  // ── Pipeline ──
  pipelineStages: 'Lead, Proposal, Active, Review, Completed',
  defaultStage: 'lead',

  // ── Appearance ──
  theme: 'dark',
  accentColor: '#ff8c00',
  dateFormat: 'MM/DD/YYYY',
  sidebarCollapsed: false,

  // ── Notifications ──
  invoiceReminderDays: 3,
  clientFollowUpDays: 14,
  projectDeadlineWarningDays: 7,

  // ── Client Defaults ──
  defaultIndustry: 'Construction',
  customIndustries: 'Construction, Energy & Utilities, Manufacturing, Logistics, Oil & Gas, Engineering Services, Telecommunications, Other',

  // ── Dashboard KPI cards ──
  // Order + visibility for the cards on the admin dashboard. The id strings
  // match KPI_CARD_DEFS in src/pages/Dashboard.jsx; the app falls back to
  // defaults for any registry entries missing here, so adding a new card
  // later doesn't require migrating user data.
  dashboardKpiCards: [
    { id: 'totalRevenue',   enabled: true },
    { id: 'outstanding',    enabled: true },
    { id: 'activeClients',  enabled: true },
    { id: 'activeProjects', enabled: true },
    { id: 'proposals',      enabled: true },
  ],

  // ── Dashboard preferences ──
  // Customization knobs for the dashboard beyond KPI card visibility.
  // sections     — toggle each chart/list block on or off
  // chartMonths  — time window for the Monthly Revenue bar chart
  // dueSoonDays  — horizon for the "Projects Due Soon" KPI card
  // staleProposalDays — minimum age for a 'sent' proposal to surface in
  //                Action Items
  dashboardPreferences: {
    sections: {
      welcomeBanner:     true,
      monthlyRevenue:    true,
      overdueInvoices:   true,
      pipelineValue:     true,
      actionItems:       true,
      appHealth:         true,
      upcomingDeadlines: true,
      recentActivity:    true,
    },
    chartMonths:       6,   // 3 | 6 | 12
    dueSoonDays:       14,  // 7 | 14 | 21 | 30
    staleProposalDays: 3,   // 1 | 3 | 5 | 7
  },

  // ── External calendar feeds ──
  // Array of { id, name, url, color, enabled } pulled into the Calendar
  // page alongside admin-authored events. URLs should be iCal/ICS feeds
  // (Google, Outlook, Apple iCloud, etc.). Fetching happens client-side
  // so CORS-restricted feeds may need a proxy — see /lib/calendarFeeds.js.
  externalCalendars: [],
};

export const initialInvoices = [];
export const initialEvents = [];
export const initialDeals = [];
export const initialCrmActivities = [];
export const initialChannelPartners = [];
export const initialNotifications = [];
export const initialAutomations = [];
export const initialRecurringExpenses = [];
export const initialFinanceEntries = [];
export const initialTaxPayments = [];

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
