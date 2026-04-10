import { useState } from 'react';

const brandColors = [
  { name: 'Orange (Primary)', hex: '#ff8c00', usage: 'Primary brand color, buttons, CTAs, active states' },
  { name: 'Orange Bright', hex: '#ffab40', usage: 'Hover states, gradient endpoints, highlights' },
  { name: 'Orange Deep', hex: '#e07800', usage: 'Pressed states, scrollbar, emphasis' },
  { name: 'Purple (Secondary)', hex: '#8f89fa', usage: 'Secondary accents, gradient endpoints, tags' },
  { name: 'Purple Dim', hex: '#6b66da', usage: 'Subtle secondary accents' },
  { name: 'Background Deep', hex: '#0e1017', usage: 'Page background, deepest surface' },
  { name: 'Background Base', hex: '#13141d', usage: 'Base surface, card backgrounds' },
  { name: 'Surface', hex: '#1a1b27', usage: 'Cards, panels, elevated surfaces' },
  { name: 'Surface Elevated', hex: '#222336', usage: 'Hover states, dropdowns, modals' },
  { name: 'Text Primary', hex: '#ffffff', usage: 'Headings, primary text, high emphasis' },
  { name: 'Text Secondary', hex: '#8e8da0', usage: 'Body text, descriptions, labels' },
  { name: 'Text Muted', hex: '#5a5b72', usage: 'Disabled text, placeholders, captions' },
  { name: 'Success', hex: '#33b887', usage: 'Success states, completed items, online status' },
  { name: 'Warning', hex: '#ffab40', usage: 'Warning states, pending items' },
  { name: 'Danger', hex: '#ff3b26', usage: 'Error states, destructive actions' },
  { name: 'Info', hex: '#3b82f6', usage: 'Info states, links, review items' },
];

const typographyItems = [
  {
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    role: 'Display / Headings',
    weights: ['400', '600', '700', '800'],
    sample: 'Clad Forge',
    description: 'Modern geometric sans-serif with tight letter-spacing (-1.5px to -2px on headings). Used for all display text, section titles, and hero headlines. Bold weights (700-800) create strong visual hierarchy on dark backgrounds.',
  },
  {
    name: 'Inter',
    family: "'Inter', sans-serif",
    role: 'Body / UI',
    weights: ['300', '400', '500', '600', '700'],
    sample: 'Systems That Work',
    description: 'Designed for computer screens by Rasmus Andersson. Features optical sizing, tabular numbers, and exceptional readability at all sizes. Used for body copy, navigation, buttons, and all interface text.',
  },
  {
    name: 'JetBrains Mono',
    family: "'JetBrains Mono', monospace",
    role: 'Data / Labels',
    weights: ['400', '500'],
    sample: '$45,000.00 — Phase 01',
    description: 'Premium monospace typeface for data display and technical labels. Used for financial figures, phase numbers, status indicators, and code-style tags. Uppercase with letter-spacing (1.5-2px) for labels.',
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
          <h2 className="branding__hero-title" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-1.5px' }}>CLAD FORGE</h2>
          <p className="branding__hero-tagline">Systems That Work</p>
          <div className="branding__hero-divider" />
          <p className="branding__hero-desc">
            Engineering-driven. Custom-built. Zero templates. Our brand combines
            the precision of engineering with a dark, premium aesthetic inspired by
            modern SaaS design — orange primary, purple secondary, glassmorphism surfaces.
          </p>
        </div>
        <div className="branding__hero-graphic">
          <div className="branding__forge-mark">
            <img src="/favicon.svg" alt="Clad Forge" style={{ width: 80, height: 80 }} />
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
              key={color.hex + color.name}
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
          <p>Three typefaces for different contexts — matching cladforge.com</p>
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
          <p>Key design patterns from cladforge.com</p>
        </div>
        <div className="branding__elements">
          <div className="branding__element-card">
            <h4>Glassmorphism Cards</h4>
            <div className="branding__demo branding__demo--glass">
              <div className="branding__glass-card">
                <span>Glass Surface</span>
                <p>rgba(255,255,255,0.04) + border</p>
              </div>
            </div>
            <p>Semi-transparent cards with subtle borders and inset highlight shadows on dark backgrounds</p>
          </div>

          <div className="branding__element-card">
            <h4>Orange Glow Effects</h4>
            <div className="branding__demo branding__demo--glow">
              <div className="branding__glow-box">
                <span>Hover to Glow</span>
              </div>
            </div>
            <p>Orange glow shadows on buttons and interactive elements (box-shadow with rgba(255,140,0))</p>
          </div>

          <div className="branding__element-card">
            <h4>Gradient Text</h4>
            <div className="branding__demo branding__demo--grid">
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: '1.4rem',
                background: 'linear-gradient(135deg, #ff8c00, #8f89fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Orange to Purple</span>
            </div>
            <p>Gradient text from orange primary to purple secondary for highlighted headings</p>
          </div>

          <div className="branding__element-card">
            <h4>Pill Buttons</h4>
            <div className="branding__demo branding__demo--brackets">
              <button className="btn btn--primary" style={{ pointerEvents: 'none' }}>Primary Action</button>
              <button className="btn btn--secondary" style={{ pointerEvents: 'none', marginLeft: 8 }}>Secondary</button>
            </div>
            <p>Fully rounded (border-radius: 100px) buttons with glow shadows matching Superlist style</p>
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
              <li>Use Plus Jakarta Sans (700-800) for headings with tight letter-spacing</li>
              <li>Maintain dark backgrounds with orange primary accents</li>
              <li>Apply glassmorphism for card and surface hierarchy</li>
              <li>Use JetBrains Mono for data, labels, and technical content</li>
              <li>Use pill-shaped buttons (border-radius: 100px)</li>
              <li>Apply orange-to-purple gradients for highlighted text</li>
              <li>Include subtle hover animations (translateY, glow shadows)</li>
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
              <li>Use light/white backgrounds as primary surfaces</li>
              <li>Mix brand orange with other warm accent colors (red, yellow)</li>
              <li>Use squared-off buttons (always pill-shaped)</li>
              <li>Apply heavy decorative animations that distract</li>
              <li>Use serif fonts for UI elements</li>
              <li>Reduce contrast below WCAG AA standards on dark surfaces</li>
              <li>Use borders heavier than 1-2px (keep them subtle)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
