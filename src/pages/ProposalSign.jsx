import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
      const { data, error: err } = await supabase
        .from('sows')
        .select('*')
        .eq('share_token', token)
        .single();

      if (err || !data) {
        setError('This proposal link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const p = snakeToCamel(data);
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

      // Load client info
      if (p.clientId) {
        const { data: c } = await supabase.from('clients').select('*').eq('id', p.clientId).single();
        if (c) setClient(snakeToCamel(c));
      }

      // Load company settings
      const { data: s } = await supabase.from('settings').select('*').eq('id', 'default').single();
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

    const { error: err } = await supabase
      .from('sows')
      .update({
        status: 'accepted',
        client_signature: signature,
        client_signed_date: signedDate,
        client_notes: clientNotes,
        client_selections: selections,
        signed_snapshot: snapshot,
        accepted_date: signedDate,
        packages: finalPackages,
      })
      .eq('share_token', token);

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

    const { error: err } = await supabase
      .from('sows')
      .update({
        status: 'declined',
        client_notes: reason || 'Declined without notes',
        client_selections: selections,
      })
      .eq('share_token', token);

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

        {/* Footer */}
        <div className="sign-footer">
          <p>{companyName} — {settings?.companyAddress || ''}</p>
          <p>{settings?.companyEmail || ''} · {settings?.companyPhone || ''}</p>
        </div>
      </div>
    </div>
  );
}

function downloadProposalPDF(proposal, client, settings) {
  const company = settings?.companyName || 'Clad Forge';
  const packages = proposal.packages || [];
  const total = packages.reduce((s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)), 0);
  const fmt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Proposal ${proposal.proposalNumber} — Signed</title>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;color:#1f2937;padding:48px;max-width:800px;margin:0 auto;line-height:1.7;font-size:14px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #b45309;padding-bottom:24px;margin-bottom:32px}
      .company{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px}
      h1{font-family:'Instrument Serif',Georgia,serif;font-size:32px;font-weight:400;margin:4px 0}
      .number{font-family:'JetBrains Mono',monospace;font-size:13px;color:#b45309}
      .meta{font-size:12px;color:#6b7280;text-align:right;line-height:1.6}
      .two-col{display:flex;gap:40px;margin-bottom:28px}
      .col{flex:1} .col h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px}
      .col .name{font-weight:600;font-size:15px}
      h3{font-family:'Instrument Serif',Georgia,serif;font-size:20px;font-weight:400;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
      .desc{font-size:14px;color:#4b5563;margin-bottom:28px;line-height:1.7}
      .pkg{border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden}
      .pkg.optional{border-style:dashed;border-color:#d97706}
      .pkg-head{display:flex;align-items:center;padding:16px 20px;gap:16px;background:#f9fafb}
      .pkg-num{width:28px;height:28px;border-radius:50%;background:#b45309;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
      .pkg-info{flex:1} .pkg-info h4{font-size:15px;font-weight:600;margin-bottom:2px} .pkg-info p{font-size:13px;color:#6b7280}
      .pkg-price{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;color:#b45309}
      .pkg-items{padding:12px 20px 16px;list-style:none}
      .pkg-items li{padding:4px 0;font-size:13px;color:#4b5563;padding-left:16px;position:relative}
      .pkg-items li::before{content:'•';position:absolute;left:0;color:#b45309;font-weight:700}
      .pricing{background:#f9fafb;border-radius:10px;padding:24px;margin:28px 0}
      .pricing-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #e5e7eb}
      .pricing-row:last-of-type{border-bottom:none}
      .pricing-total{display:flex;justify-content:space-between;padding:14px 0 0;border-top:2px solid #1f2937;margin-top:8px;font-size:18px;font-weight:700}
      .pricing-total span:last-child{color:#b45309;font-family:'JetBrains Mono',monospace}
      .terms{font-size:13px;color:#6b7280;line-height:1.7;white-space:pre-wrap}
      .sigs{display:flex;gap:40px;margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb}
      .sig{flex:1;display:flex;flex-direction:column;gap:4px}
      .sig-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600}
      .sig-cursive{font-family:'Dancing Script',cursive;font-size:24px;color:#1f2937}
      .sig-date{font-family:'JetBrains Mono',monospace;font-size:11px;color:#9ca3af}
      .sig-line{border-top:1.5px solid #1f2937;width:100%;max-width:280px;margin:8px 0 6px}
      .sig-name{font-size:13px;color:#6b7280}
      .accepted{text-align:center;margin-top:32px;padding:16px;background:#ecfdf5;border-radius:10px;color:#059669;font-weight:600;font-size:14px}
      @media print{body{padding:24px}}
    </style></head><body>
    <div class="header"><div><div class="company">${company}</div><h1>Proposal</h1><div class="number">${proposal.proposalNumber}</div></div>
    <div class="meta">Prepared ${proposal.createdAt?.split('T')[0] || ''}<br>${proposal.validUntil ? `Valid until ${proposal.validUntil}` : ''}</div></div>
    <div class="two-col"><div class="col"><h4>Prepared For</h4><p class="name">${client?.company || ''}</p></div>
    <div class="col"><h4>Project</h4><p class="name">${proposal.projectTitle}</p>${proposal.timeline?.startDate ? `<p>${proposal.timeline.startDate} — ${proposal.timeline.endDate || 'TBD'}</p>` : ''}</div></div>
    ${proposal.description ? `<p class="desc">${proposal.description}</p>` : ''}
    <h3>Scope & Pricing</h3>
    ${packages.map((pkg, i) => `
      <div class="pkg ${pkg.optional ? 'optional' : ''}">
        <div class="pkg-head"><div class="pkg-num">${i + 1}</div><div class="pkg-info"><h4>${pkg.name}</h4>${pkg.description ? `<p>${pkg.description}</p>` : ''}</div><div class="pkg-price">${fmt(pkg.price)}</div></div>
        ${(pkg.items || []).filter(it => it.text).length > 0 ? `<ul class="pkg-items">${pkg.items.filter(it => it.text).map(it => `<li>${it.text}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    <div class="pricing"><h3 style="border:none;padding:0;margin-bottom:12px">Investment</h3>
    ${packages.map(pkg => `<div class="pricing-row"><span>${pkg.name}${pkg.optional ? ' (optional)' : ''}</span><span>${fmt(pkg.price)}</span></div>`).join('')}
    <div class="pricing-total"><span>Total</span><span>${fmt(total)}</span></div></div>
    ${proposal.terms ? `<h3>Terms & Conditions</h3><p class="terms">${proposal.terms}</p>` : ''}
    <div class="sigs">
      <div class="sig">
        <span class="sig-label">Provider</span>
        ${proposal.providerSignature ? `<span class="sig-cursive">${proposal.providerSignature}</span><span class="sig-date">${proposal.providerSignedDate}</span>` : ''}
        <div class="sig-line"></div>
        <span class="sig-name">${proposal.providerSignature || settings?.ownerName || ''}, ${company}</span>
      </div>
      <div class="sig">
        <span class="sig-label">Client</span>
        ${proposal.clientSignature ? `<span class="sig-cursive">${proposal.clientSignature}</span><span class="sig-date">${proposal.clientSignedDate}</span>` : ''}
        <div class="sig-line"></div>
        <span class="sig-name">${proposal.clientSignature || ''}, ${client?.company || ''}</span>
      </div>
    </div>
    <div class="accepted">✓ This proposal was accepted and signed on ${proposal.clientSignedDate || proposal.acceptedDate || ''}</div>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
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
