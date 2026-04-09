import { useState } from 'react';
import { initialSettings } from '../data/initialData';

const TABS = [
  { id: 'company', label: 'Company', icon: '🏢' },
  { id: 'invoicing', label: 'Invoicing', icon: '📄' },
  { id: 'proposals', label: 'Proposals', icon: '📋' },
  { id: 'time', label: 'Time Tracking', icon: '⏱' },
  { id: 'pipeline', label: 'Pipeline', icon: '📊' },
  { id: 'clients', label: 'Clients', icon: '👥' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'data', label: 'Data', icon: '💾' },
];

export default function Settings({ settings: rawSettings, setSettings, profile, onSignOut }) {
  // Merge with defaults so newly-added fields always exist
  const settings = { ...initialSettings, ...rawSettings };

  const [activeTab, setActiveTab] = useState('company');
  const [saved, setSaved] = useState(false);

  function update(field, value) {
    setSettings(prev => ({ ...initialSettings, ...prev, [field]: value }));
  }

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExportAll() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try { allData[key] = JSON.parse(localStorage.getItem(key)); }
      catch { allData[key] = localStorage.getItem(key); }
    }
    downloadJSON(allData, `clad-forge-backup-${new Date().toISOString().split('T')[0]}.json`);
  }

  function handleExportSettings() {
    downloadJSON({ settings, exportedAt: new Date().toISOString() }, `clad-forge-settings-${new Date().toISOString().split('T')[0]}.json`);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        window.location.reload();
      } catch (err) {
        console.error('Import failed:', err);
      }
    };
    reader.readAsText(file);
  }

  function handleClearData() {
    if (window.confirm('Are you sure? This will delete ALL application data including clients, projects, invoices, and settings. This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
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
                  <TextareaField label="Payment Instructions" value={settings.paymentInstructions} onChange={v => update('paymentInstructions', v)}
                    placeholder="Bank transfer details, PayPal, Stripe link, etc." full
                    hint="Included at the bottom of every invoice and email" />
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

          {/* ═══ APPEARANCE ═══ */}
          {activeTab === 'appearance' && (
            <div className="settings__panel">
              <SettingsHeader
                title="Appearance"
                description="Customize the look and feel of your Command Center"
              />
              <div className="settings__section">
                <h4 className="settings__section-title">Brand Accent Color</h4>
                <div className="settings__color-row">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    className="settings__color-picker"
                  />
                  <Field label="" value={settings.accentColor} onChange={v => update('accentColor', v)} placeholder="#b45309" />
                  <div className="settings__color-swatches">
                    {['#b45309', '#0369a1', '#047857', '#7c3aed', '#be123c', '#1e40af', '#854d0e'].map(color => (
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
                  icon="📦" title="Full Backup" color="var(--info)"
                  description="Export everything — clients, projects, invoices, time entries, and settings"
                  buttonLabel="Export All Data" onClick={handleExportAll}
                />
                <DataCard
                  icon="📤" title="Import Data" color="var(--success)"
                  description="Restore from a previously exported JSON backup file"
                  buttonLabel="Import" isUpload onUpload={handleImport}
                />
                <DataCard
                  icon="🗑" title="Reset All Data" color="var(--danger)" danger
                  description="Permanently delete all data and restore to defaults. Cannot be undone."
                  buttonLabel="Clear All Data" onClick={handleClearData}
                />
              </div>

              <div className="settings__storage">
                <h4>Local Storage Usage</h4>
                <div className="settings__storage-bar">
                  <div className="settings__storage-fill" style={{ width: `${Math.min((JSON.stringify(localStorage).length / 5242880) * 100, 100)}%` }} />
                </div>
                <span className="settings__storage-text">
                  {(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB used of ~5 MB available
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
