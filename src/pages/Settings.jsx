import { useState } from 'react';
import { initialSettings } from '../data/initialData';
import { KPI_CARD_DEFS, resolveCardOrder, colorFor } from '../lib/dashboardCards';

const TABS = [
  { id: 'company', label: 'Company', icon: '🏢' },
  { id: 'invoicing', label: 'Invoicing', icon: '📄' },
  { id: 'proposals', label: 'Proposals', icon: '📋' },
  { id: 'time', label: 'Time Tracking', icon: '⏱' },
  { id: 'pipeline', label: 'Pipeline', icon: '📊' },
  { id: 'clients', label: 'Clients', icon: '👥' },
  { id: 'dashboard', label: 'Dashboard', icon: '🎛' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'data', label: 'Data', icon: '💾' },
];

export default function Settings({ settings: rawSettings, setSettings, profile, onSignOut }) {
  // Merge with defaults so newly-added fields always exist
  const settings = { ...initialSettings, ...rawSettings };

  const [activeTab, setActiveTab] = useState('company');
  const [saved, setSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  function copyCode(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(''), 1500);
      }).catch(() => fallbackCopy(code));
    } else {
      fallbackCopy(code);
    }
  }

  function fallbackCopy(code) {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 1500);
  }

  function update(field, value) {
    setSettings(prev => ({ ...initialSettings, ...prev, [field]: value }));
  }

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExportSettings() {
    downloadJSON({ settings, exportedAt: new Date().toISOString() }, `clad-forge-settings-${new Date().toISOString().split('T')[0]}.json`);
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="settings">
      {/* Tab Navigation */}
      <div className="settings__layout">
        <nav className="settings__sidebar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`settings__nav-item ${activeTab === tab.id ? 'settings__nav-item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings__nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings__main">
          {/* ═══ COMPANY ═══ */}
          {activeTab === 'company' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Company Profile"
                description="Your business identity used across invoices, proposals, and communications"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Business Information</h4>
                <div className="form-grid">
                  <Field label="Company Name" value={settings.companyName} onChange={v => update('companyName', v)} />
                  <Field label="Website" value={settings.companyWebsite} onChange={v => update('companyWebsite', v)} placeholder="https://..." />
                  <Field label="Email" type="email" value={settings.companyEmail} onChange={v => update('companyEmail', v)} />
                  <Field label="Phone" type="tel" value={settings.companyPhone} onChange={v => update('companyPhone', v)} />
                  <Field label="Address / Location" value={settings.companyAddress} onChange={v => update('companyAddress', v)} full />
                  <Field label="Tax ID / EIN" value={settings.taxId} onChange={v => update('taxId', v)} placeholder="Optional" />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Owner / Primary Contact</h4>
                <div className="form-grid">
                  <Field label="Full Name" value={settings.ownerName} onChange={v => update('ownerName', v)} />
                  <Field label="Title" value={settings.ownerTitle} onChange={v => update('ownerTitle', v)} />
                </div>
              </div>

              {profile && (
                <div className="settings__section">
                  <h4 className="settings__section-title">Your Account</h4>
                  <div className="settings__account-card">
                    <div className="settings__account-avatar">
                      {(profile.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="settings__account-info">
                      <span className="settings__account-name">{profile.full_name || 'User'}</span>
                      <span className="settings__account-role">{profile.role || 'user'}</span>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={onSignOut}>Sign Out</button>
                  </div>
                </div>
              )}

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ INVOICING ═══ */}
          {activeTab === 'invoicing' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Invoice Settings"
                description="Default values and preferences for creating and managing invoices"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Defaults</h4>
                <div className="form-grid">
                  <SelectField label="Payment Terms" value={settings.defaultPaymentTerms} onChange={v => update('defaultPaymentTerms', v)}
                    options={['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']} />
                  <SelectField label="Currency" value={settings.defaultCurrency} onChange={v => update('defaultCurrency', v)}
                    options={[
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'EUR', label: 'EUR — Euro' },
                      { value: 'GBP', label: 'GBP — British Pound' },
                      { value: 'CAD', label: 'CAD — Canadian Dollar' },
                      { value: 'AUD', label: 'AUD — Australian Dollar' },
                    ]} />
                  <Field label="Default Tax Rate (%)" type="number" value={settings.defaultTaxRate} onChange={v => update('defaultTaxRate', Number(v) || 0)} placeholder="0" />
                  <Field label="Invoice Prefix" value={settings.invoicePrefix} onChange={v => update('invoicePrefix', v)} placeholder="INV" />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Invoice Content</h4>
                <div className="form-grid">
                  <TextareaField label="Default Invoice Notes" value={settings.defaultInvoiceNotes} onChange={v => update('defaultInvoiceNotes', v)}
                    placeholder="Thank you for your business..." full />
                  <TextareaField label="Additional Payment Notes" value={settings.paymentInstructions} onChange={v => update('paymentInstructions', v)}
                    placeholder="Any extra payment context beyond the structured bank details below (e.g. 'Prefer ACH over wire for invoices under $5k')" full
                    hint="Free-form notes shown under the bank details" />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Bank Details for Transfers</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate)', marginBottom: 14, lineHeight: 1.5 }}>
                  Structured bank details for clients paying by wire or ACH. Shown on every invoice's <strong>Bank Transfer</strong> panel and on the downloaded PDF. Leave blank to fall back to a "contact us for details" message.
                  <br /><br />
                  <strong style={{ color: 'var(--warning)' }}>Safety tip:</strong> Turn on an ACH debit block at your bank so these numbers can only receive credits, not be debited.
                </p>
                <div className="form-grid">
                  <Field label="Bank Name" value={settings.bankName} onChange={v => update('bankName', v)} placeholder="e.g. Chase, Mercury, Bluebird" />
                  <Field label="Account Holder Name" value={settings.bankAccountName} onChange={v => update('bankAccountName', v)} placeholder="Clad Forge LLC" />
                  <Field label="ACH Routing Number" value={settings.bankRoutingNumber} onChange={v => update('bankRoutingNumber', v)} placeholder="9 digits" />
                  <Field label="Account Number" value={settings.bankAccountNumber} onChange={v => update('bankAccountNumber', v)} placeholder="Checking account number" />
                  <Field label="Wire Routing Number (if different)" value={settings.bankWireRoutingNumber} onChange={v => update('bankWireRoutingNumber', v)} placeholder="Optional — for wires only" />
                  <Field label="SWIFT / BIC (international wires)" value={settings.bankSwiftCode} onChange={v => update('bankSwiftCode', v)} placeholder="Optional" />
                  <TextareaField label="Verification Callout" value={settings.bankVerificationNote} onChange={v => update('bankVerificationNote', v)}
                    placeholder="Anti-invoice-fraud notice shown with the bank details" full
                    hint="A short warning telling clients to verify by phone before paying. Prevents the common scam where criminals intercept invoices and swap the bank details." />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Email Template</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--slate)', marginBottom: 12 }}>
                  Customize the email sent with invoice links. Use the codes below to auto-fill invoice data.
                </p>
                <div className="form-grid">
                  <HighlightedField label="Email Subject" value={settings.invoiceEmailSubject} onChange={v => update('invoiceEmailSubject', v)} full />
                  <HighlightedTextarea label="Email Body" value={settings.invoiceEmailBody} onChange={v => update('invoiceEmailBody', v)} rows={12} full />
                </div>
                <div className="settings__codes">
                  <h4 className="settings__section-title" style={{ marginTop: 16 }}>Available Codes</h4>
                  <CodeGrid copiedCode={copiedCode} onCopy={copyCode} />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Automation</h4>
                <ToggleField label="Auto-detect overdue invoices" description="Automatically mark invoices as overdue when they pass their due date"
                  value={settings.autoDetectOverdue} onChange={v => update('autoDetectOverdue', v)} />
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ PROPOSALS ═══ */}
          {activeTab === 'proposals' && (
            <div className="settings__panel">
              <SettingsHeader
                title="SOW / Proposal Settings"
                description="Defaults for Statements of Work and project proposals"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Defaults</h4>
                <div className="form-grid">
                  <Field label="SOW Prefix" value={settings.sowPrefix} onChange={v => update('sowPrefix', v)} placeholder="SOW" />
                  <Field label="Payment Schedule" value={settings.defaultPaymentSchedule} onChange={v => update('defaultPaymentSchedule', v)}
                    placeholder="30 / 30 / 40" hint="e.g. 30% signing, 30% midpoint, 40% delivery" />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Default Terms & Conditions</h4>
                <TextareaField label="Contract Terms" value={settings.defaultSowTerms} onChange={v => update('defaultSowTerms', v)} rows={6} full
                  hint="Pre-filled when creating a new SOW. Can be edited per-proposal." />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Footer</h4>
                <TextareaField label="SOW Footer Text" value={settings.sowFooter} onChange={v => update('sowFooter', v)} rows={3} full
                  hint="Appears at the bottom of every SOW document" />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Email Template</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--slate)', marginBottom: 12 }}>
                  Customize the email sent when you share a proposal for signing. Use the codes below to auto-fill proposal data.
                </p>
                <div className="form-grid">
                  <HighlightedField label="Email Subject" value={settings.sowEmailSubject} onChange={v => update('sowEmailSubject', v)} full />
                  <HighlightedTextarea label="Email Body" value={settings.sowEmailBody} onChange={v => update('sowEmailBody', v)} rows={14} full />
                </div>
                <div className="settings__codes">
                  <h4 className="settings__section-title" style={{ marginTop: 16 }}>Available Codes</h4>
                  <CodeGrid copiedCode={copiedCode} onCopy={copyCode} codes={PROPOSAL_TEMPLATE_CODES} />
                </div>
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ TIME TRACKING ═══ */}
          {activeTab === 'time' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Time Tracking"
                description="Configure how time is logged and calculated across projects"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Rates & Hours</h4>
                <div className="form-grid">
                  <Field label="Default Hourly Rate ($)" type="number" value={settings.defaultHourlyRate} onChange={v => update('defaultHourlyRate', Number(v) || 0)}
                    hint="Used for cost estimates and billing calculations" />
                  <Field label="Work Hours per Day" type="number" value={settings.workHoursPerDay} onChange={v => update('workHoursPerDay', Number(v) || 8)}
                    hint="Used for capacity planning" />
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Rounding</h4>
                <SelectField label="Time Rounding" value={settings.timeRounding} onChange={v => update('timeRounding', v)}
                  options={[
                    { value: 'none', label: 'No rounding (exact time)' },
                    { value: '5min', label: 'Nearest 5 minutes' },
                    { value: '15min', label: 'Nearest 15 minutes' },
                    { value: '30min', label: 'Nearest 30 minutes' },
                  ]}
                  hint="Applied when stopping the timer" />
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ PIPELINE ═══ */}
          {activeTab === 'pipeline' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Pipeline Settings"
                description="Configure your project pipeline stages and defaults"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Pipeline Stages</h4>
                <TextareaField label="Stage Names (comma-separated)" value={settings.pipelineStages} onChange={v => update('pipelineStages', v)}
                  hint="Define the columns in your pipeline board. Changes take effect on next page load." rows={2} full />
                <div className="settings__stage-preview">
                  <span className="settings__stage-preview-label">Preview:</span>
                  {settings.pipelineStages.split(',').map((s, i) => (
                    <span key={i} className="settings__stage-chip">{s.trim()}</span>
                  ))}
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Defaults</h4>
                <SelectField label="Default Stage for New Projects" value={settings.defaultStage} onChange={v => update('defaultStage', v)}
                  options={[
                    { value: 'lead', label: 'Lead' },
                    { value: 'proposal', label: 'Proposal' },
                    { value: 'active', label: 'Active' },
                  ]} />
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ CLIENTS ═══ */}
          {activeTab === 'clients' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Client Settings"
                description="Default values for the client tracker"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Industry List</h4>
                <TextareaField label="Available Industries (comma-separated)" value={settings.customIndustries} onChange={v => update('customIndustries', v)}
                  hint="These appear as options when adding or editing clients" rows={3} full />
                <div className="settings__stage-preview">
                  <span className="settings__stage-preview-label">Preview:</span>
                  {settings.customIndustries.split(',').map((s, i) => (
                    <span key={i} className="settings__stage-chip">{s.trim()}</span>
                  ))}
                </div>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Defaults</h4>
                <SelectField label="Default Industry" value={settings.defaultIndustry} onChange={v => update('defaultIndustry', v)}
                  options={settings.customIndustries.split(',').map(s => s.trim()).filter(Boolean)} />
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {activeTab === 'dashboard' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Dashboard"
                description="Show, hide, and reorder the KPI cards on your home dashboard. Cards stretch to fill the row and wrap to a new row if there are too many."
              />
              <div className="settings__section">
                <h4 className="settings__section-title">KPI Cards</h4>
                <DashboardCardPicker
                  value={resolveCardOrder(settings.dashboardKpiCards)}
                  onChange={next => update('dashboardKpiCards', next)}
                />
              </div>
              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ APPEARANCE ═══ */}
          {activeTab === 'appearance' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Appearance"
                description="Customize the look and feel of your Command Center"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Theme</h4>
                <ToggleField
                  label="Light Mode"
                  description="Switch between dark and light theme across the entire application"
                  value={settings.theme === 'light'}
                  onChange={v => {
                    const newTheme = v ? 'light' : 'dark';
                    update('theme', newTheme);
                    document.documentElement.setAttribute('data-theme', newTheme);
                  }}
                />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Brand Accent Color</h4>
                <div className="settings__color-row">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    className="settings__color-picker"
                  />
                  <Field label="" value={settings.accentColor} onChange={v => update('accentColor', v)} placeholder="#ff8c00" />
                  <div className="settings__color-swatches">
                    {['#ff8c00', '#0369a1', '#047857', '#7c3aed', '#be123c', '#1e40af', '#854d0e'].map(color => (
                      <button
                        key={color}
                        className={`settings__color-swatch ${settings.accentColor === color ? 'settings__color-swatch--active' : ''}`}
                        style={{ background: color }}
                        onClick={() => update('accentColor', color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <p className="settings__hint">Affects buttons, links, and accent elements across the app. Requires page reload to take full effect.</p>
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Date Format</h4>
                <SelectField label="Display Format" value={settings.dateFormat} onChange={v => update('dateFormat', v)}
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                  ]} />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Layout</h4>
                <ToggleField label="Collapse sidebar by default" description="Start with the sidebar minimized on each visit"
                  value={settings.sidebarCollapsed} onChange={v => update('sidebarCollapsed', v)} />
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {activeTab === 'notifications' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Notifications & Reminders"
                description="Configure when you receive alerts and reminders"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Invoice Reminders</h4>
                <Field label="Warn before due date (days)" type="number" value={settings.invoiceReminderDays} onChange={v => update('invoiceReminderDays', Number(v) || 0)}
                  hint="Invoices within this many days of their due date will be highlighted" />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Client Follow-Up</h4>
                <Field label="Inactive client alert (days)" type="number" value={settings.clientFollowUpDays} onChange={v => update('clientFollowUpDays', Number(v) || 14)}
                  hint="Flag clients you haven't interacted with in this many days" />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Project Deadlines</h4>
                <Field label="Deadline warning (days before)" type="number" value={settings.projectDeadlineWarningDays} onChange={v => update('projectDeadlineWarningDays', Number(v) || 7)}
                  hint="Show warnings for projects approaching their deadline" />
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ DATA ═══ */}
          {activeTab === 'data' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Data Management"
                description="Export, import, or reset your application data"
              />
              <div className="settings__data-grid">
                <DataCard
                  icon="📥" title="Export Settings" color="var(--brand)"
                  description="Download your settings configuration as a JSON file"
                  buttonLabel="Export Settings" onClick={handleExportSettings}
                />
                <DataCard
                  icon="☁" title="Cloud Storage" color="var(--info)"
                  description="All data is stored in Supabase and accessible from any device"
                  buttonLabel="Connected" onClick={() => {}}
                />
              </div>

              <div className="settings__storage">
                <h4>Data Storage</h4>
                <span className="settings__storage-text">
                  All data is stored in your Supabase database and synced across all devices automatically.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   REUSABLE SETTINGS COMPONENTS
   ═══════════════════════════════════════════ */

function SettingsHeader({ title, description }) {
  return (
    <div className="settings__panel-header">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', hint = '', full = false }) {
  return (
    <div className={`form-group ${full ? 'form-group--full' : ''}`}>
      {label && <label>{label}</label>}
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <span className="settings__hint">{hint}</span>}
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder = '', hint = '', rows = 3, full = false }) {
  return (
    <div className={`form-group ${full ? 'form-group--full' : ''}`}>
      {label && <label>{label}</label>}
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
      {hint && <span className="settings__hint">{hint}</span>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint = '' }) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <select value={value || ''} onChange={e => onChange(e.target.value)}>
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      {hint && <span className="settings__hint">{hint}</span>}
    </div>
  );
}

// Reorder + show/hide picker for dashboard KPI cards.
//
// value is the resolved array from resolveCardOrder() — a stable list of
// { id, enabled } in the user's chosen order. onChange receives the next
// array; the parent persists it via setSettings.
//
// Reorder is HTML5 native drag-and-drop:
//   - Each row is draggable, with a visible ≡ handle on the left as the
//     affordance.
//   - The toggle button stops mousedown propagation so clicking it doesn't
//     start a drag — that way users can hide/show cards without accidentally
//     dragging the row.
//   - dropIndex tracks which row the cursor is over so we can show a top
//     border line as a drop indicator. After drop, dropIndex resets so the
//     line disappears.
function DashboardCardPicker({ value, onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  function move(from, to) {
    if (from === to || from < 0 || to < 0 || from >= value.length || to > value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    // If dropping after the original index, the splice already shifted
    // everything; the target index shouldn't be adjusted further.
    const insertAt = to > from ? to - 1 : to;
    next.splice(insertAt, 0, moved);
    onChange(next);
  }

  function toggle(index) {
    const next = value.map((c, i) => i === index ? { ...c, enabled: !(c.enabled !== false) } : c);
    onChange(next);
  }

  // Save a custom color override for a card. Hex value comes from the
  // native <input type="color"> — always 7 chars (#RRGGBB).
  function setColor(index, hex) {
    const next = value.map((c, i) => i === index ? { ...c, color: hex } : c);
    onChange(next);
  }

  // Drop the override so the card falls back to its registry default.
  // Uses object-rest to omit `color` cleanly rather than setting it to
  // undefined, which would still serialize through JSON. The `_color`
  // name uses an underscore so the eslint allowed-unused-vars regex
  // (^[A-Z_]) ignores it.
  function resetColor(index) {
    const next = value.map((c, i) => {
      if (i !== index) return c;
      const { color: _color, ...rest } = c;
      return rest;
    });
    onChange(next);
  }

  function handleDragStart(e, i) {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox needs setData or the drag won't initiate.
    try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* not all browsers allow it */ }
  }
  function handleDragOver(e, i) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropIndex !== i) setDropIndex(i);
  }
  function handleDrop(e, i) {
    e.preventDefault();
    if (dragIndex !== null) move(dragIndex, i);
    setDragIndex(null);
    setDropIndex(null);
  }
  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  const defById = Object.fromEntries(KPI_CARD_DEFS.map(d => [d.id, d]));

  return (
    <div className="dash-pref-list">
      {value.map((card, i) => {
        const def = defById[card.id];
        const enabled = card.enabled !== false;
        const effectiveColor = colorFor(card);
        const isCustomColor = !!card.color && card.color !== def?.defaultColor;
        const isDragging = dragIndex === i;
        const isDropTarget = dropIndex === i && dragIndex !== null && dragIndex !== i;
        return (
          <div
            key={card.id}
            className={[
              'dash-pref-row',
              !enabled && 'dash-pref-row--off',
              isDragging && 'dash-pref-row--dragging',
              isDropTarget && 'dash-pref-row--drop',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={e => handleDragStart(e, i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={e => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            <span className="dash-pref-row__handle" aria-hidden="true">≡</span>
            {/* Color swatch doubles as a label-for the hidden native picker.
                onMouseDown stops the row's drag from initiating when the
                user just wants to open the color dialog. */}
            <label
              className="dash-pref-row__swatch"
              style={{ background: effectiveColor }}
              onMouseDown={e => e.stopPropagation()}
              title={`Card color: ${effectiveColor}${isCustomColor ? ' (custom)' : ' (default)'}`}
            >
              <input
                type="color"
                value={effectiveColor}
                onChange={e => setColor(i, e.target.value)}
              />
            </label>
            <span className="dash-pref-row__label">{def?.label || card.id}</span>
            <span className="dash-pref-row__hex" title="Hex value">{effectiveColor}</span>
            {isCustomColor && (
              <button
                type="button"
                className="dash-pref-row__reset"
                onClick={() => resetColor(i)}
                onMouseDown={e => e.stopPropagation()}
                title="Reset to default color"
              >
                Reset
              </button>
            )}
            <button
              className={`settings__toggle ${enabled ? 'settings__toggle--on' : ''}`}
              onClick={() => toggle(i)}
              onMouseDown={e => e.stopPropagation()}
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? 'Hide' : 'Show'} ${def?.label}`}
            >
              <span className="settings__toggle-thumb" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ToggleField({ label, description, value, onChange }) {
  return (
    <div className="settings__toggle-row">
      <div className="settings__toggle-info">
        <span className="settings__toggle-label">{label}</span>
        {description && <span className="settings__toggle-desc">{description}</span>}
      </div>
      <button
        className={`settings__toggle ${value ? 'settings__toggle--on' : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
      >
        <span className="settings__toggle-thumb" />
      </button>
    </div>
  );
}

function SaveBar({ saved, onSave }) {
  return (
    <div className="settings__save-bar">
      <span className={`settings__save-indicator ${saved ? 'settings__save-indicator--visible' : ''}`}>
        ✓ Changes saved
      </span>
      <button className="btn btn--primary" onClick={onSave}>
        {saved ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  );
}

function renderHighlighted(text) {
  const parts = [];
  const regex = /\{\{[^}]+\}\}/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(text || '')) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(<mark key={i++} className="code-highlight">{match[0]}</mark>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < (text || '').length) parts.push(text.substring(lastIndex));
  // Add trailing space so last line shows cursor space
  parts.push(' ');
  return parts;
}

function HighlightedTextarea({ label, value, onChange, rows = 12, full }) {
  function handleScroll(e) {
    const backdrop = e.target.previousSibling;
    if (backdrop) {
      backdrop.scrollTop = e.target.scrollTop;
      backdrop.scrollLeft = e.target.scrollLeft;
    }
  }
  return (
    <div className={`form-group ${full ? 'form-group--full' : ''}`}>
      {label && <label>{label}</label>}
      <div className="ht-wrap">
        <div className="ht-backdrop"><div className="ht-highlights">{renderHighlighted(value || '')}</div></div>
        <textarea className="ht-input" value={value || ''} onChange={e => onChange(e.target.value)} onScroll={handleScroll} rows={rows} spellCheck={false} />
      </div>
    </div>
  );
}

function HighlightedField({ label, value, onChange, full }) {
  function handleScroll(e) {
    const backdrop = e.target.previousSibling;
    if (backdrop) backdrop.scrollLeft = e.target.scrollLeft;
  }
  return (
    <div className={`form-group ${full ? 'form-group--full' : ''}`}>
      {label && <label>{label}</label>}
      <div className="ht-wrap ht-wrap--single">
        <div className="ht-backdrop"><div className="ht-highlights ht-highlights--single">{renderHighlighted(value || '')}</div></div>
        <input type="text" className="ht-input ht-input--single" value={value || ''} onChange={e => onChange(e.target.value)} onScroll={handleScroll} spellCheck={false} />
      </div>
    </div>
  );
}

const INVOICE_TEMPLATE_CODES = [
  ['{{name}}', 'First name of contact person'],
  ['{{full_name}}', 'Full name of contact person'],
  ['{{recipient_email}}', "Contact person's email"],
  ['{{invoice_number}}', 'Invoice number'],
  ['{{invoice_link}}', 'Public link to view invoice'],
  ['{{project_title}}', 'Linked project name'],
  ['{{total_due}}', 'Total amount due'],
  ['{{due_date}}', 'Payment due date'],
  ['{{payment_terms}}', 'Payment terms'],
  ['{{issue_date}}', 'Date invoice was issued'],
  ['{{client_company}}', "Client's company name"],
  ['{{company_name}}', 'Your company name'],
  ['{{company_email}}', 'Your company email'],
  ['{{company_phone}}', 'Your company phone'],
  ['{{owner_name}}', 'Your name'],
  ['{{br}}', 'Line break (new line)'],
];

const PROPOSAL_TEMPLATE_CODES = [
  ['{{name}}', 'First name of contact person'],
  ['{{full_name}}', 'Full name of contact person'],
  ['{{recipient_email}}', "Contact person's email"],
  ['{{proposal_number}}', 'Proposal / SOW number'],
  ['{{proposal_link}}', 'Public signing link'],
  ['{{project_title}}', 'Project name'],
  ['{{total_amount}}', 'Total proposal value'],
  ['{{valid_until}}', 'Expiration date'],
  ['{{issue_date}}', 'Proposal creation date'],
  ['{{client_company}}', "Client's company name"],
  ['{{packages_list}}', 'Bulleted list of packages + prices'],
  ['{{company_name}}', 'Your company name'],
  ['{{company_email}}', 'Your company email'],
  ['{{company_phone}}', 'Your company phone'],
  ['{{owner_name}}', 'Your name'],
  ['{{br}}', 'Line break (new line)'],
];

function CodeGrid({ copiedCode, onCopy, codes = INVOICE_TEMPLATE_CODES }) {
  return (
    <div className="settings__codes-grid">
      {codes.map(([code, desc]) => (
        <div key={code} className={`settings__code ${copiedCode === code ? 'settings__code--copied' : ''}`}>
          <code>{code}</code>
          <span>{copiedCode === code ? '✓ Copied' : desc}</span>
          <button className="settings__code-copy" onClick={() => onCopy(code)}>
            {copiedCode === code ? '✓' : 'Copy'}
          </button>
        </div>
      ))}
    </div>
  );
}

function DataCard({ icon, title, description, color, buttonLabel, onClick, isUpload, onUpload, danger }) {
  return (
    <div className={`settings__data-card ${danger ? 'settings__data-card--danger' : ''}`}>
      <span className="settings__data-icon" style={{ color }}>{icon}</span>
      <h4>{title}</h4>
      <p>{description}</p>
      {isUpload ? (
        <label className="btn btn--secondary btn--sm settings__upload-btn">
          {buttonLabel}
          <input type="file" accept=".json" onChange={onUpload} style={{ display: 'none' }} />
        </label>
      ) : (
        <button className={`btn ${danger ? 'btn--danger' : 'btn--secondary'} btn--sm`} onClick={onClick}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
