import { useState } from 'react';
import { generateId } from '../data/initialData';

const STATUS_OPTIONS = ['active', 'prospect', 'on-hold', 'inactive'];
const INDUSTRY_OPTIONS = [
  'Construction', 'Energy & Utilities', 'Manufacturing', 'Logistics',
  'Oil & Gas', 'Engineering Services', 'Telecommunications', 'Other',
];

const emptyClient = {
  name: '', company: '', email: '', phone: '',
  industry: 'Construction', status: 'prospect', notes: '', value: 0,
};

export default function Clients({ clients, setClients }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [viewClient, setViewClient] = useState(null);

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  function openAdd() {
    setEditingClient(null);
    setForm(emptyClient);
    setShowModal(true);
  }

  function openEdit(client) {
    setEditingClient(client);
    setForm({ ...client });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.company.trim()) return;

    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...form, id: c.id } : c));
    } else {
      setClients(prev => [...prev, { ...form, id: generateId(), createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    setClients(prev => prev.filter(c => c.id !== id));
    setViewClient(null);
  }

  return (
    <div className="clients">
      {/* Toolbar */}
      <div className="clients__toolbar">
        <div className="clients__search-wrapper">
          <svg className="clients__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="clients__search"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="clients__filters">
          {['all', ...STATUS_OPTIONS].map(status => (
            <button
              key={status}
              className={`clients__filter-btn ${filterStatus === status ? 'clients__filter-btn--active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Client
        </button>
      </div>

      {/* Client Grid */}
      <div className="clients__grid">
        {filtered.map((client, i) => (
          <div
            key={client.id}
            className="client-card"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => setViewClient(client)}
          >
            <div className="client-card__header">
              <div className="client-card__avatar">
                {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="client-card__info">
                <h3 className="client-card__name">{client.name}</h3>
                <p className="client-card__company">{client.company}</p>
              </div>
              <span className={`status-badge status-badge--${client.status}`}>
                {client.status.replace('-', ' ')}
              </span>
            </div>
            <div className="client-card__details">
              <div className="client-card__detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <span>{client.email}</span>
              </div>
              <div className="client-card__detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                <span>{client.phone}</span>
              </div>
              <div className="client-card__detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                <span>{client.industry}</span>
              </div>
            </div>
            {client.value > 0 && (
              <div className="client-card__value">
                <span className="client-card__value-label">Value</span>
                <span className="client-card__value-amount">${client.value.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="clients__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ width: 64, height: 64, opacity: 0.3 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No clients found</p>
          </div>
        )}
      </div>

      {/* View Client Detail Modal */}
      {viewClient && (
        <div className="modal-overlay" onClick={() => setViewClient(null)}>
          <div className="modal modal--detail" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{viewClient.name}</h2>
              <button className="modal__close" onClick={() => setViewClient(null)}>&times;</button>
            </div>
            <div className="modal__body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Company</label>
                  <span>{viewClient.company}</span>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <span>{viewClient.email}</span>
                </div>
                <div className="detail-item">
                  <label>Phone</label>
                  <span>{viewClient.phone}</span>
                </div>
                <div className="detail-item">
                  <label>Industry</label>
                  <span>{viewClient.industry}</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span className={`status-badge status-badge--${viewClient.status}`}>
                    {viewClient.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Client Value</label>
                  <span className="detail-value">${viewClient.value.toLocaleString()}</span>
                </div>
                <div className="detail-item detail-item--full">
                  <label>Notes</label>
                  <span>{viewClient.notes || 'No notes'}</span>
                </div>
                <div className="detail-item">
                  <label>Added</label>
                  <span>{viewClient.createdAt}</span>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--danger" onClick={() => handleDelete(viewClient.id)}>Delete</button>
              <button className="btn btn--secondary" onClick={() => { setViewClient(null); openEdit(viewClient); }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@acme.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 555-0123"
                  />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <select
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  >
                    {INDUSTRY_OPTIONS.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client Value ($)</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="form-group form-group--full">
                  <label>Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes about this client..."
                  />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>
                {editingClient ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
