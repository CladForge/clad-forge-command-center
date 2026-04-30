import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { downloadProposalPDF } from '../lib/proposalPdf';

function formatCurrency(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ProposalSign() {
  const { token } = useParams();
  const [proposal, setProposal] = useState(null);
  const [client, setClient] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Client inputs
  const [selections, setSelections] = useState({});
  const [signature, setSignature] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      // RPC instead of direct SELECT — Phase 3 RLS blocks anon table reads.
      // get_sow_by_token / get_client_by_sow_token run as SECURITY DEFINER
      // and only return the row matching the share_token.
      const { data: sowRow, error: err } = await supabase.rpc('get_sow_by_token', { p_token: token });

      if (err || !sowRow) {
        setError('This proposal link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const p = snakeToCamel(sowRow);
      setProposal(p);

      // Initialize optional package selections (all included by default)
      const sel = {};
      (p.packages || []).forEach(pkg => {
        if (pkg.optional) sel[pkg.id] = true;
      });
      setSelections(sel);

      // Check if already signed
      if (p.status === 'accepted' || p.status === 'declined' || p.status === 'project-created') {
        setSubmitted(true);
      }

      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.rpc('get_client_by_sow_token', { p_token: token }),
        supabase.from('settings').select('*').eq('id', 'default').single(),
      ]);
      if (c) setClient(snakeToCamel(c));
      if (s) setSettings(snakeToCamel(s));

      setLoading(false);
    }
    load();
  }, [token]);

  const packages = proposal?.packages || [];
  const requiredPkgs = packages.filter(p => !p.optional);
  const optionalPkgs = packages.filter(p => p.optional);
  const selectedTotal = packages.reduce((s, p) => {
    if (p.optional && !selections[p.id]) return s;
    return s + (p.price || 0);
  }, 0);

  async function handleAccept() {
    if (!signature.trim()) {
      alert('Please enter your full name as a digital signature.');
      return;
    }
    setSubmitting(true);

    const signedDate = new Date().toISOString().split('T')[0];
    const snapshot = {
      ...proposal,
      clientSelections: selections,
      clientSignature: signature,
      clientSignedDate: signedDate,
      clientNotes,
      finalTotal: selectedTotal,
    };

    // Build final packages with selections applied
    const finalPackages = packages.map(p => ({
      ...p,
      included: p.optional ? !!selections[p.id] : true,
    }));

    // RPC instead of direct UPDATE — anon UPDATE blocked by RLS.
    const { error: err } = await supabase.rpc('accept_sow_by_token', {
      p_token: token,
      p_signature: signature,
      p_notes: clientNotes,
      p_selections: selections,
      p_snapshot: snapshot,
      p_packages: finalPackages,
    });

    if (err) {
      alert('There was an error submitting. Please try again.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    setProposal(prev => ({ ...prev, status: 'accepted', clientSignature: signature, clientSignedDate: signedDate }));
  }

  async function handleDecline() {
    const reason = clientNotes.trim() ? clientNotes : '';
    if (!window.confirm('Are you sure you want to decline this proposal?')) return;
    setSubmitting(true);

    const { error: err } = await supabase.rpc('decline_sow_by_token', {
      p_token: token,
      p_notes: reason || 'Declined without notes',
      p_selections: selections,
    });

    if (err) {
      alert('There was an error. Please try again.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    setProposal(prev => ({ ...prev, status: 'declined' }));
  }

  if (loading) {
    return (
      <div className="sign-page">
        <div className="sign-loading">
          <div className="loading-spinner" />
          <span>Loading proposal...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sign-page">
        <div className="sign-error">
          <h2>Proposal Not Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const companyName = settings?.companyName || 'Clad Forge';

  // Already submitted view
  if (submitted) {
    const isAccepted = proposal.status === 'accepted' || proposal.status === 'project-created';
    return (
      <div className="sign-page">
        <div className="sign-card sign-card--submitted">
          <div className="sign-submitted-icon">{isAccepted ? '✓' : '✕'}</div>
          <h2>{isAccepted ? 'Proposal Accepted' : 'Proposal Declined'}</h2>
          <p>
            {isAccepted
              ? `Thank you for accepting this proposal. ${companyName} will be in touch to get started.`
              : 'This proposal has been declined. If you have questions, please contact us.'}
          </p>
          {proposal.clientSignature && (
            <div className="sign-confirmation">
              <span>Signed by: <strong>{proposal.clientSignature}</strong></span>
              <span>Date: {proposal.clientSignedDate}</span>
            </div>
          )}
          {isAccepted && (
            <button className="sign-btn sign-btn--download" onClick={() => downloadProposalPDF(proposal, client, settings)}>
              Download Signed Proposal
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sign-page">
      <div className="sign-document">
        {/* Header */}
        <div className="sign-header">
          <div>
            <span className="sign-company">{companyName}</span>
            <h1 className="sign-title">Proposal</h1>
            <span className="sign-number">{proposal.proposalNumber}</span>
          </div>
          <div className="sign-header-right">
            <span>Prepared {proposal.createdAt?.split('T')[0]}</span>
            {proposal.validUntil && <span>Valid until {proposal.validUntil}</span>}
          </div>
        </div>

        {/* Client + Project Info */}
        <div className="sign-info">
          <div className="sign-info-col">
            <h4>Prepared For</h4>
            <p className="sign-client-name">{client?.company || '—'}</p>
            <p>{client?.company || ''}</p>
          </div>
          <div className="sign-info-col">
            <h4>Project</h4>
            <p className="sign-client-name">{proposal.projectTitle}</p>
            {proposal.timeline?.startDate && (
              <p>{proposal.timeline.startDate} — {proposal.timeline.endDate || 'TBD'}</p>
            )}
          </div>
        </div>

        {/* Description */}
        {proposal.description && (
          <div className="sign-section">
            <h3>Overview</h3>
            <p>{proposal.description}</p>
          </div>
        )}

        {/* Required Packages */}
        <div className="sign-section">
          <h3>Scope & Pricing</h3>
          {requiredPkgs.map((pkg, i) => (
            <div key={pkg.id || i} className="sign-pkg">
              <div className="sign-pkg-header">
                <div className="sign-pkg-num">{i + 1}</div>
                <div className="sign-pkg-info">
                  <h4>{pkg.name}</h4>
                  {pkg.description && <p>{pkg.description}</p>}
                </div>
                <span className="sign-pkg-price">{formatCurrency(pkg.price)}</span>
              </div>
              {(pkg.items || []).filter(it => it.text).length > 0 && (
                <ul className="sign-pkg-items">
                  {pkg.items.filter(it => it.text).map((item, j) => (
                    <li key={j}>{item.text}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Optional Packages — Client can select/deselect */}
        {optionalPkgs.length > 0 && (
          <div className="sign-section">
            <h3>Optional Add-Ons</h3>
            <p className="sign-optional-desc">Select which optional packages you'd like to include:</p>
            {optionalPkgs.map((pkg, i) => (
              <div key={pkg.id || i} className={`sign-pkg sign-pkg--optional ${selections[pkg.id] ? 'sign-pkg--selected' : ''}`}>
                <div className="sign-pkg-header">
                  <label className="sign-pkg-check">
                    <input
                      type="checkbox"
                      checked={!!selections[pkg.id]}
                      onChange={e => setSelections(s => ({ ...s, [pkg.id]: e.target.checked }))}
                    />
                    <span className="sign-pkg-checkbox" />
                  </label>
                  <div className="sign-pkg-info">
                    <h4>{pkg.name}</h4>
                    {pkg.description && <p>{pkg.description}</p>}
                  </div>
                  <span className="sign-pkg-price">{formatCurrency(pkg.price)}</span>
                </div>
                {(pkg.items || []).filter(it => it.text).length > 0 && (
                  <ul className="sign-pkg-items">
                    {pkg.items.filter(it => it.text).map((item, j) => (
                      <li key={j}>{item.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="sign-total-section">
          <div className="sign-total-rows">
            {packages.map((pkg, i) => (
              <div key={i} className={`sign-total-row ${pkg.optional && !selections[pkg.id] ? 'sign-total-row--excluded' : ''}`}>
                <span>
                  {pkg.name}
                  {pkg.optional && !selections[pkg.id] && ' (not selected)'}
                  {pkg.optional && selections[pkg.id] && ' (optional)'}
                </span>
                <span className="sign-total-amount">
                  {pkg.optional && !selections[pkg.id] ? '—' : formatCurrency(pkg.price)}
                </span>
              </div>
            ))}
          </div>
          <div className="sign-total-final">
            <span>Total Investment</span>
            <span>{formatCurrency(selectedTotal)}</span>
          </div>
        </div>

        {/* Terms */}
        {proposal.terms && (
          <div className="sign-section">
            <h3>Terms & Conditions</h3>
            <p className="sign-terms">{proposal.terms}</p>
          </div>
        )}

        {/* Client Notes */}
        <div className="sign-section">
          <h3>Notes for {companyName} (optional)</h3>
          <textarea
            className="sign-notes"
            value={clientNotes}
            onChange={e => setClientNotes(e.target.value)}
            placeholder="Questions, concerns, or special requests..."
            rows={3}
          />
        </div>

        {/* Signature Section */}
        <div className="sign-signature-section">
          <h3>Digital Signature</h3>
          <p className="sign-signature-desc">
            By typing your full name below and clicking "Accept & Sign", you agree to the terms and pricing outlined in this proposal.
          </p>
          <div className="sign-signature-field">
            <label>Full Legal Name</label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Type your full name..."
              className="sign-signature-input"
            />
          </div>
          <div className="sign-signature-date">
            Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sign-actions">
          <button
            className="sign-btn sign-btn--accept"
            onClick={handleAccept}
            disabled={submitting || !signature.trim()}
          >
            {submitting ? 'Submitting...' : '✓ Accept & Sign Proposal'}
          </button>
          <button
            className="sign-btn sign-btn--decline"
            onClick={handleDecline}
            disabled={submitting}
          >
            Decline Proposal
          </button>
        </div>

        {/* Download — available before signing too, so clients can keep a
            copy for their records / share with stakeholders before deciding. */}
        <div className="sign-actions" style={{ marginTop: 12 }}>
          <button
            className="sign-btn sign-btn--download"
            onClick={() => downloadProposalPDF(proposal, client, settings)}
            style={{ width: '100%' }}
          >
            Download Proposal (PDF)
          </button>
        </div>

        {/* Footer */}
        <div className="sign-footer">
          <p>{companyName} — {settings?.companyAddress || ''}</p>
          <p>{settings?.companyEmail || ''} · {settings?.companyPhone || ''}</p>
        </div>
      </div>
    </div>
  );
}

function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
