import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CLAD_FORGE_LOGO_DATA_URI } from '../lib/brand';
import { buildInvoiceHTML } from './Invoices';

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
  const [client, setClient] = useState(null);
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

      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 'default').single(),
        inv.clientId
          ? supabase.from('clients').select('*').eq('id', inv.clientId).single()
          : Promise.resolve({ data: null }),
      ]);
      if (s) setSettings(snakeToCamel(s));
      if (c) setClient(snakeToCamel(c));
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
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildInvoiceHTML(invoice, client, settings));
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
          <div className="sign-header-brand">
            <img src={CLAD_FORGE_LOGO_DATA_URI} alt={company} className="sign-header-logo" />
            <div>
              <span className="sign-company">{company}</span>
              <h1 className="sign-title">Invoice</h1>
              <span className="sign-number">{invoice.invoiceNumber}</span>
            </div>
          </div>
          <div className="sign-header-right">
            <span>Issued: {invoice.issueDate || '—'}</span>
            <span>Due: {invoice.dueDate || 'Upon receipt'}</span>
            <span>Terms: {invoice.paymentTerms || 'Net 30'}</span>
          </div>
        </div>

        {/* Payment X of X badge */}
        {invoice.paymentNumber && invoice.paymentTotal && (
          <div className="sign-payment-badge">
            <span className="sign-payment-badge__label">Payment</span>
            <span className="sign-payment-badge__frac">
              <strong>{invoice.paymentNumber}</strong> of <strong>{invoice.paymentTotal}</strong>
            </span>
            <span className="sign-payment-badge__sub">Multi-stage project billing</span>
          </div>
        )}

        {/* Bill To */}
        <div className="sign-info">
          <div className="sign-info-col">
            <h4>Bill To</h4>
            <p className="sign-client-name">{invoice.clientCompany || invoice.clientName || client?.company || '—'}</p>
            {(() => {
              const ct = invoice.contactPerson && client?.contacts
                ? client.contacts.find(c => c.id === invoice.contactPerson)
                : null;
              return ct ? <p className="sign-client-attn">Attn: {ct.name}{ct.title ? `, ${ct.title}` : ''}</p> : null;
            })()}
            {client?.address && <p style={{ whiteSpace: 'pre-line' }}>{client.address}</p>}
            {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
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
