export const initialClients = [
  {
    id: 'c1',
    name: 'Levi Holder',
    company: 'Lark Solutions',
    email: 'levi@larksolutions.com',
    phone: '(903) 555-0142',
    industry: 'Construction',
    status: 'active',
    notes: 'Long-term client. Referred TradeLink. Prefers bi-weekly check-ins.',
    value: 48000,
    createdAt: '2025-09-15',
  },
  {
    id: 'c2',
    name: 'Tom Dale',
    company: 'TradeLink',
    email: 'tom@tradelink.io',
    phone: '(214) 555-0198',
    industry: 'Logistics',
    status: 'active',
    notes: 'Needs custom dashboard for fleet tracking. Phase 2 starting soon.',
    value: 72000,
    createdAt: '2025-11-03',
  },
  {
    id: 'c3',
    name: 'Brandon Larkin',
    company: 'Lark Solutions',
    email: 'brandon@larksolutions.com',
    phone: '(903) 555-0177',
    industry: 'Construction',
    status: 'active',
    notes: 'Operations lead. Primary contact for tool development projects.',
    value: 35000,
    createdAt: '2026-01-10',
  },
  {
    id: 'c4',
    name: 'Rachel Simmons',
    company: 'Meridian Energy',
    email: 'rachel@meridianenergy.com',
    phone: '(713) 555-0234',
    industry: 'Energy & Utilities',
    status: 'prospect',
    notes: 'Met at Houston Industrial Expo. Interested in system restructuring.',
    value: 0,
    createdAt: '2026-03-20',
  },
  {
    id: 'c5',
    name: 'Marcus Webb',
    company: 'Ironclad Manufacturing',
    email: 'marcus@ironcladmfg.com',
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
    clientId: 'c2',
    projectTitle: 'TradeLink — Fleet Dashboard',
    description: 'Design and develop a real-time fleet monitoring dashboard with route optimization, driver analytics, and maintenance scheduling capabilities.',
    scopeItems: [
      { title: 'UI/UX Design', description: 'Wireframes, mockups, and interactive prototype for dashboard interface' },
      { title: 'Frontend Development', description: 'React-based dashboard with real-time data visualization components' },
      { title: 'API Development', description: 'RESTful API layer for fleet data aggregation and processing' },
      { title: 'GPS Integration', description: 'Real-time GPS tracking integration with map visualization' },
    ],
    deliverables: [
      { title: 'Design System & Mockups', dueDate: '2026-05-15' },
      { title: 'MVP Dashboard', dueDate: '2026-06-30' },
      { title: 'API & Integration Layer', dueDate: '2026-07-31' },
      { title: 'Final Delivery & Training', dueDate: '2026-08-15' },
    ],
    timeline: { startDate: '2026-05-01', endDate: '2026-08-15' },
    budget: 45000,
    terms: 'Payment schedule: 30% upon signing, 30% at MVP delivery, 40% upon final delivery. All work remains property of Clad Forge until final payment is received. Includes 30 days of post-delivery support.',
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
  defaultPaymentTerms: 'Net 30',
  defaultCurrency: 'USD',
  defaultTaxRate: 0,
  invoicePrefix: 'INV',
  invoiceNextNumber: 1,
  defaultInvoiceNotes: 'Thank you for your business. Please remit payment by the due date.',
  paymentInstructions: '',
  autoDetectOverdue: true,

  // ── SOW / Proposals ──
  sowPrefix: 'SOW',
  sowFooter: 'This Statement of Work is subject to the terms and conditions of the Master Services Agreement between Clad Forge and the Client.',
  defaultSowTerms: 'Payment schedule: 30% upon signing, 30% at midpoint delivery, 40% upon final delivery. All work remains property of Clad Forge until final payment is received. Includes 30 days of post-delivery support.',
  defaultPaymentSchedule: '30 / 30 / 40',

  // ── Time Tracking ──
  defaultHourlyRate: 150,
  timeRounding: 'none',
  workHoursPerDay: 8,

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
};

export const initialInvoices = [];
export const initialTimeEntries = [];
export const initialEvents = [];
export const initialContractors = [];
export const initialDeals = [];
export const initialCrmActivities = [];
export const initialChannelPartners = [];
export const initialDocuments = [];
export const initialNotifications = [];
export const initialAutomations = [];

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
