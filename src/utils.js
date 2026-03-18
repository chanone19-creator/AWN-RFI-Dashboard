/**
 * AWN RFI Dashboard - Utility Functions
 * Pure helper functions extracted for testability
 */

const PAGE_SIZE = 50;

// Interference tier lookup — single source of truth for both badge class and level label.
// Order matters: more-specific patterns (>= -90, -105) must precede less-specific (-100).
const INF_TIERS = [
  { pattern: '>= -90', level: 'INF≥-90',       badge: 'badge-inf90'  },
  { pattern: '-105',   level: '-105≤INF<-100',  badge: 'badge-inf105' },
  { pattern: '-100',   level: '-100≤INF<-90',   badge: 'badge-inf100' },
];
const INF_UNKNOWN_LEVEL = 'ไม่ระบุ';
// Derived from the '-105' tier so it stays in sync if that tier's badge ever changes
const INF_UNKNOWN_BADGE = INF_TIERS.find(t => t.pattern === '-105').badge;

// Ordered list of all interference levels (highest priority first)
const INF_LEVELS = ['INF≥-90', '-100≤INF<-90', '-105≤INF<-100', INF_UNKNOWN_LEVEL];
const INF_PRIORITY = { 'INF≥-90': 3, '-100≤INF<-90': 2, '-105≤INF<-100': 1, [INF_UNKNOWN_LEVEL]: 0 };

// Brand keyword map — hoisted so it is allocated once, not on every matchBrands() call
const BRAND_MAP = [
  ['L-VISION',   'l-vision'],  ['L-VISION',   'l vision'],
  ['Be Well',    'be well'],   ['Be Well',    'bewell'],
  ['FnK Vision', 'fnk'],
  ['FOFU',       'fofu'],      ['FOFO',       'fofo'],
  ['HVISION',    'hvision'],   ['PIXELS',     'pixel'],
  ['SriHome',    'srihome'],   ['WiSTINO',    'wistino'],
  ['WORLDTECH',  'worldtech'], ['GLSCAM',     'glscam'],
  ['No-Brand',   'no-brand'],  ['No-Brand',   'no brand'],
];

/**
 * Determine row status: 'done' if action is filled, else 'pending'
 * @param {Object} row
 * @returns {'done'|'pending'}
 */
function getStatus(row) {
  return (row.action && row.action.trim()) ? 'done' : 'pending';
}

/**
 * Find the matching interference tier for a raw interference string.
 * Returns null when inf is falsy or no pattern matches.
 * @param {string|null|undefined} inf
 * @returns {{pattern:string, level:string, badge:string}|null}
 */
function getTier(inf) {
  if (!inf) return null;
  return INF_TIERS.find(t => inf.includes(t.pattern)) || null;
}

/**
 * Return CSS badge class based on interference level string
 * @param {string|null|undefined} inf
 * @returns {string}
 */
function getInfClass(inf) {
  const tier = getTier(inf);
  return tier ? tier.badge : INF_UNKNOWN_BADGE;
}

/**
 * Map interference string to display level label
 * @param {string|null|undefined} inf
 * @returns {string}
 */
function getInfLevel(inf) {
  const tier = getTier(inf);
  return tier ? tier.level : INF_UNKNOWN_LEVEL;
}

/**
 * Clean coordinator name: take first token, strip '@'
 * @param {string|null|undefined} name
 * @returns {string}
 */
function cleanCoord(name) {
  if (!name) return '';
  return name.trim().split(' ')[0].replace('@', '');
}

/**
 * Clean cause text: collapse newlines/spaces, truncate to 50 chars
 * @param {string|null|undefined} cause
 * @returns {string}
 */
function cleanCause(cause) {
  if (!cause) return '';
  return cause.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim().substring(0, 50);
}

/**
 * Calculate pagination page range with ellipsis
 * @param {number} currentPage
 * @param {number} pages - total pages
 * @returns {Array<number|string>}
 */
function calcPageRange(currentPage, pages) {
  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }
  return range;
}

/**
 * Validate page navigation: return the requested page number or null if out of range
 * @param {number} p - requested page
 * @param {number} totalItems
 * @returns {number|null} new page number, or null if invalid
 */
function validatePageNav(p, totalItems) {
  const pages = Math.ceil(totalItems / PAGE_SIZE);
  if (p < 1 || p > pages) return null;
  return p;
}

/**
 * Filter data rows by status and search string
 * @param {Array} data
 * @param {string} currentFilter - 'all'|'done'|'pending'|'inf90'|'inf100'
 * @param {string} search - lowercase search term
 * @returns {Array}
 */
