export interface DateResult {
  date: Date | null;
  cleaned: boolean;
  rule: string | null;
}

export function cleanDate(raw: unknown): DateResult {
  if (raw == null) {
    return { date: null, cleaned: false, rule: null };
  }

  const str = String(raw).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'n/a' || str === '0000-00-00') {
    return { date: null, cleaned: true, rule: 'invalid_placeholder' };
  }

  // Unix timestamp (number > 1e9)
  if (typeof raw === 'number' && raw > 1e9) {
    return { date: new Date(raw * 1000), cleaned: true, rule: 'unix_timestamp' };
  }

  // ISO format: 2026-01-05T00:00:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return { date: d, cleaned: true, rule: 'iso_format' };
  }

  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const month = parseInt(m!, 10);
    const day = parseInt(d!, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { date: null, cleaned: true, rule: 'invalid_date_values' };
    }
    return { date: new Date(parseInt(y!, 10), month - 1, day), cleaned: false, rule: null };
  }

  // MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const month = parseInt(m!, 10);
    const day = parseInt(d!, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { date: null, cleaned: true, rule: 'invalid_date_values' };
    }
    return { date: new Date(parseInt(y!, 10), month - 1, day), cleaned: true, rule: 'mm_dd_yyyy' };
  }

  // DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const day = parseInt(d!, 10);
    const month = parseInt(m!, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { date: null, cleaned: true, rule: 'invalid_date_values' };
    }
    return { date: new Date(parseInt(y!, 10), month - 1, day), cleaned: true, rule: 'dd_mm_yyyy' };
  }

  // Text format: "January 8, 2026"
  const textDate = new Date(str);
  if (!isNaN(textDate.getTime())) {
    return { date: textDate, cleaned: true, rule: 'text_date' };
  }

  return { date: null, cleaned: true, rule: 'unparseable_date' };
}
