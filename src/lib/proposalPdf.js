// Branded proposal PDF rendering. Extracted from ProposalSign.jsx so the
// portal can offer direct downloads without rendering the full sign page.
//
// Same window.open + write + print pattern that buildInvoiceHTML uses.
// Both proposals and invoices follow this approach so the printable PDF
// is identical from owner-side and client-side flows.

function fmt(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildProposalHTML(proposal, client, settings) {
  const company = settings?.companyName || 'Clad Forge';
  const packages = proposal.packages || [];
  const total = packages.reduce(
    (s, p) => s + (p.optional && !p.included ? 0 : (p.price || 0)),
    0
  );
  const isAccepted = proposal.status === 'accepted' || proposal.status === 'project-created';

  return `<!DOCTYPE html><html><head><title>Proposal ${proposal.proposalNumber || ''}</title>
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
      .pkg-items li::before{content:'\\2022';position:absolute;left:0;color:#b45309;font-weight:700}
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
      .draft-banner{text-align:center;margin-top:32px;padding:14px;background:#fef3c7;border-radius:10px;color:#92400e;font-size:13px;font-weight:500}
      @media print{body{padding:24px}}
    </style></head><body>
    <div class="header"><div><div class="company">${company}</div><h1>Proposal</h1><div class="number">${proposal.proposalNumber || ''}</div></div>
    <div class="meta">Prepared ${proposal.createdAt?.split('T')[0] || ''}<br>${proposal.validUntil ? `Valid until ${proposal.validUntil}` : ''}</div></div>
    <div class="two-col"><div class="col"><h4>Prepared For</h4><p class="name">${client?.company || ''}</p></div>
    <div class="col"><h4>Project</h4><p class="name">${proposal.projectTitle || ''}</p>${proposal.timeline?.startDate ? `<p>${proposal.timeline.startDate} — ${proposal.timeline.endDate || 'TBD'}</p>` : ''}</div></div>
    ${proposal.description ? `<p class="desc">${proposal.description}</p>` : ''}
    <h3>Scope & Pricing</h3>
    ${packages.map((pkg, i) => `
      <div class="pkg ${pkg.optional ? 'optional' : ''}">
        <div class="pkg-head"><div class="pkg-num">${i + 1}</div><div class="pkg-info"><h4>${pkg.name || ''}</h4>${pkg.description ? `<p>${pkg.description}</p>` : ''}</div><div class="pkg-price">${fmt(pkg.price)}</div></div>
        ${(pkg.items || []).filter(it => it.text).length > 0 ? `<ul class="pkg-items">${pkg.items.filter(it => it.text).map(it => `<li>${it.text}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    <div class="pricing"><h3 style="border:none;padding:0;margin-bottom:12px">Investment</h3>
    ${packages.map(pkg => `<div class="pricing-row"><span>${pkg.name || ''}${pkg.optional ? ' (optional)' : ''}</span><span>${fmt(pkg.price)}</span></div>`).join('')}
    <div class="pricing-total"><span>Total</span><span>${fmt(total)}</span></div></div>
    ${proposal.terms ? `<h3>Terms & Conditions</h3><p class="terms">${proposal.terms}</p>` : ''}
    <div class="sigs">
      <div class="sig">
        <span class="sig-label">Provider</span>
        ${proposal.providerSignature ? `<span class="sig-cursive">${proposal.providerSignature}</span><span class="sig-date">${proposal.providerSignedDate || ''}</span>` : ''}
        <div class="sig-line"></div>
        <span class="sig-name">${proposal.providerSignature || settings?.ownerName || ''}, ${company}</span>
      </div>
      <div class="sig">
        <span class="sig-label">Client</span>
        ${proposal.clientSignature ? `<span class="sig-cursive">${proposal.clientSignature}</span><span class="sig-date">${proposal.clientSignedDate || ''}</span>` : ''}
        <div class="sig-line"></div>
        <span class="sig-name">${proposal.clientSignature || ''}, ${client?.company || ''}</span>
      </div>
    </div>
    ${isAccepted
      ? `<div class="accepted">✓ Accepted on ${proposal.clientSignedDate || proposal.acceptedDate || ''}</div>`
      : `<div class="draft-banner">This proposal has not been signed yet. Visit the original link to review and accept.</div>`}
    </body></html>`;
}

export function downloadProposalPDF(proposal, client, settings) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildProposalHTML(proposal, client, settings));
  w.document.close();
  setTimeout(() => w.print(), 500);
}
