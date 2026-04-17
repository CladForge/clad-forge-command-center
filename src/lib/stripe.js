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
      colorBackground: '#1a1b27',
      colorText: '#ffffff',
      colorTextSecondary: '#b9b8c4',
      colorTextPlaceholder: '#8e8da0',
      colorIconTab: '#b9b8c4',
      colorIconTabSelected: '#ff8c00',
      colorDanger: '#ff3b26',
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      fontSizeBase: '15px',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': { borderColor: 'rgba(255, 255, 255, 0.12)', padding: '12px 14px', backgroundColor: '#13141d', color: '#ffffff' },
      '.Input:focus': { borderColor: '#ff8c00', boxShadow: '0 0 0 3px rgba(255, 140, 0, 0.2)' },
      '.Input::placeholder': { color: '#8e8da0' },
      '.Label': { fontWeight: '600', color: '#b9b8c4', fontSize: '13px' },
      '.Tab': { borderColor: 'rgba(255, 255, 255, 0.12)', padding: '10px 14px', backgroundColor: '#13141d', color: '#ffffff' },
      '.Tab:hover': { backgroundColor: '#222336', color: '#ffffff' },
      '.Tab--selected': { borderColor: '#ff8c00', boxShadow: '0 0 0 1px #ff8c00', backgroundColor: '#222336', color: '#ffffff' },
      '.Tab--selected:hover': { backgroundColor: '#222336', color: '#ffffff' },
      '.TabLabel': { color: '#ffffff', fontWeight: '600' },
      '.TabLabel--selected': { color: '#ff8c00', fontWeight: '700' },
      '.TabIcon': { color: '#b9b8c4', fill: '#b9b8c4' },
      '.TabIcon--selected': { color: '#ff8c00', fill: '#ff8c00' },
      '.TabIcon:hover': { color: '#ffffff', fill: '#ffffff' },
      '.Text': { color: '#ffffff' },
      '.Text--redirect': { color: '#b9b8c4' },
      '.Action': { color: '#ff8c00' },
      '.Block': { backgroundColor: '#13141d', borderColor: 'rgba(255, 255, 255, 0.12)' },
      '.AccordionItem': { backgroundColor: '#13141d', borderColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff' },
      '.AccordionItem--selected': { backgroundColor: '#222336', borderColor: '#ff8c00' },
    },
  };
}

// Backwards-compat export (static snapshot for code that reads it directly)
export const stripeAppearance = typeof document !== 'undefined' ? getStripeAppearance() : {};
