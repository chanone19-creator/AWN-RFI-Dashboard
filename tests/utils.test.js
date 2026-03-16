/**
 * Unit tests for AWN RFI Dashboard utility functions
 */

const {
  PAGE_SIZE,
  INF_TIERS,
  INF_LEVELS,
  INF_PRIORITY,
  BRAND_MAP,
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
  formatInfLabel,
} = require('../src/utils');

// ============================================================
// getStatus
// ============================================================
describe('getStatus', () => {
  test('returns "done" when action has non-empty text', () => {
    expect(getStatus({ action: 'ดำเนินการแล้ว' })).toBe('done');
  });

  test('returns "done" when action has whitespace-padded text', () => {
    expect(getStatus({ action: '  มีการดำเนินการ  ' })).toBe('done');
  });

  test('returns "pending" when action is empty string', () => {
    expect(getStatus({ action: '' })).toBe('pending');
  });

  test('returns "pending" when action is only whitespace', () => {
    expect(getStatus({ action: '   ' })).toBe('pending');
  });

  test('returns "pending" when action is null', () => {
    expect(getStatus({ action: null })).toBe('pending');
  });

  test('returns "pending" when action is undefined', () => {
    expect(getStatus({})).toBe('pending');
  });
});

// ============================================================
// getInfClass
// ============================================================
describe('getInfClass', () => {
  test('returns badge-inf90 for >= -90 interference', () => {
    expect(getInfClass('>= -90 dBm')).toBe('badge-inf90');
  });

  test('returns badge-inf100 for -100 interference', () => {
    expect(getInfClass('=<INF<-100')).toBe('badge-inf100');
  });

  test('returns badge-inf105 for -105 interference even when string also contains -100', () => {
    expect(getInfClass('-105<=INF<-100')).toBe('badge-inf105');
  });

  test('returns badge-inf105 for null', () => {
    expect(getInfClass(null)).toBe('badge-inf105');
  });

  test('returns badge-inf105 for undefined', () => {
    expect(getInfClass(undefined)).toBe('badge-inf105');
  });

  test('returns badge-inf105 for empty string', () => {
    expect(getInfClass('')).toBe('badge-inf105');
  });

  test('returns badge-inf105 for unknown interference string', () => {
    expect(getInfClass('unknown level')).toBe('badge-inf105');
  });

  test('badge-inf90 takes precedence when both patterns present', () => {
    // >= -90 checked first in code
    expect(getInfClass('>= -90 and -100')).toBe('badge-inf90');
  });
});

// ============================================================
// getInfLevel
// ============================================================
describe('getInfLevel', () => {
  test('returns INF≥-90 for >= -90 string', () => {
    expect(getInfLevel('>= -90 dBm')).toBe('INF≥-90');
  });

  test('returns -105≤INF<-100 for string containing -105', () => {
    expect(getInfLevel('-105<=INF<-100')).toBe('-105≤INF<-100');
  });

  test('returns -100≤INF<-90 for string containing -100 (no -105)', () => {
    expect(getInfLevel('=<INF<-100')).toBe('-100≤INF<-90');
  });

  test('returns ไม่ระบุ for null', () => {
    expect(getInfLevel(null)).toBe('ไม่ระบุ');
  });

  test('returns ไม่ระบุ for undefined', () => {
    expect(getInfLevel(undefined)).toBe('ไม่ระบุ');
  });

  test('returns ไม่ระบุ for empty string', () => {
    expect(getInfLevel('')).toBe('ไม่ระบุ');
  });

  test('returns ไม่ระบุ for unrecognised string', () => {
    expect(getInfLevel('some random text')).toBe('ไม่ระบุ');
  });

  test('-105 check takes precedence over -100 check', () => {
    // A string with -105 should NOT fall through to -100≤INF<-90
    expect(getInfLevel('-105<=INF<-100')).toBe('-105≤INF<-100');
  });
});

