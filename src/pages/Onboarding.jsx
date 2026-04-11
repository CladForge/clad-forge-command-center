import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from '../data/initialData';

const INDUSTRIES = [
  'Construction', 'Energy & Utilities', 'Manufacturing', 'Logistics',
  'Oil & Gas', 'Engineering Services', 'Telecommunications', 'Technology',
  'Healthcare', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const BRAND_TONES = ['Professional', 'Casual', 'Technical', 'Friendly', 'Bold', 'Minimal'];

const PROJECT_TYPES = [
  'Website Design', 'Web Application', 'Mobile App', 'Custom Software',
  'AI Integration', 'System Audit', 'API Development', 'Other',
];

const BUDGET_RANGES = [
  'Under $5K', '$5K-$15K', '$15K-$30K', '$30K-$50K', '$50K-$100K', '$100K+',
];

const TIMELINES = ['ASAP', '1-3 months', '3-6 months', '6-12 months', 'No rush'];

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0e1017',
    fontFamily: "'DM Sans', sans-serif",
    color: '#e8e6e1',
    padding: '40px 16px',
    boxSizing: 'border-box',
  },
  card: {
    maxWidth: 680,
    margin: '0 auto',
    padding: 40,
  },
  logo: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 36,
    color: '#ff8c00',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(232,230,225,0.5)',
    fontSize: 14,
    marginBottom: 36,
  },
  stepBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 0,
  },
  stepCircle: (active, done) => ({
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
    background: active ? '#ff8c00' : done ? 'rgba(255,140,0,0.25)' : 'rgba(255,255,255,0.06)',
    color: active ? '#000' : done ? '#ff8c00' : 'rgba(255,255,255,0.3)',
    border: active ? '2px solid #ff8c00' : done ? '2px solid rgba(255,140,0,0.4)' : '2px solid rgba(255,255,255,0.08)',
    transition: 'all 0.3s',
  }),
  stepLine: (done) => ({
    width: 48,
    height: 2,
    background: done ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.08)',
    transition: 'background 0.3s',
  }),
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },
  sectionDesc: {
    color: 'rgba(232,230,225,0.5)',
    fontSize: 14,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(232,230,225,0.7)',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    width: '100%',
    background: '#1a1d27',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e8e6e1',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    background: '#1a1d27',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e8e6e1',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'none',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    background: '#1a1d27',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e8e6e1',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: 100,
    resize: 'vertical',
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  btnPrimary: {
    background: '#ff8c00',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#ff8c00',
    border: '1px solid #ff8c00',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: '#1a1d27',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'border-color 0.2s',
  },
  checkboxChecked: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: 'rgba(255,140,0,0.08)',
    border: '1px solid rgba(255,140,0,0.4)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  colorRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  colorItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  colorInput: {
    width: 56,
    height: 56,
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    cursor: 'pointer',
    background: 'none',
    padding: 0,
  },
  colorLabel: {
    fontSize: 12,
    color: 'rgba(232,230,225,0.5)',
  },
  reviewSection: {
    marginBottom: 24,
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ff8c00',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewEdit: {
    fontSize: 12,
    color: '#ff8c00',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'underline',
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: 14,
  },
  reviewLabel: {
    color: 'rgba(232,230,225,0.5)',
  },
  reviewValue: {
    color: '#e8e6e1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word',
  },
  successWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(255,140,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    animation: 'popIn 0.5s ease',
  },
  checkMark: {
    fontSize: 40,
    color: '#ff8c00',
  },
  required: {
    color: '#ff8c00',
    marginLeft: 2,
  },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    companyName: '', companyWebsite: '', industry: '', companySize: '',
    primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '', primaryContactTitle: '',
    brandColors: ['#ff8c00', '#1a1d27', '#e8e6e1'],
    brandFonts: { heading: '', body: '' },
    brandTone: '',
    projectTypes: [],
    projectDescription: '', budgetRange: '', timeline: '',
  });

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function setColor(index, value) {
    setForm(prev => {
      const colors = [...prev.brandColors];
      colors[index] = value;
      return { ...prev, brandColors: colors };
    });
  }

  function setFont(key, value) {
    setForm(prev => ({
      ...prev,
      brandFonts: { ...prev.brandFonts, [key]: value },
    }));
  }

  function toggleProjectType(type) {
    setForm(prev => {
      const arr = prev.projectTypes.includes(type)
        ? prev.projectTypes.filter(t => t !== type)
        : [...prev.projectTypes, type];
      return { ...prev, projectTypes: arr };
    });
  }

  function validateStep() {
    const errs = {};
    if (step === 1) {
      if (!form.companyName.trim()) errs.companyName = 'Company name is required';
    } else if (step === 2) {
      if (!form.primaryContactName.trim()) errs.primaryContactName = 'Name is required';
      if (!form.primaryContactEmail.trim()) errs.primaryContactEmail = 'Email is required';
      else if (!emailRegex.test(form.primaryContactEmail)) errs.primaryContactEmail = 'Invalid email format';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep()) setStep(s => Math.min(s + 1, 5));
  }

  function prev() {
    setStep(s => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('onboarding_submissions').insert({
        id: generateId(),
        company_name: form.companyName,
        company_website: form.companyWebsite,
        industry: form.industry,
        company_size: form.companySize,
        primary_contact_name: form.primaryContactName,
        primary_contact_email: form.primaryContactEmail,
        primary_contact_phone: form.primaryContactPhone,
        primary_contact_title: form.primaryContactTitle,
        brand_colors: form.brandColors,
        brand_fonts: form.brandFonts,
        brand_tone: form.brandTone,
        project_types: form.projectTypes,
        project_description: form.projectDescription,
        budget_range: form.budgetRange,
        timeline: form.timeline,
        status: 'pending',
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderInput(label, field, opts = {}) {
    const { required: req, type = 'text', placeholder } = opts;
    return (
      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          {label}{req && <span style={styles.required}>*</span>}
        </label>
        <input
          type={type}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder || ''}
          style={{
            ...styles.input,
            borderColor: errors[field] ? '#ff4444' : 'rgba(255,255,255,0.08)',
          }}
        />
        {errors[field] && (
          <div style={{ color: '#ff4444', fontSize: 12, marginTop: 4 }}>{errors[field]}</div>
        )}
      </div>
    );
  }

  function renderSelect(label, field, options, opts = {}) {
    const { required: req } = opts;
    return (
      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          {label}{req && <span style={styles.required}>*</span>}
        </label>
        <select
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          style={styles.select}
        >
          <option value="">Select...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  function renderStepIndicator() {
    const labels = ['Company', 'Contact', 'Brand', 'Project', 'Review'];
    return (
      <div style={styles.stepBar}>
        {labels.map((label, i) => {
          const num = i + 1;
          const active = num === step;
          const done = num < step;
          return (
            <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={styles.stepLine(done)} />}
              <div
                style={styles.stepCircle(active, done)}
                title={label}
              >
                {done ? '\u2713' : num}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderStep1() {
    return (
      <>
        <h2 style={styles.sectionTitle}>Company Information</h2>
        <p style={styles.sectionDesc}>Tell us about your business.</p>
        {renderInput('Company Name', 'companyName', { required: true, placeholder: 'Acme Corp' })}
        {renderInput('Company Website', 'companyWebsite', { placeholder: 'https://example.com' })}
        {renderSelect('Industry', 'industry', INDUSTRIES)}
        {renderSelect('Company Size', 'companySize', COMPANY_SIZES)}
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <h2 style={styles.sectionTitle}>Primary Contact</h2>
        <p style={styles.sectionDesc}>Who should we reach out to?</p>
        <div style={styles.row}>
          <div style={styles.col}>
            {renderInput('Full Name', 'primaryContactName', { required: true, placeholder: 'Jane Smith' })}
          </div>
          <div style={styles.col}>
            {renderInput('Title / Role', 'primaryContactTitle', { placeholder: 'CTO' })}
          </div>
        </div>
        {renderInput('Email', 'primaryContactEmail', { required: true, type: 'email', placeholder: 'jane@example.com' })}
        {renderInput('Phone', 'primaryContactPhone', { type: 'tel', placeholder: '(555) 123-4567' })}
      </>
    );
  }

  function renderStep3() {
    const colorLabels = ['Primary', 'Secondary', 'Accent'];
    return (
      <>
        <h2 style={styles.sectionTitle}>Brand Preferences</h2>
        <p style={styles.sectionDesc}>Help us understand your visual identity.</p>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Brand Colors</label>
          <div style={styles.colorRow}>
            {colorLabels.map((lbl, i) => (
              <div key={lbl} style={styles.colorItem}>
                <input
                  type="color"
                  value={form.brandColors[i]}
                  onChange={e => setColor(i, e.target.value)}
                  style={styles.colorInput}
                />
                <span style={styles.colorLabel}>{lbl}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(232,230,225,0.4)' }}>
                  {form.brandColors[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.col}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Heading Font</label>
              <input
                type="text"
                value={form.brandFonts.heading}
                onChange={e => setFont('heading', e.target.value)}
                placeholder="e.g. Montserrat"
                style={styles.input}
              />
            </div>
          </div>
          <div style={styles.col}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Body Font</label>
              <input
                type="text"
                value={form.brandFonts.body}
                onChange={e => setFont('body', e.target.value)}
                placeholder="e.g. Open Sans"
                style={styles.input}
              />
            </div>
          </div>
        </div>
        {renderSelect('Brand Tone', 'brandTone', BRAND_TONES)}
      </>
    );
  }

  function renderStep4() {
    return (
      <>
        <h2 style={styles.sectionTitle}>Project Needs</h2>
        <p style={styles.sectionDesc}>What can we help you build?</p>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Project Types (select all that apply)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {PROJECT_TYPES.map(type => {
              const checked = form.projectTypes.includes(type);
              return (
                <div
                  key={type}
                  style={checked ? styles.checkboxChecked : styles.checkbox}
                  onClick={() => toggleProjectType(type)}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: checked ? '2px solid #ff8c00' : '2px solid rgba(255,255,255,0.15)',
                    background: checked ? '#ff8c00' : 'transparent',
                    color: '#000', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {checked ? '\u2713' : ''}
                  </span>
                  {type}
                </div>
              );
            })}
          </div>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Project Description</label>
          <textarea
            value={form.projectDescription}
            onChange={e => set('projectDescription', e.target.value)}
            placeholder="Briefly describe what you need built..."
            style={styles.textarea}
          />
        </div>
        <div style={styles.row}>
          <div style={styles.col}>
            {renderSelect('Budget Range', 'budgetRange', BUDGET_RANGES)}
          </div>
          <div style={styles.col}>
            {renderSelect('Timeline', 'timeline', TIMELINES)}
          </div>
        </div>
      </>
    );
  }

  function renderReviewRow(label, value) {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const display = Array.isArray(value) ? value.join(', ') : value;
    return (
      <div style={styles.reviewRow}>
        <span style={styles.reviewLabel}>{label}</span>
        <span style={styles.reviewValue}>{display}</span>
      </div>
    );
  }

  function renderStep5() {
    return (
      <>
        <h2 style={styles.sectionTitle}>Review & Submit</h2>
        <p style={styles.sectionDesc}>Please confirm everything looks correct.</p>

        <div style={styles.reviewSection}>
          <div style={styles.reviewHeader}>
            <span style={styles.reviewTitle}>Company</span>
            <button style={styles.reviewEdit} onClick={() => setStep(1)}>Edit</button>
          </div>
          {renderReviewRow('Company', form.companyName)}
          {renderReviewRow('Website', form.companyWebsite)}
          {renderReviewRow('Industry', form.industry)}
          {renderReviewRow('Size', form.companySize)}
        </div>

        <div style={styles.reviewSection}>
          <div style={styles.reviewHeader}>
            <span style={styles.reviewTitle}>Contact</span>
            <button style={styles.reviewEdit} onClick={() => setStep(2)}>Edit</button>
          </div>
          {renderReviewRow('Name', form.primaryContactName)}
          {renderReviewRow('Email', form.primaryContactEmail)}
          {renderReviewRow('Phone', form.primaryContactPhone)}
          {renderReviewRow('Title', form.primaryContactTitle)}
        </div>

        <div style={styles.reviewSection}>
          <div style={styles.reviewHeader}>
            <span style={styles.reviewTitle}>Brand</span>
            <button style={styles.reviewEdit} onClick={() => setStep(3)}>Edit</button>
          </div>
          <div style={{ ...styles.reviewRow, alignItems: 'center' }}>
            <span style={styles.reviewLabel}>Colors</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {form.brandColors.map((c, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: c, border: '1px solid rgba(255,255,255,0.15)',
                }} />
              ))}
            </div>
          </div>
          {renderReviewRow('Heading Font', form.brandFonts.heading)}
          {renderReviewRow('Body Font', form.brandFonts.body)}
          {renderReviewRow('Tone', form.brandTone)}
        </div>

        <div style={styles.reviewSection}>
          <div style={styles.reviewHeader}>
            <span style={styles.reviewTitle}>Project</span>
            <button style={styles.reviewEdit} onClick={() => setStep(4)}>Edit</button>
          </div>
          {renderReviewRow('Types', form.projectTypes)}
          {renderReviewRow('Description', form.projectDescription)}
          {renderReviewRow('Budget', form.budgetRange)}
          {renderReviewRow('Timeline', form.timeline)}
        </div>
      </>
    );
  }

  function renderSuccess() {
    return (
      <div style={styles.successWrap}>
        <style>{`
          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={styles.checkCircle}>
          <span style={styles.checkMark}>{'\u2713'}</span>
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 32,
          color: '#ff8c00',
          letterSpacing: 4,
          marginBottom: 16,
          animation: 'fadeUp 0.6s ease 0.2s both',
        }}>
          CLAD FORGE
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 12,
          animation: 'fadeUp 0.6s ease 0.35s both',
        }}>
          Thank you, {form.primaryContactName || 'friend'}!
        </h2>
        <p style={{
          color: 'rgba(232,230,225,0.6)',
          fontSize: 16,
          maxWidth: 400,
          lineHeight: 1.6,
          animation: 'fadeUp 0.6s ease 0.5s both',
        }}>
          We've received your information and will be in touch within 24 hours.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          {renderSuccess()}
        </div>
      </div>
    );
  }

  const stepRenderers = { 1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4, 5: renderStep5 };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>CLAD FORGE</div>
        <p style={styles.subtitle}>Client Onboarding</p>
        {renderStepIndicator()}
        {stepRenderers[step]()}
        <div style={styles.btnRow}>
          {step > 1 ? (
            <button style={styles.btnSecondary} onClick={prev}>Back</button>
          ) : (
            <div />
          )}
          {step < 5 ? (
            <button style={styles.btnPrimary} onClick={next}>Continue</button>
          ) : (
            <button
              style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
