// Bank-CSV import helpers.
//
// Three pieces:
//   1. parseCSV — RFC 4180-ish parser, handles quoted fields with
//      embedded commas / newlines / escaped double-quotes. Returns
//      a 2D array of strings (one inner array per row). No header
//      handling — caller decides whether row[0] is a header.
//
//   2. detectColumns — looks at the header row and tries to figure
//      out which column is the date, amount, and description. If a
//      column can't be identified, returns -1 so the caller can
//      fall back to a manual-mapping UI.
//
//   3. categorize — maps a transaction description to one of our
//      EXPENSE_CATEGORIES via a hand-curated keyword table. Also
//      sets a deductible flag for categories that are typically
//      tax write-offs (Software, Hosting, Subscriptions, Office,
//      Professional Services, Education, Travel, Insurance).
//
// Sign convention: most checking-account exports use negative
// amounts for outflows. Caller decides whether to flip signs (see
// the `flipSign` flag in CSVImportModal).
// ─────────────────────────────────────────────────────────────────────

// ── 1. Parser ──────────────────────────────────────────────────────
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        // Escaped double-quote inside a quoted field.
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    // Not in quotes
    if (c === '"' && field === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r' || c === '\n') {
      row.push(field);
      field = '';
      // Skip CRLF as a single newline.
      if (c === '\r' && text[i + 1] === '\n') i++;
      // Drop completely-empty rows (single field, empty).
      if (!(row.length === 1 && row[0] === '')) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Final field / row at EOF without trailing newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
  }
  return rows;
}

// ── 2. Column detection ────────────────────────────────────────────
// Header keywords — matched case-insensitively, longest-first so
// "Posted Date" wins over plain "date" when both could apply.
const DATE_KEYS = ['posted date', 'transaction date', 'trans date', 'date'];
const AMOUNT_KEYS = ['amount', 'debit', 'credit', 'amt'];
const DESC_KEYS = ['description', 'memo', 'merchant', 'payee', 'name', 'details'];

