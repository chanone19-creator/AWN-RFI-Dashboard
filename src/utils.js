/**
 * AWN RFI Dashboard - Utility Functions
 * Pure helper functions extracted for testability
 */

const PAGE_SIZE = 50;

/**
 * Determine row status: 'done' if action is filled, else 'pending'
 * @param {Object} row
 * @returns {'done'|'pending'}
 */
function getStatus(row) {
  return (row.action && row.action.trim()) ? 'done' : 'pending';
}

/**
 * Return CSS badge class based on interference level string
 * @param {string|null|undefined} inf
 * @returns {string}
 */
function getInfClass(inf) {
  if (!inf) return 'badge-inf105';
  if (inf.includes('>= -90')) return 'badge-inf90';
  if (inf.includes('-105')) return 'badge-inf105';
  if (inf.includes('-100')) return 'badge-inf100';
  return 'badge-inf105';
}

/**
 * Map interference string to display level label
 * @param {string|null|undefined} inf
 * @returns {string}
 */
function getInfLevel(inf) {
  if (!inf) return 'ไม่ระบุ';
  if (inf.includes('>= -90')) return 'INF≥-90';
  if (inf.includes('-105'))   return '-105≤INF<-100';
  if (inf.includes('-100'))   return '-100≤INF<-90';
  return 'ไม่ระบุ';
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
 * Validate page navigation: return new page number or current if out of range
 * @param {number} p - requested page
 * @param {number} currentPage
 * @param {number} totalItems
 * @returns {number|null} new page number, or null if invalid
 */
function validatePageNav(p, currentPage, totalItems) {
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
    if (currentFilter === 'done' && getStatus(r) !== 'done') return false;
    if (currentFilter === 'pending' && getStatus(r) !== 'pending') return false;
    if (currentFilter === 'inf90' && !(r.interference || '').includes('>= -90')) return false;
    if (currentFilter === 'inf100' && !(r.interference || '').includes('-100')) return false;
    if (search) {
      const haystack = [r.siteCode, r.cellName, r.province, r.amphur, r.tumbol, r.cause, r.coordAWN]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/**
 * Compute KPI summary from data array
 * @param {Array} data
 * @returns {{ total: number, done: number, pending: number, identified: number, pct: number }}
 */
function computeKPI(data) {
  const total = data.length;
  const done = data.filter(r => getStatus(r) === 'done').length;
  const pending = total - done;
  const identified = data.filter(r => r.cause && r.cause.trim()).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  return { total, done, pending, identified, pct };
}

/**
 * Deduplicate sites by worst interference level (highest priority)
 * @param {Array} data
 * @returns {Object} counts per level
 */
function computeSiteLevelCounts(data) {
  const LEVELS = ['INF≥-90', '-100≤INF<-90', '-105≤INF<-100', 'ไม่ระบุ'];
  const priority = { 'INF≥-90': 3, '-100≤INF<-90': 2, '-105≤INF<-100': 1, 'ไม่ระบุ': 0 };
  const siteLevel = {};

  data.forEach(r => {
    const site = r.siteCode;
    if (!site) return;
    const lv = getInfLevel(r.interference || '');
    if (!siteLevel[site] || priority[lv] > priority[siteLevel[site]]) {
      siteLevel[site] = lv;
    }
  });

  const counts = { 'INF≥-90': 0, '-100≤INF<-90': 0, '-105≤INF<-100': 0, 'ไม่ระบุ': 0 };
  Object.entries(siteLevel).forEach(([, lv]) => { counts[lv]++; });
  return counts;
}

/**
 * Map brand keywords in cause string to brand names
 * @param {string} causeText - lowercase cause text
 * @returns {string[]} list of matched brand names
 */
function matchBrands(causeText) {
  const map = [
    ['L-VISION', 'l-vision'], ['L-VISION', 'l vision'],
    ['Be Well', 'be well'], ['Be Well', 'bewell'],
    ['FnK Vision', 'fnk'], ['FOFU', 'fofu'], ['FOFO', 'fofo'],
    ['HVISION', 'hvision'], ['PIXELS', 'pixel'],
    ['SriHome', 'srihome'], ['WiSTINO', 'wistino'],
    ['WORLDTECH', 'worldtech'], ['GLSCAM', 'glscam'],
    ['No-Brand', 'no-brand'], ['No-Brand', 'no brand']
  ];
  const found = new Set();
  map.forEach(([brand, key]) => {
    if (causeText.includes(key)) found.add(brand);
  });
  return Array.from(found);
}

module.exports = {
  PAGE_SIZE,
  getStatus,
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
};
