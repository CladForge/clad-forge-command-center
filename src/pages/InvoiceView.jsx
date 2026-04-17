import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../lib/supabase';
import { CLAD_FORGE_LOGO_DATA_URI } from '../lib/brand';
import { stripePromise, getStripeAppearance, STRIPE_CONFIGURED } from '../lib/stripe';
import { buildInvoiceHTML } from './Invoices';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

  // Stripe state
  const [clientSecret, setClientSecret] = useState(null);
  const [breakdown, setBreakdown] = useState(null); // { subtotal, fee, total, payment_method_type }
  const [stripeError, setStripeError] = useState('');
  const [initializingStripe, setInitializingStripe] = useState(false);

  // Manual payment (wire / ACH / other off-platform method) fallback
  const [markingManual, setMarkingManual] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Load invoice, client, settings
  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.from('invoices').select('*').eq('share_token', token).single();
      if (err || !data) { setError('This invoice link is invalid or has expired.'); setLoading(false); return; }
      const inv = snakeToCamel(data);
      setInvoice(inv);

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

  // Live-sync invoice status (webhook updates → instant UI feedback)
  useEffect(() => {
    if (!invoice?.id) return;
    const channel = supabase
      .channel(`invoice-${invoice.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'invoices', filter: `id=eq.${invoice.id}`,
      }, (payload) => {
        setInvoice(snakeToCamel(payload.new));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [invoice?.id]);

  async function initOrUpdatePaymentIntent(paymentMethodType) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ invoice_token: token, payment_method_type: paymentMethodType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to initialize payment');
    return data;
  }

  async function startStripePayment() {
    if (!STRIPE_CONFIGURED) {
      setStripeError('Online payments are not configured. Use the manual bank transfer option.');
      return;
    }
    setInitializingStripe(true);
    setStripeError('');
    try {
      const data = await initOrUpdatePaymentIntent('card'); // default worst-case fee
      setClientSecret(data.client_secret);
      setBreakdown({ subtotal: data.subtotal, fee: data.fee, total: data.total, paymentMethodType: data.payment_method_type });
    } catch (e) {
      setStripeError(e.message);
    } finally {
      setInitializingStripe(false);
    }
  }

  async function handleMethodChange(paymentMethodType, elementsInstance) {
    if (!paymentMethodType || paymentMethodType === breakdown?.paymentMethodType) return;
    try {
      const data = await initOrUpdatePaymentIntent(paymentMethodType);
      setBreakdown({ subtotal: data.subtotal, fee: data.fee, total: data.total, paymentMethodType: data.payment_method_type });
      // Tell Stripe Elements to pull the updated PaymentIntent amount
      if (elementsInstance?.fetchUpdates) await elementsInstance.fetchUpdates();
    } catch (e) {
      setStripeError(e.message);
    }
  }

  async function handleManualPayment() {
    if (!window.confirm(`Confirm you've initiated a bank transfer for ${fmt(calcTotal(invoice.items, invoice.taxRate, invoice.discount))}? ${company} will verify receipt and mark this invoice as paid once funds arrive.`)) return;
    setMarkingManual(true);
    await supabase.from('invoices')
      .update({ status: 'processing', payment_method: 'manual' })
      .eq('share_token', token);
    setInvoice(prev => ({ ...prev, status: 'processing', paymentMethod: 'manual' }));
    setMarkingManual(false);
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
  const isProcessing = invoice.status === 'processing';
  const isCancelled = invoice.status === 'cancelled';
  const canPay = !isPaid && !isProcessing && !isCancelled;

  return (
    <div className="sign-page">
      <div className={`sign-document ${isPaid ? 'sign-document--paid' : ''}`}>
        {/* PAID stamp */}
        {isPaid && (
          <div className="paid-stamp">
            <span className="paid-stamp__text">PAID</span>
            {invoice.paidDate && <span className="paid-stamp__date">{invoice.paidDate}</span>}
          </div>
        )}

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
            <span>{isPaid ? 'Paid in Full' : 'Total Due'}</span>
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

        {/* ═════════ PAYMENT SECTION ═════════ */}
        {isPaid && (
          <div className="pay-status pay-status--paid">
            <div className="pay-status__icon">✓</div>
            <div>
              <h3>Payment Confirmed — Thank You!</h3>
              <p>
                {invoice.paidAmount ? `${fmt(invoice.paidAmount)} received` : 'Payment received'}
                {invoice.paidDate && ` on ${invoice.paidDate}`}
                {invoice.paymentMethod && ` via ${formatPaymentMethod(invoice.paymentMethod)}`}
              </p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="pay-status pay-status--processing">
            <div className="pay-status__icon"><span className="loading-spinner loading-spinner--sm" /></div>
            <div>
              <h3>Payment Processing</h3>
              <p>
                {invoice.paymentMethod === 'us_bank_account'
                  ? 'Bank transfer is clearing — this usually takes 3–5 business days. We\'ll confirm once settled.'
                  : invoice.paymentMethod === 'manual'
                  ? `${company} has been notified and will confirm receipt shortly.`
                  : 'Awaiting confirmation from the payment processor.'}
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="pay-status pay-status--cancelled">
            <div className="pay-status__icon">—</div>
            <div>
              <h3>Invoice Cancelled</h3>
              <p>This invoice has been cancelled. Please contact {company} if you have questions.</p>
            </div>
          </div>
        )}

        {canPay && (
          <div className="pay-panel">
            <div className="pay-panel__header">
              <div>
                <h3>Pay This Invoice</h3>
                <p>Choose your payment method. Fees are transparent — no surprises.</p>
              </div>
              <div className="pay-panel__total">
                <span className="pay-panel__total-label">Invoice Amount</span>
                <span className="pay-panel__total-amount">{fmt(total)}</span>
              </div>
            </div>

            {stripeError && <div className="pay-panel__error">{stripeError}</div>}

            {/* ═══ Two-option layout: online (fee) vs manual transfer (no fee) ═══ */}
            {!clientSecret && !manualMode && (
              <div className="pay-options">
                {STRIPE_CONFIGURED && (
                  <button
                    className="pay-option pay-option--stripe"
                    onClick={startStripePayment}
                    disabled={initializingStripe}
                  >
                    <div className="pay-option__icon">💳</div>
                    <div className="pay-option__body">
                      <span className="pay-option__title">Pay Online</span>
                      <span className="pay-option__desc">Card · ACH (Stripe) · Link · Cash App Pay · Apple Pay · Google Pay · Klarna · Afterpay</span>
                      <span className="pay-option__fee-note">Processing fee varies by method — see breakdown at checkout</span>
                    </div>
                    <div className="pay-option__arrow">{initializingStripe ? '...' : '→'}</div>
                  </button>
                )}

                <button
                  className="pay-option pay-option--manual"
                  onClick={() => setManualMode(true)}
                >
                  <div className="pay-option__icon">🏦</div>
                  <div className="pay-option__body">
                    <span className="pay-option__title">Pay by Bank Transfer</span>
                    <span className="pay-option__desc">Wire or ACH from your bank — settles in 1–3 business days</span>
                    <span className="pay-option__fee-note pay-option__fee-note--free">No processing fee · You pay exactly {fmt(total)}</span>
                  </div>
                  <div className="pay-option__arrow">→</div>
                </button>
              </div>
            )}

            {/* ═══ Stripe checkout ═══ */}
            {clientSecret && stripePromise && (
              <div className="pay-stripe">
                <button className="pay-back" onClick={() => { setClientSecret(null); setBreakdown(null); }}>
                  ← Back to payment options
                </button>

                {breakdown && (
                  <div className="pay-breakdown">
                    <div className="pay-breakdown__row">
                      <span>Invoice amount</span>
                      <span className="pay-breakdown__amt">{fmt(breakdown.subtotal)}</span>
                    </div>
                    <div className="pay-breakdown__row">
                      <span>
                        Processing fee
                        <span className="pay-breakdown__method">({methodLabel(breakdown.paymentMethodType)})</span>
                      </span>
                      <span className="pay-breakdown__amt">+{fmt(breakdown.fee)}</span>
                    </div>
                    <div className="pay-breakdown__row pay-breakdown__row--total">
                      <span>You will be charged</span>
                      <span className="pay-breakdown__amt">{fmt(breakdown.total)}</span>
                    </div>
                    <p className="pay-breakdown__note">
                      Fee updates live when you select a different payment method below.
                    </p>
                  </div>
                )}

                <Elements stripe={stripePromise} options={{ clientSecret, appearance: getStripeAppearance() }}>
                  <StripeCheckoutForm
                    onMethodChange={handleMethodChange}
                    returnUrl={window.location.href}
                  />
                </Elements>
              </div>
            )}

            {/* ═══ Manual bank transfer instructions ═══ */}
            {manualMode && !clientSecret && (
              <div className="pay-manual">
                <button className="pay-back" onClick={() => setManualMode(false)}>
                  ← Back to payment options
                </button>
                <div className="pay-manual__summary">
                  <span>Amount to transfer:</span>
                  <strong>{fmt(total)}</strong>
                </div>
                <BankDetails settings={settings} invoice={invoice} company={company} />
                {settings?.paymentInstructions && (
                  <>
                    <h4>Additional Notes</h4>
                    <pre className="pay-manual__instructions">{settings.paymentInstructions}</pre>
                  </>
                )}
                <button
                  className="sign-btn sign-btn--accept"
                  onClick={handleManualPayment}
                  disabled={markingManual}
                  style={{ width: '100%' }}
                >
                  {markingManual ? 'Marking as sent...' : `I've initiated the transfer — notify ${company}`}
                </button>
                <p className="pay-panel__manual-note">
                  {company} will confirm receipt once funds clear and mark this invoice as paid.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Download always available */}
        <div className="sign-actions" style={{ marginTop: 24 }}>
          <button className="sign-btn sign-btn--download" onClick={handleDownload} style={{ width: '100%' }}>
            {isPaid ? 'Download Paid Invoice' : 'Download Invoice'}
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

function BankDetails({ settings, invoice, company }) {
  const hasBank = settings?.bankName || settings?.bankRoutingNumber || settings?.bankAccountNumber;

  if (!hasBank) {
    return (
      <>
        <h4>Transfer Instructions</h4>
        <div className="pay-manual__instructions">
          Please contact {settings?.companyEmail ? <a href={`mailto:${settings.companyEmail}?subject=Bank transfer details for invoice ${invoice.invoiceNumber}`} style={{ color: 'var(--brand)' }}>{settings.companyEmail}</a> : company} to request bank transfer details. Reference invoice <strong>{invoice.invoiceNumber}</strong> on your transfer.
        </div>
      </>
    );
  }

  const rows = [
    ['Bank', settings.bankName],
    ['Account Name', settings.bankAccountName],
    ['ACH Routing #', settings.bankRoutingNumber],
    ['Account #', settings.bankAccountNumber],
    ['Wire Routing #', settings.bankWireRoutingNumber],
    ['SWIFT / BIC', settings.bankSwiftCode],
    ['Reference', invoice.invoiceNumber],
  ].filter(([, v]) => v);

  function copyField(label, value) {
    if (navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {});
  }

  return (
    <>
      <h4>Transfer Details</h4>
      <div className="bank-details">
        <table className="bank-details__table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="bank-details__label">{label}</td>
                <td className="bank-details__value">
                  <span>{value}</span>
                  <button
                    type="button"
                    className="bank-details__copy"
                    onClick={() => copyField(label, value)}
                    title={`Copy ${label}`}
                  >⎘</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {settings?.bankVerificationNote && (
        <div className="bank-details__notice">
          <span className="bank-details__notice-icon">⚠</span>
          <span>{settings.bankVerificationNote}</span>
        </div>
      )}
    </>
  );
}

function formatPaymentMethod(method) {
  const map = {
    card: 'credit card',
    us_bank_account: 'ACH bank transfer',
    manual: 'manual bank transfer',
    link: 'Link',
    cashapp: 'Cash App Pay',
    klarna: 'Klarna',
    afterpay_clearpay: 'Afterpay',
    affirm: 'Affirm',
  };
  return map[method] || method;
}

function methodLabel(method) {
  const map = {
    card: 'Card · 2.9% + $0.30',
    us_bank_account: 'ACH · 0.8%, max $5',
    link: 'Link · 2.9% + $0.30',
    cashapp: 'Cash App · 2.9% + $0.30',
    klarna: 'Klarna · 5.99% + $0.30',
    afterpay_clearpay: 'Afterpay · 5.99% + $0.30',
    affirm: 'Affirm · 5.99% + $0.30',
  };
  return map[method] || 'Card rate';
}

/* ═════════ Stripe Payment Element form ═════════ */

function StripeCheckoutForm({ onMethodChange, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Payment failed. Please try again.');
      setSubmitting(false);
    }
    // On success, Stripe either redirects (if required) or the webhook updates status.
    // Our realtime subscription picks up the status change automatically.
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <PaymentElement
        options={{ layout: 'tabs' }}
        onChange={(e) => {
          if (e?.value?.type && onMethodChange) onMethodChange(e.value.type, elements);
        }}
      />
      <button type="submit" className="sign-btn sign-btn--accept" disabled={!stripe || submitting} style={{ width: '100%' }}>
        {submitting ? 'Processing...' : 'Submit Payment'}
      </button>
      {message && <div className="pay-panel__error">{message}</div>}
    </form>
  );
}
