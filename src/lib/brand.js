// Inline Clad Forge hexagon logo — embedded as a data URI so it renders in
// downloaded PDFs, print windows, and email clients without external hosting.
export const CLAD_FORGE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ffb84d;stop-opacity:1"/><stop offset="100%" style="stop-color:#ff8c00;stop-opacity:1"/></linearGradient></defs><path d="M 540 140 L 887 340 L 887 740 L 540 940 L 193 740 L 193 340 Z M 540 350 L 385 440 L 385 640 L 540 730 L 695 640 L 695 440 Z" fill="url(#g1)" fill-rule="evenodd"/></svg>`;

export const CLAD_FORGE_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(CLAD_FORGE_LOGO_SVG)}`;

// Brand palette — mirror of the CSS vars so we can inject into printable HTML
export const BRAND = {
  primary: '#ff8c00',
  bright: '#ffab40',
  deep: '#e07800',
  ink: '#1a1b27',
  slate: '#5a5b72',
  muted: '#8e8da0',
  fontStack: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif`,
  fontMono: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`,
};

// Google Fonts link for printable HTML documents
export const BRAND_FONTS_LINK = `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;
