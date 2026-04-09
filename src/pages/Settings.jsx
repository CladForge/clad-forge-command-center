import { useState } from 'react';

export default function Settings({ settings, setSettings }) {
  const [activeTab, setActiveTab] = useState('company');
  const [saved, setSaved] = useState(false);

  function handleChange(field, value) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    const data = JSON.stringify({
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clad-forge-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportAll() {
    try {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          allData[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          allData[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clad-forge-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
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
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  const tabs = [
    { id: 'company', label: 'Company Profile' },
    { id: 'sow', label: 'SOW Defaults' },
    { id: 'data', label: 'Data Management' },
  ];

  return (
    <div className="settings">
      {/* Tabs */}
      <div className="settings__tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`settings__tab ${activeTab === tab.id ? 'settings__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="settings__content">
        {activeTab === 'company' && (
          <div className="settings__panel">
            <div className="settings__panel-header">
              <h3>Company Profile</h3>
              <p>Your company information used across the application</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Owner / Primary Contact</label>
                <input
                  type="text"
                  value={settings.ownerName}
                  onChange={e => handleChange('ownerName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={settings.ownerTitle}
                  onChange={e => handleChange('ownerTitle', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={settings.companyEmail}
                  onChange={e => handleChange('companyEmail', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={settings.companyPhone}
                  onChange={e => handleChange('companyPhone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={settings.companyAddress}
                  onChange={e => handleChange('companyAddress', e.target.value)}
                />
              </div>
            </div>
            <div className="settings__save-row">
              <button className="btn btn--primary" onClick={handleSave}>
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'sow' && (
          <div className="settings__panel">
            <div className="settings__panel-header">
              <h3>SOW Defaults</h3>
              <p>Default values used when generating new Statements of Work</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Default Payment Terms</label>
                <select
                  value={settings.defaultPaymentTerms}
                  onChange={e => handleChange('defaultPaymentTerms', e.target.value)}
                >
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                  <option>Due on Receipt</option>
                </select>
              </div>
              <div className="form-group">
                <label>Default Currency</label>
                <select
                  value={settings.defaultCurrency}
                  onChange={e => handleChange('defaultCurrency', e.target.value)}
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                </select>
              </div>
              <div className="form-group form-group--full">
                <label>SOW Footer Text</label>
                <textarea
                  value={settings.sowFooter}
                  onChange={e => handleChange('sowFooter', e.target.value)}
                  rows={4}
                  placeholder="Standard footer text for all SOWs..."
                />
              </div>
            </div>
            <div className="settings__save-row">
              <button className="btn btn--primary" onClick={handleSave}>
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="settings__panel">
            <div className="settings__panel-header">
              <h3>Data Management</h3>
              <p>Export, import, or reset your application data</p>
            </div>

            <div className="settings__data-actions">
              <div className="settings__data-card">
                <div className="settings__data-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <h4>Export Settings</h4>
                <p>Download your settings as a JSON file</p>
                <button className="btn btn--secondary" onClick={handleExport}>
                  Export Settings
                </button>
              </div>

              <div className="settings__data-card">
                <div className="settings__data-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h4>Export All Data</h4>
                <p>Full backup of clients, projects, SOWs, and settings</p>
                <button className="btn btn--secondary" onClick={handleExportAll}>
                  Export All
                </button>
              </div>

              <div className="settings__data-card">
                <div className="settings__data-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h4>Import Data</h4>
                <p>Restore from a previously exported JSON backup</p>
                <label className="btn btn--secondary settings__import-btn">
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div className="settings__data-card settings__data-card--danger">
                <div className="settings__data-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <h4>Reset All Data</h4>
                <p>Clear all data and restore defaults. This cannot be undone.</p>
                <button className="btn btn--danger" onClick={handleClearData}>
                  Clear All Data
                </button>
              </div>
            </div>

            <div className="settings__storage-info">
              <h4>Storage Usage</h4>
              <div className="settings__storage-bar">
                <div className="settings__storage-fill" style={{ width: '12%' }} />
              </div>
              <span className="settings__storage-text">
                Using approximately {(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB of local storage
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
