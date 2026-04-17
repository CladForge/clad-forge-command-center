import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// `loadStripe` returns null in tests/SSR; we also return null when unconfigured
// so the UI can fall back to manual payment instructions cleanly.
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
export const STRIPE_CONFIGURED = Boolean(publishableKey);

// Brand-matched appearance for the Payment Element, theme-aware
export function getStripeAppearance() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    return {
      theme: 'stripe',
      variables: {
        colorPrimary: '#e07800',
        colorBackground: '#ffffff',
        colorText: '#1a1b27',
        colorTextSecondary: '#6b7280',
        colorDanger: '#dc2626',
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        fontSizeBase: '15px',
        borderRadius: '10px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': { borderColor: '#e4e4e7', padding: '12px 14px' },
        '.Input:focus': { borderColor: '#e07800', boxShadow: '0 0 0 3px rgba(224, 120, 0, 0.15)' },
        '.Label': { fontWeight: '600', color: '#6b7280', fontSize: '13px' },
        '.Tab': { borderColor: '#e4e4e7', padding: '10px 14px' },
        '.Tab--selected': { borderColor: '#e07800', boxShadow: '0 0 0 1px #e07800' },
      },
    };
  }
  // Dark theme (default)
  return {
    theme: 'night',
    variables: {
      colorPrimary: '#ff8c00',
      colorBackground: '#222336',
      colorText: '#ffffff',
      colorTextSecondary: '#8e8da0',
      colorTextPlaceholder: '#5a5b72',
      colorDanger: '#ff3b26',
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      fontSizeBase: '15px',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': { borderColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 14px', backgroundColor: '#1a1b27' },
      '.Input:focus': { borderColor: '#ff8c00', boxShadow: '0 0 0 3px rgba(255, 140, 0, 0.2)' },
      '.Label': { fontWeight: '600', color: '#8e8da0', fontSize: '13px' },
      '.Tab': { borderColor: 'rgba(255, 255, 255, 0.1)', padding: '10px 14px', backgroundColor: '#1a1b27' },
      '.Tab--selected': { borderColor: '#ff8c00', boxShadow: '0 0 0 1px #ff8c00', backgroundColor: '#222336' },
      '.TabIcon': { color: '#8e8da0' },
      '.TabIcon--selected': { color: '#ff8c00' },
    },
  };
}

// Backwards-compat export (static snapshot for code that reads it directly)
export const stripeAppearance = typeof document !== 'undefined' ? getStripeAppearance() : {};
