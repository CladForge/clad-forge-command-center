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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { invoice_token } = await req.json();
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

    const total = calcTotal(invoice.items, invoice.tax_rate, invoice.discount);
    const amountCents = Math.round(total * 100);

    if (amountCents < 50) {
      return new Response(JSON.stringify({ error: 'Amount must be at least $0.50' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let pi;
    // Reuse existing intent when possible (user reopened the page before paying)
    if (invoice.stripe_payment_intent_id) {
      try {
        pi = await stripe.paymentIntents.retrieve(invoice.stripe_payment_intent_id);
        // If already succeeded/canceled, create a new one
        if (['succeeded', 'canceled'].includes(pi.status)) {
          pi = null;
        } else if (pi.amount !== amountCents) {
          // Keep amount in sync if invoice was edited
          pi = await stripe.paymentIntents.update(pi.id, { amount: amountCents });
        }
      } catch {
        pi = null;
      }
    }

    if (!pi) {
      pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        description: `Invoice ${invoice.invoice_number}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number ?? '',
          invoice_token,
          client_company: invoice.client_company ?? '',
        },
        receipt_email: invoice.client_email || undefined,
      });
      await supabase.from('invoices').update({ stripe_payment_intent_id: pi.id }).eq('id', invoice.id);
    }

    return new Response(JSON.stringify({
      client_secret: pi.client_secret,
      amount: amountCents,
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
