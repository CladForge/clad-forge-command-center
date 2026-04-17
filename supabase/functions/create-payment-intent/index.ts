// Creates (or retrieves) a Stripe PaymentIntent for a shared invoice link.
// Called from the public invoice page. Uses the share_token to look up the
// invoice with the service-role key so no auth is required from the client.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function calcTotal(items: Array<{ quantity: number; rate: number }>, taxRate = 0, discount = 0) {
  const sub = (items || []).reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0);
  return Math.max(sub + sub * ((taxRate || 0) / 100) - (discount || 0), 0);
}

// Stripe US fee rates, 2026. Returns the grossed-up charge amount (so merchant
// nets `subtotal` after Stripe deducts fees) and the fee amount in dollars.
//
// For percent+flat methods: charge = (subtotal + flat) / (1 - pct)
// For percent+cap methods (ACH): charge = subtotal / (1 - pct), but fee capped
function calculateSurcharge(subtotalDollars: number, method: string): { charge: number; fee: number } {
  const rates: Record<string, { pct: number; flat?: number; cap?: number }> = {
    card: { pct: 0.029, flat: 0.30 },
    link: { pct: 0.029, flat: 0.30 },
    cashapp: { pct: 0.029, flat: 0.30 },
    us_bank_account: { pct: 0.008, cap: 5.00 },
    klarna: { pct: 0.0599, flat: 0.30 },
    afterpay_clearpay: { pct: 0.0599, flat: 0.30 },
    affirm: { pct: 0.0599, flat: 0.30 },
  };
  const rate = rates[method] ?? rates.card;

  if (rate.cap !== undefined) {
    const noCapCharge = subtotalDollars / (1 - rate.pct);
    const noCapFee = noCapCharge - subtotalDollars;
    if (noCapFee > rate.cap) {
      return { charge: round2(subtotalDollars + rate.cap), fee: rate.cap };
    }
    return { charge: round2(noCapCharge), fee: round2(noCapFee) };
  }

  const charge = (subtotalDollars + (rate.flat ?? 0)) / (1 - rate.pct);
  return { charge: round2(charge), fee: round2(charge - subtotalDollars) };
}

function round2(n: number) { return Math.round(n * 100) / 100; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { invoice_token, payment_method_type } = await req.json();
    if (!invoice_token) {
      return new Response(JSON.stringify({ error: 'invoice_token is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invoice, error } = await supabase
      .from('invoices').select('*').eq('share_token', invoice_token).single();
    if (error || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (invoice.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Invoice already paid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subtotal = calcTotal(invoice.items, invoice.tax_rate, invoice.discount);
    // Default to card (worst-case fee) before the user picks a method. When the
    // PaymentElement change event fires we re-call this endpoint with the
    // selected method so the charge and breakdown stay accurate.
    const method = typeof payment_method_type === 'string' ? payment_method_type : 'card';
    const { charge, fee } = calculateSurcharge(subtotal, method);
    const amountCents = Math.round(charge * 100);

    if (amountCents < 50) {
      return new Response(JSON.stringify({ error: 'Amount must be at least $0.50' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedMethods = ['card', 'us_bank_account', 'link', 'cashapp', 'klarna', 'afterpay_clearpay', 'affirm'];

    let pi;
    // Reuse existing intent when possible (user reopened the page before paying)
    if (invoice.stripe_payment_intent_id) {
      try {
        pi = await stripe.paymentIntents.retrieve(invoice.stripe_payment_intent_id);
        if (['succeeded', 'canceled'].includes(pi.status)) {
          pi = null;
        } else {
          // Sync amount and payment_method_types in case the invoice was edited
          // or the allow-list changed since the PI was first created.
          const needsAmountUpdate = pi.amount !== amountCents;
          const currentMethods = (pi.payment_method_types ?? []).slice().sort().join(',');
          const targetMethods = allowedMethods.slice().sort().join(',');
          const needsMethodsUpdate = currentMethods !== targetMethods;
          if (needsAmountUpdate || needsMethodsUpdate) {
            pi = await stripe.paymentIntents.update(pi.id, {
              amount: amountCents,
              payment_method_types: allowedMethods,
            });
          }
        }
      } catch {
        pi = null;
      }
    }

    if (!pi) {
      pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        // Explicit allow-list: everything except us_bank_account. Stripe ACH is
        // excluded so clients who want to avoid processing fees use the manual
        // Bank Transfer path instead. Each method listed here must also be
        // enabled in Stripe Dashboard → Settings → Payment Methods to render.
        payment_method_types: allowedMethods,
        description: `Invoice ${invoice.invoice_number}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number ?? '',
          invoice_token,
          client_company: invoice.client_company ?? '',
          subtotal: String(subtotal),
          surcharged_method: method,
        },
        receipt_email: invoice.client_email || undefined,
      });
      await supabase.from('invoices').update({ stripe_payment_intent_id: pi.id }).eq('id', invoice.id);
    }

    return new Response(JSON.stringify({
      client_secret: pi.client_secret,
      subtotal: round2(subtotal),
      fee: round2(fee),
      total: round2(charge),
      payment_method_type: method,
      invoice_number: invoice.invoice_number,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
