import { useRef, useState } from 'react';
import { initialSettings } from '../data/initialData';
import { KPI_CARD_DEFS, resolveCardOrder, colorFor, MAX_VISIBLE_KPI_CARDS, resolveDashboardPreferences } from '../lib/dashboardCards';

const TABS = [
  { id: 'company', label: 'Company', icon: '🏢' },
  { id: 'invoicing', label: 'Invoicing', icon: '📄' },
  { id: 'proposals', label: 'Proposals', icon: '📋' },
  { id: 'time', label: 'Time Tracking', icon: '⏱' },
  { id: 'pipeline', label: 'Pipeline', icon: '📊' },
  { id: 'clients', label: 'Clients', icon: '👥' },
  { id: 'dashboard', label: 'Dashboard', icon: '🎛' },
  { id: 'calendars', label: 'Calendars', icon: '📅' },
  { id: 'activity', label: 'Activity', icon: '🕒' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'data', label: 'Data', icon: '💾' },
];

export default function Settings({ settings: rawSettings, setSettings, profile, onSignOut, activities = [] }) {
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
          {activeTab === 'dashboard' && (() => {
            const prefs = resolveDashboardPreferences(settings.dashboardPreferences);
            // updatePref / updateSection helpers shave the boilerplate of
            // "merge into the existing prefs object" off each input handler.
            const updatePref = (key, value) =>
              update('dashboardPreferences', { ...prefs, [key]: value });
            const updateSection = (key, value) =>
              update('dashboardPreferences', {
                ...prefs,
                sections: { ...prefs.sections, [key]: value },
              });
            return (
            <div className="settings__panel">
              <SettingsHeader
                title="Dashboard"
                description={`Customize what shows on your home dashboard. Pick up to ${MAX_VISIBLE_KPI_CARDS} KPI cards, toggle sections on and off, and tune the metric horizons.`}
              />

              <div className="settings__section">
                <h4 className="settings__section-title">KPI Cards</h4>
                <DashboardCardPicker
                  value={resolveCardOrder(settings.dashboardKpiCards)}
                  onChange={next => update('dashboardKpiCards', next)}
                />
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Sections</h4>
                <p className="settings__section-hint">
                  Hide sections you don&apos;t need. When both halves of a row are hidden the row collapses entirely; when only one half is hidden the other stretches to full width.
                </p>
                <ToggleField
                  label="Welcome banner"
                  description="The greeting and shortcut buttons at the very top."
                  value={prefs.sections.welcomeBanner}
                  onChange={v => updateSection('welcomeBanner', v)}
                />
                <ToggleField
                  label="Monthly Revenue chart"
                  description="Bar chart of paid invoice revenue over the trailing window."
                  value={prefs.sections.monthlyRevenue}
                  onChange={v => updateSection('monthlyRevenue', v)}
                />
                <ToggleField
                  label="Overdue Invoices list"
                  description="Worklist of overdue invoices with days late."
                  value={prefs.sections.overdueInvoices}
                  onChange={v => updateSection('overdueInvoices', v)}
                />
                <ToggleField
                  label="Pipeline Value chart"
                  description="Project budget broken down by pipeline stage."
                  value={prefs.sections.pipelineValue}
                  onChange={v => updateSection('pipelineValue', v)}
                />
                <ToggleField
                  label="Action Items list"
                  description="Things waiting on you: open markup pins, urgent tickets, stale proposals."
                  value={prefs.sections.actionItems}
                  onChange={v => updateSection('actionItems', v)}
                />
                <ToggleField
                  label="Application Health table"
                  description="Per-app status, MRR contribution, and open ticket count."
                  value={prefs.sections.appHealth}
                  onChange={v => updateSection('appHealth', v)}
                />
                <ToggleField
                  label="Upcoming Deadlines list"
                  description="Projects with deadlines coming up, sorted by soonest first."
                  value={prefs.sections.upcomingDeadlines}
                  onChange={v => updateSection('upcomingDeadlines', v)}
                />
                {/* Recent Activity moved out of the dashboard and into its
                    own Settings tab — toggle is no longer relevant. */}
              </div>

              <div className="settings__section">
                <h4 className="settings__section-title">Time Horizons</h4>
                <p className="settings__section-hint">
                  Tune the time windows used by the dashboard&apos;s charts and lists. Adjust to match how you think about your business cadence.
                </p>
                <div className="form-grid">
                  <SelectField
                    label="Revenue chart range"
                    value={String(prefs.chartMonths)}
                    onChange={v => updatePref('chartMonths', Number(v))}
                    options={[
                      { value: '3',  label: 'Last 3 months' },
                      { value: '6',  label: 'Last 6 months' },
                      { value: '12', label: 'Last 12 months' },
                    ]}
                    hint="How far back the Monthly Revenue bar chart looks."
                  />
                  <SelectField
                    label="Due Soon horizon"
                    value={String(prefs.dueSoonDays)}
                    onChange={v => updatePref('dueSoonDays', Number(v))}
                    options={[
                      { value: '7',  label: '7 days' },
                      { value: '14', label: '14 days' },
                      { value: '21', label: '21 days' },
                      { value: '30', label: '30 days' },
                    ]}
                    hint="Window used by the Projects Due Soon KPI card."
                  />
                  <SelectField
                    label="Stale proposal threshold"
                    value={String(prefs.staleProposalDays)}
                    onChange={v => updatePref('staleProposalDays', Number(v))}
                    options={[
                      { value: '1', label: '1 day' },
                      { value: '3', label: '3 days' },
                      { value: '5', label: '5 days' },
                      { value: '7', label: '7 days' },
                    ]}
                    hint="A proposal must be sent for at least this long to surface in Action Items."
                  />
                </div>
              </div>

              <SaveBar saved={saved} onSave={showSaved} />
            </div>
            );
          })()}

          {/* ═══ CALENDARS ═══
               Manage external iCal/ICS feed URLs (Google Calendar, Outlook,
               Apple iCloud, etc.). Stored in settings.externalCalendars
               and pulled in by the Calendar page on mount. CORS often
               blocks browser fetches; calendarFeeds.js falls back to a
               public proxy as a best-effort retry. */}
          {activeTab === 'calendars' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Calendars"
                description="Link iCal feeds from Google Calendar, Microsoft Outlook, Apple iCloud, or any other source so their events appear on your Calendar page alongside Clad Forge events."
              />
              <CalendarFeedsManager
                value={settings.externalCalendars || []}
                onChange={next => update('externalCalendars', next)}
              />
              <SaveBar saved={saved} onSave={showSaved} />
            </div>
          )}

          {/* ═══ ACTIVITY ═══
               Full-length audit trail of changes across the system. Used
               to live as a card on the dashboard but now has its own tab
               so the dashboard can stay focused on action-oriented data.
               Activity entries are auto-logged by makeSetter() in
               useSupabaseData.js — see the Props-Down Pattern docs. */}
          {activeTab === 'activity' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Activity"
                description="Recent changes across the system. Every client added, project updated, invoice paid, ticket comment posted, etc., shows up here in reverse-chronological order."
              />
              <div className="settings__section">
                <h4 className="settings__section-title">
                  Recent Activity {activities.length > 0 && <span style={{ color: 'var(--slate-light)', fontWeight: 400, marginLeft: 8 }}>· {activities.length} entries</span>}
                </h4>
                <div className="settings-activity">
                  {activities.length === 0 ? (
                    <div className="dash__chart-empty">No activity yet — make some changes and watch this fill up.</div>
                  ) : (
                    activities.map((act, i) => (
                      <div key={act.id || i} className="settings-activity__row">
                        <span className={`dash__act-dot dash__act-dot--${act.type}`} />
                        <div className="settings-activity__content">
                          <span className="settings-activity__msg">{act.message}</span>
                          <span className="settings-activity__time">
                            {act.time || (act.createdAt ? new Date(act.createdAt).toLocaleString() : '')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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

  // Refuse to enable a card when the visible-count cap is already met. The
  // row UI also marks unreachable toggles as disabled so users see why
  // nothing happens, but this guard is defensive in case anything else
  // calls toggle (e.g. keyboard or tests).
  function toggle(index) {
    const target = value[index];
    const wasEnabled = target?.enabled !== false;
    if (!wasEnabled) {
      const enabledCount = value.filter(c => c.enabled !== false).length;
      if (enabledCount >= MAX_VISIBLE_KPI_CARDS) return;
    }
    const next = value.map((c, i) => i === index ? { ...c, enabled: !wasEnabled } : c);
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

  const enabledCount = value.filter(c => c.enabled !== false).length;
  const disabledCount = value.length - enabledCount;
  const atMax = enabledCount >= MAX_VISIBLE_KPI_CARDS;

  // Default to a focused view: only show cards the user has enabled. The
  // unselected pool is hidden behind a toggle to avoid the long scroll
  // through 14 options when most users only want a handful enabled.
  const [showDisabled, setShowDisabled] = useState(false);
  // Reordering is index-based against the full `value` array, so we keep
  // that map intact. The renderer just filters which rows are *shown*.
  const visibleRows = showDisabled
    ? value
    : value.filter(c => c.enabled !== false);

  return (
    <div className="dash-pref-list">
      <p className="dash-pref-list__counter">
        <strong>{enabledCount}</strong> of {MAX_VISIBLE_KPI_CARDS} shown
        {atMax && ' — turn one off to enable another'}
      </p>
      {visibleRows.map(card => {
        const enabled = card.enabled !== false;
        // i is the position in the full value array — matters for drag
        // semantics and the toggle/color/reset actions.
        const i = value.indexOf(card);
        return (
          <DashboardCardRow
            key={card.id}
            card={card}
            index={i}
            // Lock toggles that are off when the cap is already met. Toggles
            // that are on stay enabled (so users can always turn one off).
            toggleLocked={!enabled && atMax}
            dragIndex={dragIndex}
            dropIndex={dropIndex}
            onToggle={() => toggle(i)}
            onSetColor={hex => setColor(i, hex)}
            onResetColor={() => resetColor(i)}
            onDragStart={e => handleDragStart(e, i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={e => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          />
        );
      })}
      {disabledCount > 0 && (
        <button
          type="button"
          className="dash-pref-list__expand"
          onClick={() => setShowDisabled(s => !s)}
        >
          {showDisabled
            ? 'Hide unselected cards'
            : `+ Show ${disabledCount} more card option${disabledCount === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}

// One row inside DashboardCardPicker. Owns the local hex-input text state
// so the user can type freely without the parent committing intermediate,
// invalid values to settings. The committed color only updates when the
// typed text parses to a valid hex (#RGB or #RRGGBB, with or without the
// leading #). Invalid input shows a red border and reverts on blur.
function DashboardCardRow({
  card, index, dragIndex, dropIndex, toggleLocked = false,
  onToggle, onSetColor, onResetColor,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const def = KPI_CARD_DEFS.find(d => d.id === card.id);
  const enabled = card.enabled !== false;
  const effectiveColor = colorFor(card);
  const isCustomColor = !!card.color && card.color !== def?.defaultColor;
  const isDragging = dragIndex === index;
  const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;

  // Local input state: tracks what the user has typed. We snapshot the
  // committed color in `lastCommitted` so we can detect when it changes
  // externally (e.g. a Reset elsewhere) and snap the visible text back.
  // This is React's recommended "adjusting state during rendering"
  // pattern — cheaper than a useEffect, and avoids the cascading-render
  // warning the compiler flags.
  const [text, setText] = useState(effectiveColor);
  const [lastCommitted, setLastCommitted] = useState(effectiveColor);
  const [invalid, setInvalid] = useState(false);
  if (lastCommitted !== effectiveColor) {
    setLastCommitted(effectiveColor);
    setText(effectiveColor);
    setInvalid(false);
  }

  function handleChange(e) {
    const raw = e.target.value;
    setText(raw);
    const hex = normalizeHex(raw);
    if (hex) {
      onSetColor(hex);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  }
  function handleBlur() {
    // On blur, snap back to the committed color so we don't leave the
    // input showing a half-typed invalid value.
    setText(effectiveColor);
    setInvalid(false);
  }

  // Only the ≡ handle initiates a drag now. The row itself isn't draggable
  // — that lets users click into the hex input or the toggle without
  // accidentally starting a drag. We still set the row as the drag image
  // (via setDragImage) so the visual ghost feels right when reordering.
  const rowRef = useRef(null);
  function handleHandleDragStart(e) {
    if (rowRef.current) {
      // Offset roughly to where the handle is so the ghost doesn't jump.
      e.dataTransfer.setDragImage(rowRef.current, 24, 18);
    }
    onDragStart(e);
  }

  return (
    <div
      ref={rowRef}
      className={[
        'dash-pref-row',
        !enabled && 'dash-pref-row--off',
        isDragging && 'dash-pref-row--dragging',
        isDropTarget && 'dash-pref-row--drop',
      ].filter(Boolean).join(' ')}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span
        className="dash-pref-row__handle"
        draggable
        onDragStart={handleHandleDragStart}
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        ≡
      </span>
      {/* Static visual swatch — purely a preview of the current color. */}
      <span
        className="dash-pref-row__swatch"
        style={{ background: effectiveColor }}
        title={`Current: ${effectiveColor}${isCustomColor ? ' (custom)' : ' (default)'}`}
      />
      <span className="dash-pref-row__label">{def?.label || card.id}</span>
      <input
        type="text"
        className={`dash-pref-row__hex-input ${invalid ? 'dash-pref-row__hex-input--invalid' : ''}`}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        spellCheck={false}
        aria-label={`Hex color for ${def?.label}`}
        placeholder="#rrggbb"
        maxLength={7}
      />
      {isCustomColor && (
        <button
          type="button"
          className="dash-pref-row__reset"
          onClick={onResetColor}
          title="Reset to default color"
        >
          Reset
        </button>
      )}
      <button
        className={`settings__toggle ${enabled ? 'settings__toggle--on' : ''} ${toggleLocked ? 'settings__toggle--locked' : ''}`}
        onClick={onToggle}
        disabled={toggleLocked}
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? 'Hide' : 'Show'} ${def?.label}`}
        title={toggleLocked ? 'Maximum cards already shown — turn one off first' : undefined}
      >
        <span className="settings__toggle-thumb" />
      </button>
    </div>
  );
}

// Accept #RRGGBB, RRGGBB, #RGB, or RGB; case-insensitive. Returns the
// normalized #rrggbb form, or null if the input doesn't parse.
function normalizeHex(input) {
  const s = (input || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    const [r, g, b] = s;
    return '#' + (r + r + g + g + b + b).toLowerCase();
  }
  return null;
}

// External calendar feeds manager. Each row = one iCal feed config:
// name, URL, color picker, enable toggle, remove button. The "Add feed"
// affordance at the bottom appends a new row.
//
// Doesn't sync feeds itself — that happens on the Calendar page when
// settings.externalCalendars changes. Sync status (success / CORS error
// / count of events) shows in the Calendar's right sidebar.
function CalendarFeedsManager({ value, onChange }) {
  function update(idx, patch) {
    onChange(value.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }
  function remove(idx) {
    if (!window.confirm('Remove this calendar feed? Its events will disappear from the Calendar page.')) return;
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...value,
      {
        id: 'cal-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: '',
        url: '',
        color: '#3b82f6',
        enabled: true,
      },
    ]);
  }

  return (
    <div className="settings__section">
      <h4 className="settings__section-title">Linked Feeds</h4>
      <p className="settings__section-hint">
        Paste an iCal/ICS URL from your calendar provider. In Google Calendar
        find <em>Settings &rarr; [calendar] &rarr; Integrate calendar &rarr; Secret address in iCal format</em>.
        In Microsoft Outlook: <em>Calendar settings &rarr; Shared calendars &rarr; Publish &rarr; ICS link</em>.
        Most providers block direct browser fetches with CORS — the app
        will automatically retry through a public proxy. For production
        we'd recommend hosting your own proxy or a Supabase edge function.
      </p>

      {value.length === 0 ? (
        <div className="cal-feeds__empty">
          No calendars linked yet. Click <strong>Add feed</strong> below to connect one.
        </div>
      ) : (
        <div className="cal-feeds__list">
          {value.map((feed, i) => (
            <div key={feed.id || i} className="cal-feeds__row">
              <div className="cal-feeds__top">
                <input
                  type="text"
                  className="cal-feeds__name"
                  value={feed.name || ''}
                  onChange={e => update(i, { name: e.target.value })}
                  placeholder="Calendar name (e.g. Work, Personal)"
                />
                <label
                  className="cal-feeds__swatch"
                  style={{ background: feed.color || '#3b82f6' }}
                  title="Pick a color for this feed"
                >
                  <input
                    type="color"
                    value={feed.color || '#3b82f6'}
                    onChange={e => update(i, { color: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className={`settings__toggle ${feed.enabled !== false ? 'settings__toggle--on' : ''}`}
                  onClick={() => update(i, { enabled: !(feed.enabled !== false) })}
                  role="switch"
                  aria-checked={feed.enabled !== false}
                  title={feed.enabled !== false ? 'Enabled — click to hide' : 'Disabled — click to show'}
                >
                  <span className="settings__toggle-thumb" />
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm btn--danger-hover"
                  onClick={() => remove(i)}
                  title="Remove this feed"
                >
                  Remove
                </button>
              </div>
              <input
                type="url"
                className="cal-feeds__url"
                value={feed.url || ''}
                onChange={e => update(i, { url: e.target.value })}
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn--ghost" onClick={add} style={{ marginTop: 12 }}>
        + Add feed
      </button>
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
