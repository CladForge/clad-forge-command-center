import { useState } from 'react';

const brandColors = [
  { name: 'Brand', hex: '#b45309', usage: 'Primary brand color, buttons, CTAs' },
  { name: 'Brand Deep', hex: '#92400e', usage: 'Pressed states, emphasis' },
  { name: 'Brand Mid', hex: '#d97706', usage: 'Hover states, links' },
  { name: 'Brand Soft', hex: '#f59e0b', usage: 'Highlights, accents' },
  { name: 'Brand Pale', hex: '#fef3c7', usage: 'Backgrounds, badges' },
  { name: 'Ink', hex: '#1f2937', usage: 'Primary text, headings' },
  { name: 'Slate', hex: '#6b7280', usage: 'Secondary text, labels' },
  { name: 'Stone', hex: '#f3f4f6', usage: 'Page background, subtle fills' },
  { name: 'Success', hex: '#059669', usage: 'Success states, completed items' },
  { name: 'Warning', hex: '#d97706', usage: 'Warning states, pending items' },
  { name: 'Danger', hex: '#dc2626', usage: 'Error states, destructive actions' },
  { name: 'Info', hex: '#2563eb', usage: 'Info states, links, review items' },
];

const typographyItems = [
  {
    name: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
    role: 'Display / Headings',
    weights: ['400', '500', '600', '700'],
    sample: 'Clad Forge',
    description: 'Elegant serif used for page titles, section headings, and branding elements. Conveys authority and craftsmanship.',
  },
  {
    name: 'DM Sans',
    family: "'DM Sans', sans-serif",
    role: 'Body / UI',
    weights: ['300', '400', '500', '600'],
    sample: 'Industrial Digital Engineering',
    description: 'Clean sans-serif for body text, navigation, form labels, and all interface elements. Highly readable at all sizes.',
  },
  {
    name: 'IBM Plex Mono',
    family: "'IBM Plex Mono', monospace",
    role: 'Data / Technical',
    weights: ['300', '400', '500', '600'],
    sample: 'const forge = build()',
    description: 'Monospace font for data displays, code snippets, technical specifications, and tabular data.',
  },
];

