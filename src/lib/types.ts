// Shared TypeScript types used across portal and admin components.
//
// Field shapes follow the camelCase convention enforced by the
// snakeToCamel transform in useSupabaseData / useClientPortalData.
// When DB columns are added, add the corresponding camelCase field
// here so TypeScript can flag missed call sites.

/** Profile row (auth user metadata). One per Supabase auth user. */
export interface Profile {
  id: string;
  /** Admin app uses 'admin' / 'user' / 'contractor' / 'guest';
   *  portal users use 'client'. */
  role: 'admin' | 'user' | 'contractor' | 'guest' | 'client';
  fullName?: string;
  /** Not stored in profiles — added by App.jsx by merging session.user.email. */
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}

/** Client = a company (not an individual). The primary identifier is `company`. */
export interface Client {
  id: string;
  company: string;
  email?: string;
  phone?: string;
  industry?: string;
  status?: string;
  notes?: string;
  value?: number;
  website?: string;
  address?: string;
  contacts?: ClientContact[];
  brandColors?: string[];
  brandFonts?: { heading?: string; body?: string };
  brandTone?: string;
  brandLogoUrl?: string;
  companySize?: string;
  createdAt?: string;
}

/** Individual contact within a client company (stored in clients.contacts JSONB). */
export interface ClientContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  role?: string;
}

/** Settings is a singleton (id='default'). Holds company-wide config. */
export interface Settings {
  id?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  ownerName?: string;
  brandLogoUrl?: string;
  theme?: 'dark' | 'light';
  taxId?: string;
  // Many other fields exist on the row; add typed entries as components consume them.
  [key: string]: unknown;
}

/** A portal user's membership in a specific client company. */
export interface ClientUser {
  id: string;
  authUserId: string;
  clientId: string;
  portalRole: 'owner' | 'billing' | 'viewer';
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  lastSeenAt?: string;
  createdAt?: string;
}

/** A project milestone — explicit decision point with client approval workflow.
 *  Distinct from projects.deliverables (a simple checklist). */
export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: 'draft' | 'pending' | 'approved' | 'changes_requested';
  clientComment?: string;
  decidedBy?: string;
  decidedAt?: string;
  position?: number;
  createdAt?: string;
  createdBy?: string;
}

/** A support ticket — clients submit, admin replies. Optionally tied to an
 *  application or a project for context. */
export interface ServiceTicket {
  id: string;
  clientId: string;
  applicationId?: string;
  projectId?: string;
  subject: string;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  submittedBy?: string;
  assignedTo?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt?: string;
}

/** A comment on a ticket. is_internal = admin-only note, hidden from client. */
export interface TicketComment {
  id: string;
  ticketId: string;
  body: string;
  authorId?: string;
  isInternal?: boolean;
  createdAt?: string;
}

/** A screenshot of an application for visual markup. */
export interface AppScreenshot {
  id: string;
  applicationId: string;
  /** Base64 data URI for now; will become Supabase Storage URL later. */
  imageUrl: string;
  caption?: string;
  capturedAt?: string;
  capturedBy?: string;
  createdAt?: string;
}

/** A pin dropped on a screenshot. x/y are percentages so the pin stays
 *  positioned correctly at any rendered image size. */
export interface AnnotationPin {
  id: string;
  screenshotId: string;
  xPct: number;
  yPct: number;
  body?: string;
  status: 'open' | 'resolved';
  authorId?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt?: string;
}

/** A living deliverable owned by a client. Built by projects, maintained over
 *  time. Service tickets and screenshot annotations (future) attach to apps. */
export interface Application {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  url?: string;
  type: 'website' | 'web-app' | 'mobile-app' | 'api' | 'other';
  status: 'planning' | 'in-development' | 'staging' | 'live' | 'maintenance' | 'archived';
  launchedAt?: string;
  monthlyCost?: number;
  notes?: string;
  /** Base64 data URI thumbnail (admin uploads). Optional — falls back to a
   *  type-icon placeholder on the card if not set. */
  thumbnailUrl?: string;
  /** Free-form per-app config — domain info, runbook notes, feature flags, etc.
   *  Specific categories will be split into typed fields as use cases firm up. */
  metadata?: Record<string, unknown>;
  createdAt?: string;
  createdBy?: string;
}