// ============================================================
// cleanCoord
// ============================================================
describe('cleanCoord', () => {
  test('returns first word of name', () => {
    expect(cleanCoord('สมชาย รักไทย')).toBe('สมชาย');
  });

  test('strips @ symbol', () => {
    expect(cleanCoord('@สมหมาย')).toBe('สมหมาย');
  });

  test('handles single word without @', () => {
    expect(cleanCoord('วิทยา')).toBe('วิทยา');
  });

  test('trims leading/trailing spaces before splitting', () => {
    expect(cleanCoord('  ประวิทย์ คงสุข  ')).toBe('ประวิทย์');
  });

  test('returns empty string for null', () => {
    expect(cleanCoord(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(cleanCoord(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(cleanCoord('')).toBe('');
  });

  test('strips @ and returns first word for "@name surname"', () => {
    expect(cleanCoord('@ณัฐพล รอดอ่วม')).toBe('ณัฐพล');
  });
});

// ============================================================
// cleanCause
// ============================================================
describe('cleanCause', () => {
  test('replaces newlines with ", "', () => {
    expect(cleanCause('กล้อง\nไม่มีใบอนุญาต')).toBe('กล้อง, ไม่มีใบอนุญาต');
  });

  test('collapses multiple spaces into one', () => {
    expect(cleanCause('กล้อง   วงจรปิด')).toBe('กล้อง วงจรปิด');
  });

  test('truncates to 50 characters', () => {
    const long = 'A'.repeat(100);
    expect(cleanCause(long)).toHaveLength(50);
  });

  test('returns empty string for null', () => {
    expect(cleanCause(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(cleanCause(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(cleanCause('')).toBe('');
  });

  test('trims leading/trailing whitespace', () => {
    expect(cleanCause('  กล้องวงจรปิด  ')).toBe('กล้องวงจรปิด');
  });

  test('keeps text under 50 chars unchanged (except trim)', () => {
    expect(cleanCause('กล้อง L-VISION')).toBe('กล้อง L-VISION');
  });
});

// ============================================================
// calcPageRange
// ============================================================
describe('calcPageRange', () => {
  test('returns all page numbers when total pages <= 5', () => {
    expect(calcPageRange(1, 3)).toEqual([1, 2, 3]);
  });

  test('includes first, last, and window around current page', () => {
    const range = calcPageRange(5, 10);
    expect(range).toContain(1);
    expect(range).toContain(10);
    expect(range).toContain(3);
    expect(range).toContain(5);
    expect(range).toContain(7);
  });

  test('inserts ellipsis for gaps', () => {
    const range = calcPageRange(1, 10);
    expect(range).toContain('...');
  });

  test('does not have consecutive ellipsis', () => {
    const range = calcPageRange(5, 20);
    for (let i = 0; i < range.length - 1; i++) {
      expect(!(range[i] === '...' && range[i + 1] === '...')).toBe(true);
    }
  });

  test('first and last page always present for large range', () => {
    const range = calcPageRange(10, 20);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(20);
  });

  test('single page returns [1]', () => {
    expect(calcPageRange(1, 1)).toEqual([1]);
  });
});

// ============================================================
// validatePageNav
// ============================================================
describe('validatePageNav', () => {
  const ITEMS = PAGE_SIZE * 5; // 250 items → 5 pages

  test('returns page number for valid page', () => {
    expect(validatePageNav(3, 1, ITEMS)).toBe(3);
  });

  test('returns null for page < 1', () => {
    expect(validatePageNav(0, 1, ITEMS)).toBeNull();
  });

  test('returns null for page > total pages', () => {
    expect(validatePageNav(6, 5, ITEMS)).toBeNull();
  });

  test('returns 1 for first page navigation', () => {
    expect(validatePageNav(1, 2, ITEMS)).toBe(1);
  });

  test('returns last valid page', () => {
    expect(validatePageNav(5, 4, ITEMS)).toBe(5);
  });

  test('returns null for empty dataset', () => {
    expect(validatePageNav(1, 1, 0)).toBeNull();
  });
});

// ============================================================
// filterData
// ============================================================
describe('filterData', () => {
  const makeRow = (overrides = {}) => ({
    siteCode: 'TH001',
    cellName: 'TH001_1',
    province: 'สมุทรสาคร',
    amphur: 'เมือง',
    tumbol: 'มหาชัย',
    cause: 'กล้อง L-VISION',
    coordAWN: 'สมชาย รักไทย',
    action: '',
    interference: '',
    ...overrides,
  });

  const done = makeRow({ action: 'ดำเนินการแล้ว' });
  const pending = makeRow({ action: '' });
  const inf90 = makeRow({ interference: '>= -90 dBm' });
  const inf100 = makeRow({ interference: '=<INF<-100' });

  test('filter "all" returns all rows', () => {
    expect(filterData([done, pending], 'all', '')).toHaveLength(2);
  });

  test('filter "done" returns only done rows', () => {
    const result = filterData([done, pending], 'done', '');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(done);
  });

  test('filter "pending" returns only pending rows', () => {
    const result = filterData([done, pending], 'pending', '');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(pending);
  });

  test('filter "inf90" returns only >= -90 rows', () => {
    const result = filterData([done, inf90, inf100], 'inf90', '');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(inf90);
  });

  test('filter "inf100" returns only -100 rows', () => {
    const result = filterData([done, inf90, inf100], 'inf100', '');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(inf100);
  });

  test('search filters by siteCode', () => {
    const r1 = makeRow({ siteCode: 'ABC123' });
    const r2 = makeRow({ siteCode: 'XYZ999' });
    const result = filterData([r1, r2], 'all', 'abc');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(r1);
  });

  test('search filters by province', () => {
    const r1 = makeRow({ province: 'ราชบุรี' });
    const r2 = makeRow({ province: 'นครปฐม' });
    const result = filterData([r1, r2], 'all', 'ราชบุรี');
    expect(result).toHaveLength(1);
  });

  test('empty search returns all rows', () => {
    expect(filterData([done, pending, inf90], 'all', '')).toHaveLength(3);
  });

  test('combined filter + search', () => {
    const r1 = makeRow({ action: 'done', siteCode: 'MATCH' });
    const r2 = makeRow({ action: 'done', siteCode: 'OTHER' });
    const r3 = makeRow({ action: '', siteCode: 'MATCH' });
    const result = filterData([r1, r2, r3], 'done', 'match');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(r1);
  });

  test('returns empty array when nothing matches', () => {
    expect(filterData([done, pending], 'all', 'zzznomatch')).toHaveLength(0);
  });
});

// ============================================================
// computeKPI
// ============================================================
describe('computeKPI', () => {
  test('computes correct KPI for mixed data', () => {
    const data = [
      { action: 'ดำเนินการ', cause: 'กล้อง' },
      { action: '', cause: 'L-VISION' },
      { action: '   ', cause: '' },
    ];
    const kpi = computeKPI(data);
    expect(kpi.total).toBe(3);
    expect(kpi.done).toBe(1);
    expect(kpi.pending).toBe(2);
    expect(kpi.identified).toBe(2);
    expect(kpi.pct).toBe(33);
  });

  test('returns zeros for empty data', () => {
    const kpi = computeKPI([]);
    expect(kpi.total).toBe(0);
    expect(kpi.done).toBe(0);
    expect(kpi.pending).toBe(0);
    expect(kpi.identified).toBe(0);
    expect(kpi.pct).toBe(0);
  });

  test('pct is 100 when all done', () => {
    const data = [{ action: 'ok', cause: 'x' }, { action: 'ok', cause: 'y' }];
    expect(computeKPI(data).pct).toBe(100);
  });

  test('pct is 0 when none done', () => {
    const data = [{ action: '', cause: '' }, { action: null }];
    expect(computeKPI(data).pct).toBe(0);
  });
});

// ============================================================
// computeSiteLevelCounts
// ============================================================
describe('computeSiteLevelCounts', () => {
  test('counts unique sites per interference level', () => {
    const data = [
      { siteCode: 'S1', interference: '>= -90 dBm' },
      { siteCode: 'S2', interference: '=<INF<-100' },
      { siteCode: 'S3', interference: '' },
    ];
    const counts = computeSiteLevelCounts(data);
    expect(counts['INF≥-90']).toBe(1);
    expect(counts['-100≤INF<-90']).toBe(1);
    expect(counts['ไม่ระบุ']).toBe(1);
  });

  test('site is assigned to worst (highest priority) level when it appears multiple times', () => {
    const data = [
      { siteCode: 'S1', interference: '=<INF<-100' },      // -100≤INF<-90
      { siteCode: 'S1', interference: '>= -90 dBm' },      // INF≥-90 (higher priority)
    ];
    const counts = computeSiteLevelCounts(data);
    expect(counts['INF≥-90']).toBe(1);
    expect(counts['-100≤INF<-90']).toBe(0);
  });

  test('site keeps existing level when new occurrence has equal or lower priority', () => {
    const data = [
      { siteCode: 'S1', interference: '>= -90 dBm' },      // INF≥-90 (highest)
      { siteCode: 'S1', interference: '=<INF<-100' },      // lower priority — should NOT override
    ];
    const counts = computeSiteLevelCounts(data);
    expect(counts['INF≥-90']).toBe(1);
    expect(counts['-100≤INF<-90']).toBe(0);
  });

  test('ignores rows with no siteCode', () => {
    const data = [
      { siteCode: null, interference: '>= -90 dBm' },
      { siteCode: '', interference: '>= -90 dBm' },
    ];
    const counts = computeSiteLevelCounts(data);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(0);
  });

  test('returns all-zero counts for empty data', () => {
    const counts = computeSiteLevelCounts([]);
    expect(counts['INF≥-90']).toBe(0);
    expect(counts['-100≤INF<-90']).toBe(0);
    expect(counts['-105≤INF<-100']).toBe(0);
    expect(counts['ไม่ระบุ']).toBe(0);
  });
});

// ============================================================
// matchBrands
// ============================================================
describe('matchBrands', () => {
  test('matches l-vision keyword', () => {
    expect(matchBrands('กล้อง l-vision ติดตั้ง')).toContain('L-VISION');
  });

  test('matches "l vision" (space variant)', () => {
    expect(matchBrands('ใช้ l vision')).toContain('L-VISION');
  });

  test('matches be well', () => {
    expect(matchBrands('อุปกรณ์ be well brand')).toContain('Be Well');
  });

  test('matches bewell (no space)', () => {
    expect(matchBrands('เครื่อง bewell')).toContain('Be Well');
  });

  test('matches fnk for FnK Vision', () => {
    expect(matchBrands('กล้อง fnk model')).toContain('FnK Vision');
  });

  test('matches no-brand', () => {
    expect(matchBrands('กล้อง no-brand')).toContain('No-Brand');
  });

  test('matches no brand (space)', () => {
    expect(matchBrands('กล้อง no brand')).toContain('No-Brand');
  });

  test('returns empty array for unrecognised cause', () => {
    expect(matchBrands('สาเหตุอื่นๆ')).toHaveLength(0);
  });

  test('can match multiple brands in one string', () => {
    const result = matchBrands('มีทั้ง l-vision และ fofu');
    expect(result).toContain('L-VISION');
    expect(result).toContain('FOFU');
  });

  test('normalises input to lowercase internally (uppercase input works)', () => {
    expect(matchBrands('L-VISION')).toContain('L-VISION');
    expect(matchBrands('BE WELL')).toContain('Be Well');
  });

  test('handles null/undefined input gracefully', () => {
    expect(matchBrands(null)).toHaveLength(0);
    expect(matchBrands(undefined)).toHaveLength(0);
    expect(matchBrands('')).toHaveLength(0);
  });
});

// ============================================================
// formatInfLabel
// ============================================================
describe('formatInfLabel', () => {
  test('replaces =<INF< with ≤INF<', () => {
    expect(formatInfLabel('=<INF<-100')).toBe('≤INF<-100');
  });

  test('replaces ">= " with "≥"', () => {
    expect(formatInfLabel('>= -90 dBm')).toBe('≥-90 dBm');
  });

  test('returns N/A for null', () => {
    expect(formatInfLabel(null)).toBe('N/A');
  });

  test('returns N/A for undefined', () => {
    expect(formatInfLabel(undefined)).toBe('N/A');
  });

  test('returns N/A for empty string', () => {
    expect(formatInfLabel('')).toBe('N/A');
  });

  test('leaves unrelated strings unchanged', () => {
    expect(formatInfLabel('-105<=INF<-100')).toBe('-105<=INF<-100');
  });
});

// ============================================================
// Module-level constants
// ============================================================
describe('INF_TIERS', () => {
  test('has exactly 3 tiers', () => {
    expect(INF_TIERS).toHaveLength(3);
  });

  test('each tier has pattern, level, and badge', () => {
    INF_TIERS.forEach(t => {
      expect(t).toHaveProperty('pattern');
      expect(t).toHaveProperty('level');
      expect(t).toHaveProperty('badge');
    });
  });

  test('tier patterns match the same strings as getInfClass and getInfLevel', () => {
    expect(getInfClass('>= -90 test')).toBe('badge-inf90');
    expect(getInfLevel('>= -90 test')).toBe('INF≥-90');
    expect(getInfClass('-105<=INF<-100')).toBe('badge-inf105');
    expect(getInfLevel('-105<=INF<-100')).toBe('-105≤INF<-100');
  });
});

describe('INF_LEVELS', () => {
  test('contains all four expected levels', () => {
    expect(INF_LEVELS).toContain('INF≥-90');
    expect(INF_LEVELS).toContain('-100≤INF<-90');
    expect(INF_LEVELS).toContain('-105≤INF<-100');
    expect(INF_LEVELS).toContain('ไม่ระบุ');
    expect(INF_LEVELS).toHaveLength(4);
  });
});

describe('INF_PRIORITY', () => {
  test('INF≥-90 has highest priority', () => {
    expect(INF_PRIORITY['INF≥-90']).toBeGreaterThan(INF_PRIORITY['-100≤INF<-90']);
    expect(INF_PRIORITY['INF≥-90']).toBeGreaterThan(INF_PRIORITY['-105≤INF<-100']);
    expect(INF_PRIORITY['INF≥-90']).toBeGreaterThan(INF_PRIORITY['ไม่ระบุ']);
  });

  test('ไม่ระบุ has lowest priority', () => {
    expect(INF_PRIORITY['ไม่ระบุ']).toBe(0);
  });

  test('all INF_LEVELS have a priority entry', () => {
    INF_LEVELS.forEach(l => {
      expect(INF_PRIORITY).toHaveProperty(l);
    });
  });
});

describe('BRAND_MAP', () => {
  test('is a non-empty array of [brand, keyword] pairs', () => {
    expect(Array.isArray(BRAND_MAP)).toBe(true);
    expect(BRAND_MAP.length).toBeGreaterThan(0);
    BRAND_MAP.forEach(entry => {
      expect(entry).toHaveLength(2);
      expect(typeof entry[0]).toBe('string');
      expect(typeof entry[1]).toBe('string');
    });
  });

  test('all keywords are lowercase (so matchBrands comparison works)', () => {
    BRAND_MAP.forEach(([, key]) => {
      expect(key).toBe(key.toLowerCase());
    });
  });
});
