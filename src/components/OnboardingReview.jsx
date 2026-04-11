import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from '../data/initialData';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OnboardingReview({ setClients, addNotification }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      const { data, error } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.warn('Could not load onboarding submissions:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function convertToClient(sub) {
    const newClient = {
      id: generateId(),
      name: sub.primary_contact_name,
      company: sub.company_name,
      email: sub.primary_contact_email,
      phone: sub.primary_contact_phone || '',
      industry: sub.industry || '',
      status: 'prospect',
      notes: `Onboarded via form. ${sub.project_description || ''}`.trim(),
      value: 0,
      website: sub.company_website || '',
      companySize: sub.company_size || '',
      brandColors: sub.brand_colors || [],
      brandFonts: sub.brand_fonts || {},
      brandTone: sub.brand_tone || '',
      brandLogoUrl: sub.brand_logo_url || '',
      createdAt: new Date().toISOString(),
    };

    // Add to clients
    setClients(prev => [newClient, ...prev]);

    // Update submission status
    await supabase
      .from('onboarding_submissions')
      .update({ status: 'converted', converted_client_id: newClient.id })
      .eq('id', sub.id);

    if (addNotification) {
      addNotification(`New client converted from onboarding: ${sub.company_name}`, 'success', 'client', newClient.id);
    }

    // Refresh
    loadSubmissions();
  }

  async function rejectSubmission(sub) {
    if (!confirm(`Reject submission from ${sub.company_name}?`)) return;
    await supabase
      .from('onboarding_submissions')
      .update({ status: 'rejected' })
      .eq('id', sub.id);
    loadSubmissions();
  }

  const pending = submissions.filter(s => s.status === 'pending');
  const reviewed = submissions.filter(s => s.status !== 'pending');

  if (loading) return null;
  if (pending.length === 0) return null;

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel__header">
        <h3>Pending Onboarding ({pending.length})</h3>
      </div>
      <div className="panel__body" style={{ padding: 0 }}>
        {pending.map(sub => (
          <div key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
                  {sub.company_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate)', marginTop: 2 }}>
                  {sub.primary_contact_name} &middot; {sub.primary_contact_email} &middot; {formatDate(sub.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={e => { e.stopPropagation(); convertToClient(sub); }}
                >
                  Convert to Client
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={e => { e.stopPropagation(); rejectSubmission(sub); }}
                >
                  Reject
                </button>
              </div>
            </div>

            {expanded === sub.id && (
              <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: '0.82rem' }}>
                <div><span style={{ color: 'var(--slate)' }}>Industry:</span> {sub.industry || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Size:</span> {sub.company_size || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Website:</span> {sub.company_website || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Contact Title:</span> {sub.primary_contact_title || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Phone:</span> {sub.primary_contact_phone || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Brand Tone:</span> {sub.brand_tone || '—'}</div>
                {sub.brand_colors?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--slate)' }}>Brand Colors:</span>
                    {sub.brand_colors.map((c, i) => (
                      <span key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid var(--border)', display: 'inline-block' }} />
                    ))}
                  </div>
                )}
                {sub.project_types?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--slate)' }}>Project Types:</span> {sub.project_types.join(', ')}
                  </div>
                )}
                {sub.project_description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--slate)' }}>Description:</span> {sub.project_description}
                  </div>
                )}
                <div><span style={{ color: 'var(--slate)' }}>Budget:</span> {sub.budget_range || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Timeline:</span> {sub.timeline || '—'}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
