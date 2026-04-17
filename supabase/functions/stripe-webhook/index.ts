// Stripe webhook: keeps our invoices table in sync with Stripe payment status.
//
// - payment_intent.processing   → status: 'processing'   (ACH in flight, awaiting settlement)
// - payment_intent.succeeded    → status: 'paid'          (funds settled)
// - payment_intent.payment_failed / canceled → revert to 'sent' so the client can retry
//
// Configure in Stripe Dashboard → Developers → Webhooks:
//   Endpoint URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: payment_intent.processing, payment_intent.succeeded,
//           payment_intent.payment_failed, payment_intent.canceled,
//           charge.refunded

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    const obj: any = event.data.object;

    // For payment_intent.*, metadata.invoice_id is set when we created the PI.
    // For charge.refunded, look up via payment_intent id.
    async function findInvoice() {
      if (obj.metadata?.invoice_id) {
        return (await supabase.from('invoices').select('*').eq('id', obj.metadata.invoice_id).single()).data;
      }
      const piId = obj.payment_intent || obj.id;
      if (piId) {
        return (await supabase.from('invoices').select('*').eq('stripe_payment_intent_id', piId).single()).data;
      }
      return null;
    }

    const invoice = await findInvoice();
    if (!invoice) {
      console.warn('Webhook event with no matching invoice:', event.type, obj.id);
      return new Response('ok', { status: 200 });
    }

    switch (event.type) {
      case 'payment_intent.processing': {
        await supabase.from('invoices').update({
          status: 'processing',
          stripe_payment_intent_id: obj.id,
          payment_method: obj.payment_method_types?.[0] ?? null,
        }).eq('id', invoice.id);
        break;
      }
      case 'payment_intent.succeeded': {
        const amountPaid = (obj.amount_received ?? obj.amount) / 100;
        await supabase.from('invoices').update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: amountPaid,
          stripe_payment_intent_id: obj.id,
          stripe_charge_id: obj.latest_charge ?? null,
          payment_method: obj.payment_method_types?.[0] ?? null,
        }).eq('id', invoice.id);
        break;
      }
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        // Only revert if we haven't already marked paid through some other path
        if (invoice.status !== 'paid') {
          await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id);
        }
        break;
      }
      case 'charge.refunded': {
        await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', invoice.id);
        break;
      }
      default:
        // Ignore other events
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(`Handler Error: ${(err as Error).message}`, { status: 500 });
  }
});