function filterData(data, currentFilter, search) {
  return data.filter(r => {
    if (currentFilter === 'done'    && getStatus(r) !== 'done')                                    return false;
    if (currentFilter === 'pending' && getStatus(r) !== 'pending')                                 return false;
    if (currentFilter === 'inf90'   && getInfLevel(r.interference || '') !== 'INF≥-90')            return false;
    if (currentFilter === 'inf100'  && getInfLevel(r.interference || '') !== '-100≤INF<-90')       return false;
    if (search) {
      const haystack = [r.siteCode, r.cellName, r.province, r.amphur, r.tumbol, r.cause, r.coordAWN]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/**
 * Compute KPI summary from data array in a single pass
 * @param {Array} data
 * @returns {{ total: number, done: number, pending: number, identified: number, pct: number }}
 */
function computeKPI(data) {
  let done = 0, identified = 0;
  data.forEach(r => {
    if (getStatus(r) === 'done') done++;
    if (r.cause && r.cause.trim()) identified++;
  });
  const total = data.length;
  const pct = total ? Math.round(done / total * 100) : 0;
  return { total, done, pending: total - done, identified, pct };
}

/**
 * Deduplicate sites by worst interference level (highest priority)
 * @param {Array} data
 * @returns {Object} counts per level
 */
function computeSiteLevelCounts(data) {
  const siteLevel = {};
  data.forEach(r => {
    const site = r.siteCode;
    if (!site) return;
    const lv = getInfLevel(r.interference || '');
    if (!siteLevel[site] || INF_PRIORITY[lv] > INF_PRIORITY[siteLevel[site]]) {
      siteLevel[site] = lv;
    }
  });
  const counts = Object.fromEntries(INF_LEVELS.map(l => [l, 0]));
  Object.values(siteLevel).forEach(lv => { counts[lv]++; });
  return counts;
}

/**
 * Map brand keywords in cause string to brand names.
 * Input is normalised to lowercase internally.
 * @param {string} causeText
 * @returns {string[]} list of matched brand names
 */
function matchBrands(causeText) {
  const lower = (causeText || '').toLowerCase();
  const found = new Set();
  BRAND_MAP.forEach(([brand, key]) => {
    if (lower.includes(key)) found.add(brand);
  });
  return Array.from(found);
}

/**
 * Format interference string for display in table (replaces ASCII symbols with Unicode)
 * @param {string|null|undefined} inf
 * @returns {string}
 */
function formatInfLabel(inf) {
  return (inf || 'N/A').replace('=<INF<', '≤INF<').replace('>= ', '≥');
}

// ============================================================
// VIEW COUNT
// ============================================================
const VIEW_COUNT_KEY = 'awn_rfi_view_count';

// Default storage: browser's localStorage when available, null otherwise.
// Pass a custom storage object in tests to avoid touching real localStorage.
/* istanbul ignore next */
function _defaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

/**
 * Read the current cumulative page-view count from storage.
 * Returns 0 for null storage, missing key, or non-numeric stored value.
 * @param {Storage|{getItem:Function,setItem:Function}|null} [storage]
 * @returns {number}
 */
function getViewCount(storage) {
  /* istanbul ignore next */
  const store = storage !== undefined ? storage : _defaultStorage();
  if (!store) return 0;
  const n = parseInt(store.getItem(VIEW_COUNT_KEY) || '0', 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Increment the page-view count in storage and return the new total.
 * @param {Storage|{getItem:Function,setItem:Function}|null} [storage]
 * @returns {number} updated count
 */
function incrementViewCount(storage) {
  /* istanbul ignore next */
  const store = storage !== undefined ? storage : _defaultStorage();
  if (!store) return 0;
  const count = getViewCount(store) + 1;
  store.setItem(VIEW_COUNT_KEY, String(count));
  return count;
}

/**
 * Reset the page-view count to zero (useful for testing / admin reset).
 * @param {Storage|{getItem:Function,setItem:Function}|null} [storage]
 */
function resetViewCount(storage) {
  /* istanbul ignore next */
  const store = storage !== undefined ? storage : _defaultStorage();
  if (!store) return;
  store.setItem(VIEW_COUNT_KEY, '0');
}

module.exports = {
  PAGE_SIZE,
  VIEW_COUNT_KEY,
  INF_TIERS,
  INF_LEVELS,
  INF_PRIORITY,
  BRAND_MAP,
  getStatus,
  getTier,
  getInfClass,
  getInfLevel,
  cleanCoord,
  cleanCause,
  calcPageRange,
  validatePageNav,
  filterData,
  computeKPI,
  computeSiteLevelCounts,
  matchBrands,
  formatInfLabel,
  getViewCount,
  incrementViewCount,
  resetViewCount,
};