function findKey(headerRow, keys) {
  const lower = headerRow.map(h => (h || '').toLowerCase().trim());
  for (const key of keys) {
    const idx = lower.findIndex(h => h === key);
    if (idx !== -1) return idx;
  }
  // Fallback: substring match for things like "Trans. Date".
  for (const key of keys) {
    const idx = lower.findIndex(h => h.includes(key));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function detectColumns(headerRow) {
  return {
    date: findKey(headerRow, DATE_KEYS),
    amount: findKey(headerRow, AMOUNT_KEYS),
    description: findKey(headerRow, DESC_KEYS),
  };
}

// True if the first row of the CSV looks like a header (any cell
// matches one of our known keywords). If false, the caller can
// assume row[0] is data and map columns by position.
export function looksLikeHeader(row) {
  if (!row || row.length === 0) return false;
  const lower = row.map(c => (c || '').toLowerCase().trim());
  const allKeys = [...DATE_KEYS, ...AMOUNT_KEYS, ...DESC_KEYS];
  return lower.some(c => allKeys.some(k => c.includes(k)));
}

// ── 3. Date parsing ────────────────────────────────────────────────
// Handle the three common formats: ISO (YYYY-MM-DD), US (MM/DD/YYYY),
// and dotted EU (DD.MM.YYYY). Returns YYYY-MM-DD or null. Falls back
// to Date.parse for anything else recognizable.
export function parseDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // US MM/DD/YYYY (default for US-based tooling)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const yyyy = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${yyyy}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  // EU DD.MM.YYYY
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const yyyy = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // Last-ditch: let JS try.
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

// ── 4. Amount parsing ──────────────────────────────────────────────
// Strips $, commas, parens (which some banks use for negatives),
// returns a number (preserving sign).
export function parseAmount(input) {
  if (input === null || input === undefined || input === '') return null;
  let s = String(input).trim();
  let negative = false;
  // (1234.56) → -1234.56
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  // Strip currency symbols and thousand separators.
  s = s.replace(/[$,\s]/g, '');
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

// ── 5. Categorizer ─────────────────────────────────────────────────
// Hand-curated rules. First match wins; order from most specific to
// least. Categories must match the EXPENSE_CATEGORIES list in
// pages/Finances.jsx so the existing form/filter logic keeps working.
const RULES = [
  // Hosting / cloud infra
  { match: /amazon web services|\baws\b/i,                 category: 'Hosting',                deductible: true,  taxCategory: 'Software & Tools' },
  { match: /\bvercel\b/i,                                  category: 'Hosting',                deductible: true,  taxCategory: 'Software & Tools' },
  { match: /cloudflare/i,                                  category: 'Hosting',                deductible: true,  taxCategory: 'Software & Tools' },
  { match: /digitalocean|linode|netlify|fly\.io|render/i,  category: 'Hosting',                deductible: true,  taxCategory: 'Software & Tools' },
  { match: /supabase|firebase|planetscale|mongodb atlas/i, category: 'Hosting',                deductible: true,  taxCategory: 'Software & Tools' },
  // Software & SaaS
  { match: /\badobe\b/i,                                   category: 'Software',               deductible: true,  taxCategory: 'Software & Tools' },
  { match: /github|gitlab|bitbucket/i,                     category: 'Software',               deductible: true,  taxCategory: 'Software & Tools' },
  { match: /microsoft|office 365|microsoft 365/i,          category: 'Software',               deductible: true,  taxCategory: 'Software & Tools' },
  { match: /google workspace|g suite/i,                    category: 'Software',               deductible: true,  taxCategory: 'Software & Tools' },
  { match: /notion|figma|linear|slack|asana|trello/i,      category: 'Software',               deductible: true,  taxCategory: 'Software & Tools' },
  { match: /openai|anthropic|cursor|claude/i,              category: 'Software',               deductible: true,  taxCategory: 'Software & Tools' },
  { match: /apple\.com|spotify|netflix|youtube premium/i,  category: 'Subscriptions',          deductible: false },
  // Bank fees
  { match: /\bstripe\b|paypal.*fee|merchant fee/i,         category: 'Bank Fees',              deductible: true,  taxCategory: 'Other Deduction' },
  { match: /atm fee|wire fee|service charge|overdraft/i,   category: 'Bank Fees',              deductible: true,  taxCategory: 'Other Deduction' },
  // Office supplies
  { match: /office depot|staples|amazon\.com|amzn/i,       category: 'Office Supplies',        deductible: true,  taxCategory: 'Office Supplies' },
  { match: /\busps\b|fedex|\bups\b|dhl/i,                  category: 'Office Supplies',        deductible: true,  taxCategory: 'Office Supplies' },
  // Travel
  { match: /\buber\b|\blyft\b/i,                           category: 'Travel',                 deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  { match: /delta air|american airlines|united airlines|southwest|jetblue|alaska air/i,
                                                           category: 'Travel',                 deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  { match: /marriott|hilton|hyatt|airbnb|holiday inn/i,    category: 'Travel',                 deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  { match: /enterprise rent|hertz|avis|budget rent/i,      category: 'Travel',                 deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  // Vehicle / fuel
  { match: /shell oil|chevron|exxon|mobil|valero|sunoco|bp /i, category: 'Vehicle',           deductible: true,  taxCategory: 'Vehicle/Mileage' },
  // Phone / Internet
  { match: /verizon|at&t|t-mobile|sprint|mint mobile/i,    category: 'Phone',                  deductible: true,  taxCategory: 'Internet & Phone' },
  { match: /comcast|spectrum|xfinity|cox communications|att fiber|google fiber/i,
                                                           category: 'Internet',               deductible: true,  taxCategory: 'Internet & Phone' },
  // Meals (rough — restaurants vary widely)
  { match: /starbucks|dunkin|coffee/i,                     category: 'Meals',                  deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  { match: /\b(restaurant|grill|kitchen|cafe|deli|pizza|sushi|bbq|tacos?|chipotle|panera)\b/i,
                                                           category: 'Meals',                  deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  { match: /doordash|grubhub|uber eats|caviar/i,           category: 'Meals',                  deductible: true,  taxCategory: 'Travel & Meals (50%)' },
  // Professional services
  { match: /quickbooks|gusto|adp/i,                        category: 'Professional Services',  deductible: true,  taxCategory: 'Professional Services' },
  { match: /\bcpa\b|accountant|attorney|legal/i,           category: 'Professional Services',  deductible: true,  taxCategory: 'Professional Services' },
  // Insurance
  { match: /insurance/i,                                   category: 'Insurance',              deductible: true,  taxCategory: 'Insurance Premiums' },
  // Education
  { match: /udemy|coursera|pluralsight|frontend masters|egghead|skillshare/i,
                                                           category: 'Education',              deductible: true,  taxCategory: 'Professional Development' },
  // Taxes paid (so we don't double-count as deductible)
  { match: /\birs\b|treasury|state tax|tax payment/i,      category: 'Taxes Paid',             deductible: false },
  // Advertising / marketing
  { match: /facebook ads|meta ads|google ads|linkedin ads/i, category: 'Advertising',          deductible: true,  taxCategory: 'Marketing & Advertising' },
];

export function categorize(description) {
  const desc = (description || '').trim();
  if (!desc) return { category: 'Other', deductible: false, taxCategory: '' };
  for (const rule of RULES) {
    if (rule.match.test(desc)) {
      return { category: rule.category, deductible: rule.deductible, taxCategory: rule.taxCategory || '' };
    }
  }
  return { category: 'Other', deductible: false, taxCategory: '' };
}

// Skip rules — rows whose description matches these are dropped from
// import (internal transfers, credit card payments, deposits flagged
// as such). The default flow already drops positive amounts on
// flipSign mode; this is a belt-and-suspenders second filter.
const SKIP_PATTERNS = [
  /\btransfer\b/i,
  /credit card payment/i,
  /payment from|payment to.*card/i,
  /balance forward/i,
  /\bdeposit\b/i,
  /\bzelle\b/i,        // person-to-person, almost never an expense
  /\bvenmo\b/i,
  /interest paid/i,
];

export function shouldSkip(description) {
  const desc = (description || '').trim();
  if (!desc) return true;
  return SKIP_PATTERNS.some(p => p.test(desc));
}
