import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function fmt(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function calcSubtotal(items) { return (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0); }
function calcTotal(items, taxRate = 0, discount = 0) { const sub = calcSubtotal(items); return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0); }

function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return result;
}

export default function InvoiceView() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.from('invoices').select('*').eq('share_token', token).single();
      if (err || !data) { setError('This invoice link is invalid or has expired.'); setLoading(false); return; }
      const inv = snakeToCamel(data);
      setInvoice(inv);
      if (inv.status === 'processing' || inv.status === 'paid') setConfirmed(true);

      const { data: s } = await supabase.from('settings').select('*').eq('id', 'default').single();
      if (s) setSettings(snakeToCamel(s));
      setLoading(false);
    }
    load();
  }, [token]);

  async function handlePaymentSent() {
    if (!window.confirm('Confirm that you have sent payment for this invoice?')) return;
    setConfirming(true);
    await supabase.from('invoices').update({ status: 'processing' }).eq('share_token', token);
    setConfirmed(true);
    setConfirming(false);
    setInvoice(prev => ({ ...prev, status: 'processing' }));
  }

  function handleDownload() {
    if (!invoice) return;
    const company = settings?.companyName || 'Clad Forge';
    const subtotal = calcSubtotal(invoice.items);
    const taxAmount = subtotal * ((invoice.taxRate || 0) / 100);
    const total = calcTotal(invoice.items, invoice.taxRate, invoice.discount);

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;color:#1f2937;padding:48px;max-width:800px;margin:0 auto;line-height:1.6;font-size:14px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;margin-bottom:28px;border-bottom:2px solid #b45309}
        .company{font-family:'Instrument Serif',Georgia,serif;font-size:24px;margin-bottom:2px}
        .company-info{font-size:12px;color:#6b7280;line-height:1.5}
        .inv-title{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:600;color:#b45309}
        .inv-meta{font-size:12px;color:#6b7280;margin-top:4px;line-height:1.6}
        .two-col{display:flex;gap:40px;margin-bottom:28px}
        .col{flex:1} .col h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px;font-weight:600}
        .col .name{font-weight:600;font-size:15px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;padding:10px 12px;border-bottom:2px solid #e5e7eb;font-weight:600}
        td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px}
        .mono{font-family:'JetBrains Mono',monospace;font-size:13px}
        .right{text-align:right}
        .totals{margin-left:auto;width:280px}
        .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
        .totals-row.total{border-top:2px solid #1f2937;margin-top:8px;padding-top:12px;font-weight:700;font-size:18px}
        .totals-row.total .amt{color:#b45309;font-family:'JetBrains Mono',monospace}
        .amt{font-family:'JetBrains Mono',monospace}
        .notes{margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280}
        .notes h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px;font-weight:600}
        .footer{margin-top:48px;text-align:center;font-size:12px;color:#9ca3af;padding-top:20px;border-top:1px solid #e5e7eb}
        @media print{body{padding:24px}}
      </style></head><body>
      <div class="header">
        <div><div class="company">${company}</div><div class="company-info">${settings?.ownerName || ''}<br>${settings?.companyAddress || ''}<br>${settings?.companyEmail || ''}<br>${settings?.companyPhone || ''}</div></div>
        <div style="text-align:right"><div class="inv-title">${invoice.invoiceNumber}</div><div class="inv-meta">Issued: ${invoice.issueDate || ''}<br>Due: ${invoice.dueDate || 'Upon receipt'}<br>Terms: ${invoice.paymentTerms || 'Net 30'}</div></div>
      </div>
      <div class="two-col">
        <div class="col"><h3>Bill To</h3><p class="name">${invoice.clientName || invoice.clientCompany || ''}</p><p>${invoice.clientEmail || ''}</p></div>
        <div class="col"><h3>Project</h3><p class="name">${invoice.projectTitle || ''}</p></div>
      </div>
      <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th class="right">Amount</th></tr></thead><tbody>
      ${(invoice.items || []).map(item => `<tr><td>${item.description}</td><td class="mono">${item.quantity}</td><td class="mono">${fmt(item.rate)}</td><td class="mono right">${fmt(item.quantity * item.rate)}</td></tr>`).join('')}
      </tbody></table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span class="amt">${fmt(subtotal)}</span></div>
        ${invoice.taxRate > 0 ? `<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span class="amt">${fmt(taxAmount)}</span></div>` : ''}
        ${invoice.discount > 0 ? `<div class="totals-row"><span>Discount</span><span class="amt">-${fmt(invoice.discount)}</span></div>` : ''}
        <div class="totals-row total"><span>Total Due</span><span class="amt">${fmt(total)}</span></div>
      </div>
      ${invoice.notes ? `<div class="notes"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
      <div class="footer">${company} — ${settings?.companyAddress || ''} — ${settings?.companyEmail || ''}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  if (loading) return <div className="sign-page"><div className="sign-loading"><div className="loading-spinner" /><span>Loading invoice...</span></div></div>;
  if (error) return <div className="sign-page"><div className="sign-error"><h2>Invoice Not Found</h2><p>{error}</p></div></div>;

  const total = calcTotal(invoice.items, invoice.taxRate, invoice.discount);
  const subtotal = calcSubtotal(invoice.items);
  const taxAmount = subtotal * ((invoice.taxRate || 0) / 100);
  const company = settings?.companyName || 'Clad Forge';
  const isPaid = invoice.status === 'paid';

  return (
    <div className="sign-page">
      <div className="sign-document">
        {/* Header */}
        <div className="sign-header">
          <div>
            <span className="sign-company">{company}</span>
            <h1 className="sign-title">Invoice</h1>
            <span className="sign-number">{invoice.invoiceNumber}</span>
          </div>
          <div className="sign-header-right">
            <span>Issued: {invoice.issueDate || '—'}</span>
            <span>Due: {invoice.dueDate || 'Upon receipt'}</span>
            <span>Terms: {invoice.paymentTerms || 'Net 30'}</span>
          </div>
        </div>

        {/* Bill To */}
        <div className="sign-info">
          <div className="sign-info-col">
            <h4>Bill To</h4>
            <p className="sign-client-name">{invoice.clientName || invoice.clientCompany || '—'}</p>
            <p>{invoice.clientEmail || ''}</p>
          </div>
          <div className="sign-info-col">
            <h4>Project</h4>
            <p className="sign-client-name">{invoice.projectTitle || '—'}</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="sign-section">
          <h3>Line Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--slate)', padding: '10px 0', borderBottom: '2px solid var(--stone-dark)', fontWeight: 600 }}>Description</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--slate)', padding: '10px 0', borderBottom: '2px solid var(--stone-dark)', fontWeight: 600, width: 60 }}>Qty</th>
                <th style={{ textAlign: 'right', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--slate)', padding: '10px 0', borderBottom: '2px solid var(--stone-dark)', fontWeight: 600, width: 100 }}>Rate</th>
                <th style={{ textAlign: 'right', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--slate)', padding: '10px 0', borderBottom: '2px solid var(--stone-dark)', fontWeight: 600, width: 100 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid var(--stone-dark)', fontSize: '0.88rem' }}>{item.description || '—'}</td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid var(--stone-dark)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid var(--stone-dark)', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{fmt(item.rate)}</td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid var(--stone-dark)', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>{fmt(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="sign-total-section">
          <div className="sign-total-rows">
            <div className="sign-total-row"><span>Subtotal</span><span className="sign-total-amount">{fmt(subtotal)}</span></div>
            {invoice.taxRate > 0 && <div className="sign-total-row"><span>Tax ({invoice.taxRate}%)</span><span className="sign-total-amount">{fmt(taxAmount)}</span></div>}
            {invoice.discount > 0 && <div className="sign-total-row"><span>Discount</span><span className="sign-total-amount">-{fmt(invoice.discount)}</span></div>}
          </div>
          <div className="sign-total-final">
            <span>Total Due</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="sign-section">
            <h3>Notes</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{invoice.notes}</p>
          </div>
        )}

        {/* Payment Instructions */}
        {settings?.paymentInstructions && (
          <div className="sign-section">
            <h3>Payment Instructions</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate)', whiteSpace: 'pre-wrap' }}>{settings.paymentInstructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="sign-actions">
          {!confirmed && !isPaid && (
            <button className="sign-btn sign-btn--accept" onClick={handlePaymentSent} disabled={confirming}>
              {confirming ? 'Confirming...' : '✓ Payment Sent'}
            </button>
          )}
          {confirmed && (
            <div style={{ flex: 1, textAlign: 'center', padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius)', color: 'var(--success)', fontWeight: 600 }}>
              {isPaid ? '✓ Payment Confirmed — Thank You!' : '✓ Payment Marked as Sent — Processing'}
            </div>
          )}
          <button className="sign-btn sign-btn--download" onClick={handleDownload}>
            Download Invoice
          </button>
        </div>

        {/* Footer */}
        <div className="sign-footer">
          <p>{company} — {settings?.companyAddress || ''}</p>
          <p>{settings?.companyEmail || ''} · {settings?.companyPhone || ''}</p>
        </div>
      </div>
    </div>
  );
}
