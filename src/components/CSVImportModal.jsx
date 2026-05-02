import { useState, useRef, useMemo } from 'react';
import { generateId } from '../data/initialData';
import {
  parseCSV,
  detectColumns,
  looksLikeHeader,
  parseDate,
  parseAmount,
  categorize,
  shouldSkip,
} from '../lib/csvImport';

// ─────────────────────────────────────────────────────────────────────
// CSVImportModal — paste/upload a bank CSV, review the auto-detected
// column mapping, edit any rows the categorizer got wrong, and bulk-
// insert as expense entries. Closes via onClose; on success calls
// onComplete(count) so the parent can show a confirmation.
//
// Three internal stages:
//   1. 'pick'     — file picker, no file selected yet
//   2. 'mapping'  — auto-detect failed for at least one column;
//                   user picks which CSV column is which manually
//   3. 'preview'  — auto-detect worked (or user finished mapping);
//                   show all rows with category + deductible flags
//                   editable, "Import N selected" button at bottom
// ─────────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Software', 'Hosting', 'Advertising', 'Office Supplies', 'Equipment', 'Travel', 'Meals', 'Insurance', 'Professional Services', 'Education', 'Subscriptions', 'Utilities', 'Rent', 'Vehicle', 'Phone', 'Internet', 'Bank Fees', 'Taxes Paid', 'Other'];
const TAX_WRITE_OFF_CATEGORIES = ['Business Use of Home', 'Vehicle/Mileage', 'Office Supplies', 'Software & Tools', 'Professional Development', 'Marketing & Advertising', 'Insurance Premiums', 'Travel & Meals (50%)', 'Professional Services', 'Equipment (Section 179)', 'Internet & Phone', 'Subscriptions', 'Other Deduction'];