export default function BrandingGuide() {
  const [copiedColor, setCopiedColor] = useState(null);

  function copyColor(hex) {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  }

  return (
    <div className="branding">
      {/* Hero */}
      <div className="branding__hero">
        <div className="branding__hero-content">
          <span className="branding__hero-label">Brand Identity</span>
          <h2 className="branding__hero-title">CLAD FORGE</h2>
          <p className="branding__hero-tagline">Industrial Digital Engineering</p>
          <div className="branding__hero-divider" />
          <p className="branding__hero-desc">
            Engineering-driven. Custom-built. Zero templates. Our brand represents
            the precision and strength of industrial engineering applied to digital solutions.
          </p>
        </div>
        <div className="branding__hero-graphic">
          <div className="branding__forge-mark">
            <svg viewBox="0 0 120 120" fill="none">
              <rect x="5" y="5" width="110" height="110" rx="8" stroke="var(--amber)" strokeWidth="2" opacity="0.3" />
              <rect x="15" y="15" width="90" height="90" rx="6" stroke="var(--amber)" strokeWidth="1.5" opacity="0.5" />
              <path d="M35 35h50v12H47v12h26v12H47v12h38v12H35V35z" fill="var(--amber)" opacity="0.8" />
            </svg>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <section className="branding__section">
        <div className="branding__section-header">
          <h3>Color Palette</h3>
          <p>Click any swatch to copy the hex value</p>
        </div>
        <div className="branding__colors">
          {brandColors.map((color, i) => (
            <div
              key={color.hex}
              className="branding__color-card"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => copyColor(color.hex)}
            >
              <div
                className="branding__color-swatch"
                style={{ background: color.hex }}
              >
                {copiedColor === color.hex && (
                  <span className="branding__copied">Copied!</span>
                )}
              </div>
              <div className="branding__color-info">
                <span className="branding__color-name">{color.name}</span>
                <code className="branding__color-hex">{color.hex}</code>
                <span className="branding__color-usage">{color.usage}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="branding__section">
        <div className="branding__section-header">
          <h3>Typography</h3>
          <p>Three carefully selected typefaces for different contexts</p>
        </div>
        <div className="branding__typography">
          {typographyItems.map((type, i) => (
            <div
              key={type.name}
              className="branding__type-card"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="branding__type-header">
                <span className="branding__type-role">{type.role}</span>
                <span className="branding__type-name">{type.name}</span>
              </div>
              <div
                className="branding__type-sample"
                style={{ fontFamily: type.family }}
              >
                {type.sample}
              </div>
              <p className="branding__type-desc">{type.description}</p>
              <div className="branding__type-weights">
                {type.weights.map(w => (
                  <span
                    key={w}
                    className="branding__type-weight"
                    style={{ fontFamily: type.family, fontWeight: w }}
                  >
                    {w}
                  </span>
                ))}
              </div>
              <div className="branding__type-alphabet" style={{ fontFamily: type.family }}>
                ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
                abcdefghijklmnopqrstuvwxyz<br />
                0123456789 !@#$%&*
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Style */}
      <section className="branding__section">
        <div className="branding__section-header">
          <h3>Visual Elements</h3>
          <p>Key design patterns and visual principles</p>
        </div>
        <div className="branding__elements">
          <div className="branding__element-card">
            <h4>Glassmorphism</h4>
            <div className="branding__demo branding__demo--glass">
              <div className="branding__glass-card">
                <span>Frosted Glass Card</span>
                <p>backdrop-filter: blur(10px)</p>
              </div>
            </div>
            <p>Semi-transparent cards with backdrop blur for depth and hierarchy</p>
          </div>

          <div className="branding__element-card">
            <h4>Amber Glow Effects</h4>
            <div className="branding__demo branding__demo--glow">
              <div className="branding__glow-box">
                <span>Hover to Glow</span>
              </div>
            </div>
            <p>Amber glow on interactive elements — borders, shadows, text</p>
          </div>

          <div className="branding__element-card">
            <h4>Grid Patterns</h4>
            <div className="branding__demo branding__demo--grid">
              <div className="branding__grid-overlay" />
              <span>Industrial Grid</span>
            </div>
            <p>Subtle grid overlays for technical, industrial aesthetic</p>
          </div>

          <div className="branding__element-card">
            <h4>Corner Brackets</h4>
            <div className="branding__demo branding__demo--brackets">
              <div className="branding__bracket-box">
                <span>Precision Framing</span>
              </div>
            </div>
            <p>Geometric accent lines at corners for an engineered feel</p>
          </div>
        </div>
      </section>

      {/* Do's and Don'ts */}
      <section className="branding__section">
        <div className="branding__section-header">
          <h3>Usage Guidelines</h3>
          <p>Maintain brand consistency across all touchpoints</p>
        </div>
        <div className="branding__guidelines">
          <div className="branding__guideline branding__guideline--do">
            <h4>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ width: 20, height: 20 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Do
            </h4>
            <ul>
              <li>Use Bebas Neue in all-caps for display text</li>
              <li>Maintain dark backgrounds with amber accents</li>
              <li>Apply glassmorphism for card hierarchy</li>
              <li>Use IBM Plex Mono for data and technical content</li>
              <li>Include subtle animations for interactivity</li>
              <li>Maintain high contrast for readability</li>
            </ul>
          </div>
          <div className="branding__guideline branding__guideline--dont">
            <h4>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: 20, height: 20 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Don't
            </h4>
            <ul>
              <li>Use light backgrounds as primary surfaces</li>
              <li>Mix brand amber with other warm accent colors</li>
              <li>Use rounded, playful design patterns</li>
              <li>Apply excessive decorative animations</li>
              <li>Use serif fonts or handwriting styles</li>
              <li>Reduce contrast below WCAG AA standards</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
