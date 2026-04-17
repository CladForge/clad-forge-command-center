// Returns the payment methods currently enabled on the default Stripe
// Payment Method Configuration, intersected with our app's allow-list.
// Used by the invoice page to show clients an accurate list of what they
// can actually pay with before clicking Pay Online.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Mirror of the allow-list in create-payment-intent. Keep in sync.
const ALLOWED = ['card', 'us_bank_account', 'link', 'cashapp'];

const LABELS: Record<string, string> = {
  card: 'Card',
  us_bank_account: 'ACH',
  link: 'Link',
  cashapp: 'Cash App Pay',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 10 });
    const def = configs.data.find((c: any) => c.is_default) ?? configs.data[0];

    const enabled: string[] = [];
    if (def) {
      for (const method of ALLOWED) {
        const pref = def[method]?.display_preference?.preference;
        // Stripe values: 'on', 'off', 'none' — treat anything not explicitly 'off' as enabled
        if (pref && pref !== 'off') enabled.push(method);
      }
      // Apple Pay / Google Pay are derived from Card + domain verification.
      // Expose them in the list when card is on so clients see the full picture.
      if (enabled.includes('card')) {
        if (def.apple_pay?.display_preference?.preference !== 'off') enabled.push('apple_pay');
        if (def.google_pay?.display_preference?.preference !== 'off') enabled.push('google_pay');
      }
    }

    const labels = enabled.map(m => LABELS[m]).filter(Boolean);

    return new Response(JSON.stringify({ methods: enabled, labels }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('list-stripe-methods error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message, methods: [], labels: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