function fmt(n) {
  return '$' + Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CSVImportModal({ onClose, onImport, onComplete }) {
  const [stage, setStage] = useState('pick');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState([]);     // 2D array from parseCSV
  const [hasHeader, setHasHeader] = useState(true);
  const [columns, setColumns] = useState({ date: -1, amount: -1, description: -1 });
  const [flipSign, setFlipSign] = useState(true); // expenses are negative in checking exports
  const [drafts, setDrafts] = useState([]);       // per-row import drafts
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // ── File pick + auto-detect ─────────────────────────────────────
  function handleFileSelect(file) {
    if (!file) return;
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = String(e.target.result || '');
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setError('CSV looks empty. Make sure you exported a transaction file.');
          return;
        }
        setRawRows(rows);
        const headerLikely = looksLikeHeader(rows[0]);
        setHasHeader(headerLikely);
        const detected = headerLikely ? detectColumns(rows[0]) : { date: -1, amount: -1, description: -1 };
        setColumns(detected);
        // If auto-detect worked, jump straight to preview.
        if (detected.date >= 0 && detected.amount >= 0 && detected.description >= 0) {
          buildDrafts(rows, headerLikely, detected, flipSign);
          setStage('preview');
        } else {
          setStage('mapping');
        }
      } catch (err) {
        setError('Could not parse the file: ' + (err?.message || 'unknown error'));
      }
    };
    reader.onerror = () => setError('Failed to read the file.');
    reader.readAsText(file);
  }

  // ── Build drafts from raw rows + column map ─────────────────────
  // One draft per data row. Skipped rows (transfers, deposits, bad
  // dates/amounts) get marked `skip: true` and unchecked by default.
  function buildDrafts(rows, headerOn, cols, flipSignFlag) {
    const dataRows = headerOn ? rows.slice(1) : rows;
    const out = dataRows.map((row, idx) => {
      const dateRaw = row[cols.date];
      const amountRaw = row[cols.amount];
      const descRaw = row[cols.description];
      const date = parseDate(dateRaw);
      let amount = parseAmount(amountRaw);
      let skip = false;
      let skipReason = '';
      if (!date) { skip = true; skipReason = 'unparseable date'; }
      if (amount === null) { skip = true; skipReason = 'unparseable amount'; }
      if (!skip) {
        // Apply sign convention — bank checking exports usually use
        // negatives for expenses, so flipSign means: keep negatives
        // as expenses, drop positives (deposits).
        if (flipSignFlag) {
          if (amount >= 0) { skip = true; skipReason = 'looks like a deposit'; }
          else amount = Math.abs(amount);
        } else {
          // Credit-card export: positives are charges, negatives are
          // payments / refunds — drop the negatives.
          if (amount < 0) { skip = true; skipReason = 'looks like a payment / refund'; }
        }
      }
      if (!skip && shouldSkip(descRaw)) {
        skip = true;
        skipReason = 'transfer or non-expense';
      }
      const cat = categorize(descRaw);
      return {
        id: 'draft-' + idx,
        rowIdx: idx,
        date: date || '',
        amount: amount || 0,
        description: (descRaw || '').trim(),
        category: cat.category,
        taxDeductible: cat.deductible,
        taxCategory: cat.taxCategory,
        skip,
        skipReason,
      };
    });
    setDrafts(out);
  }

  function handleColumnMappingDone() {
    if (columns.date < 0 || columns.amount < 0 || columns.description < 0) {
      setError('Pick a column for each of Date, Amount, and Description.');
      return;
    }
    setError('');
    buildDrafts(rawRows, hasHeader, columns, flipSign);
    setStage('preview');
  }

  function handleSignFlipChange(next) {
    setFlipSign(next);
    if (rawRows.length > 0 && stage === 'preview') {
      buildDrafts(rawRows, hasHeader, columns, next);
    }
  }

  // ── Per-row edits in preview ────────────────────────────────────
  function updateDraft(id, patch) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  function toggleSkip(id) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, skip: !d.skip } : d));
  }

  // ── Import ──────────────────────────────────────────────────────
  function handleImport() {
    const toInsert = drafts
      .filter(d => !d.skip && d.amount > 0 && d.date)
      .map(d => {
        const dateObj = new Date(d.date + 'T00:00:00');
        return {
          id: generateId(),
          type: 'expense',
          date: d.date,
          amount: d.amount,
          category: d.category || 'Other',
          description: d.description,
          paymentMethod: flipSign ? 'Bank Transfer' : 'Credit Card',
          taxDeductible: d.taxDeductible,
          taxCategory: d.taxDeductible ? d.taxCategory : '',
          notes: `Imported from ${fileName} on ${new Date().toISOString().slice(0, 10)}`,
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          createdAt: new Date().toISOString(),
        };
      });
    if (toInsert.length === 0) {
      setError('No rows selected for import.');
      return;
    }
    onImport(toInsert);
    if (onComplete) onComplete(toInsert.length);
    onClose();
  }

  const importableCount = useMemo(
    () => drafts.filter(d => !d.skip && d.amount > 0 && d.date).length,
    [drafts]
  );
  const importableTotal = useMemo(
    () => drafts.filter(d => !d.skip && d.amount > 0 && d.date).reduce((s, d) => s + d.amount, 0),
    [drafts]
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--wide"
        onClick={e => e.stopPropagation()}
        style={{ width: '95vw', maxWidth: 1100, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal__header" style={{ flexShrink: 0 }}>
          <div>
            <h2>Import Bank CSV</h2>
            <span className="modal__subtitle">
              {stage === 'pick'    && 'Upload a transaction CSV from your bank.'}
              {stage === 'mapping' && 'We couldn\'t auto-detect every column — pick them below.'}
              {stage === 'preview' && `${fileName} · ${drafts.length} row${drafts.length === 1 ? '' : 's'} parsed`}
            </span>
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {error && <div className="modal__error" style={{ marginBottom: 12 }}>{error}</div>}

          {/* ── Stage 1: file picker ── */}
          {stage === 'pick' && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '0.92rem', color: 'var(--slate)', marginBottom: 20, lineHeight: 1.6 }}>
                Export a transaction CSV from your bank&apos;s online portal — most banks offer this in
                Account Activity → Download / Export.<br />
                We&apos;ll auto-detect columns, categorize merchants, and let you review every row
                before saving.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={e => handleFileSelect(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <button className="btn btn--primary" onClick={() => fileRef.current?.click()}>
                Choose CSV file…
              </button>
            </div>
          )}

          {/* ── Stage 2: manual column mapping ── */}
          {stage === 'mapping' && (
            <div>
              <p style={{ fontSize: '0.88rem', color: 'var(--slate)', marginBottom: 16 }}>
                We didn&apos;t recognize the headers. Tell us which column is which:
              </p>
              <div className="form-grid">
                <ColumnPicker label="Date column" rows={rawRows} hasHeader={hasHeader} value={columns.date}
                  onChange={v => setColumns(c => ({ ...c, date: v }))} />
                <ColumnPicker label="Amount column" rows={rawRows} hasHeader={hasHeader} value={columns.amount}
                  onChange={v => setColumns(c => ({ ...c, amount: v }))} />
                <ColumnPicker label="Description column" rows={rawRows} hasHeader={hasHeader} value={columns.description}
                  onChange={v => setColumns(c => ({ ...c, description: v }))} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={e => setHasHeader(e.target.checked)}
                  style={{ width: 'auto', accentColor: 'var(--brand)' }}
                />
                The first row is a header (skip when importing)
              </label>
            </div>
          )}

          {/* ── Stage 3: preview + edit ── */}
          {stage === 'preview' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 0 14px 0', borderBottom: '1px solid var(--border)', marginBottom: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                  <input
                    type="radio"
                    name="signMode"
                    checked={flipSign}
                    onChange={() => handleSignFlipChange(true)}
                    style={{ width: 'auto', accentColor: 'var(--brand)' }}
                  />
                  Bank checking export (expenses are negative)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                  <input
                    type="radio"
                    name="signMode"
                    checked={!flipSign}
                    onChange={() => handleSignFlipChange(false)}
                    style={{ width: 'auto', accentColor: 'var(--brand)' }}
                  />
                  Credit card export (charges are positive)
                </label>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{importableCount}</strong> ready to import · <strong style={{ color: 'var(--ink)' }}>{fmt(importableTotal)}</strong> total
                </span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>
                      <input
                        type="checkbox"
                        checked={drafts.length > 0 && drafts.every(d => !d.skip)}
                        onChange={e => {
                          const all = e.target.checked;
                          setDrafts(prev => prev.map(d => ({ ...d, skip: !all })));
                        }}
                        title="Toggle all"
                      />
                    </th>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Deductible</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map(d => (
                    <tr
                      key={d.id}
                      style={{ opacity: d.skip ? 0.45 : 1 }}
                      title={d.skip ? `Skipped: ${d.skipReason || 'unchecked'}` : undefined}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={!d.skip}
                          onChange={() => toggleSkip(d.id)}
                        />
                      </td>
                      <td className="data-table__muted">{d.date || '—'}</td>
                      <td>
                        <input
                          type="text"
                          value={d.description}
                          onChange={e => updateDraft(d.id, { description: e.target.value })}
                          style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                        />
                      </td>
                      <td className="data-table__mono" style={{ textAlign: 'right' }}>{fmt(d.amount)}</td>
                      <td>
                        <select
                          value={d.category}
                          onChange={e => updateDraft(d.id, { category: e.target.value })}
                          style={{ fontSize: '0.82rem', padding: '4px 8px' }}
                        >
                          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={d.taxDeductible}
                          onChange={e => updateDraft(d.id, { taxDeductible: e.target.checked })}
                          style={{ accentColor: 'var(--brand)' }}
                        />
                        {d.taxDeductible && (
                          <select
                            value={d.taxCategory}
                            onChange={e => updateDraft(d.id, { taxCategory: e.target.value })}
                            style={{ fontSize: '0.78rem', padding: '2px 4px', marginLeft: 6, maxWidth: 130 }}
                          >
                            <option value="">Pick…</option>
                            {TAX_WRITE_OFF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="modal__footer" style={{ flexShrink: 0 }}>
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          {stage === 'mapping' && (
            <button className="btn btn--primary" onClick={handleColumnMappingDone}>
              Continue to preview
            </button>
          )}
          {stage === 'preview' && (
            <button
              className="btn btn--primary"
              onClick={handleImport}
              disabled={importableCount === 0}
            >
              Import {importableCount} {importableCount === 1 ? 'expense' : 'expenses'} · {fmt(importableTotal)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Picks one column from the parsed CSV. Header is shown as the option
// label when available; otherwise the column index. A small preview of
// the first data value is appended so the user knows which is which.
function ColumnPicker({ label, rows, hasHeader, value, onChange }) {
  const headerRow = hasHeader && rows.length > 0 ? rows[0] : null;
  const dataRow = hasHeader ? rows[1] : rows[0];
  const colCount = rows[0]?.length || 0;
  return (
    <div className="form-group">
      <label>{label} *</label>
      <select value={value} onChange={e => onChange(parseInt(e.target.value))}>
        <option value={-1}>Select…</option>
        {Array.from({ length: colCount }, (_, i) => {
          const headerLabel = headerRow?.[i] || `Column ${i + 1}`;
          const sample = dataRow?.[i] || '';
          return (
            <option key={i} value={i}>
              {headerLabel}{sample ? ` — “${String(sample).slice(0, 30)}”` : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
