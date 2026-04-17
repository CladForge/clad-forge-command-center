import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// `loadStripe` returns null in tests/SSR; we also return null when unconfigured
// so the UI can fall back to manual payment instructions cleanly.
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
export const STRIPE_CONFIGURED = Boolean(publishableKey);

// Brand-matched appearance for the Payment Element
export const stripeAppearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#ff8c00',
    colorBackground: '#ffffff',
    colorText: '#1a1b27',
    colorDanger: '#ff3b26',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { borderColor: '#e4e4e7', padding: '12px 14px' },
    '.Input:focus': { borderColor: '#ff8c00', boxShadow: '0 0 0 3px rgba(255, 140, 0, 0.15)' },
    '.Label': { fontWeight: '600', color: '#5a5b72', fontSize: '13px' },
    '.Tab': { borderColor: '#e4e4e7', padding: '10px 14px' },
    '.Tab--selected': { borderColor: '#ff8c00', boxShadow: '0 0 0 1px #ff8c00' },
  },
};
