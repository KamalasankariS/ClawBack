export interface AmountResult {
  amount: number;
  cleaned: boolean;
  rule: string | null;
}

export function cleanAmount(raw: unknown): AmountResult {
  if (raw == null) {
    return { amount: 0, cleaned: true, rule: 'null_to_zero' };
  }

  if (typeof raw === 'number') {
    if (!isFinite(raw) || Math.abs(raw) < 1e-6) {
      return { amount: 0, cleaned: true, rule: 'near_zero_or_infinite' };
    }
    return { amount: raw, cleaned: false, rule: null };
  }

  let str = String(raw).trim();
  if (!str || str.toLowerCase() === 'tbd' || str.toLowerCase() === 'n/a' || str === '-') {
    return { amount: 0, cleaned: true, rule: 'unparseable_placeholder' };
  }

  // Strip currency prefixes
  let hadCurrency = false;
  if (str.startsWith('$')) {
    str = str.slice(1).trim();
    hadCurrency = true;
  } else if (str.toUpperCase().startsWith('USD')) {
    str = str.slice(3).trim();
    hadCurrency = true;
  }

  // Handle accounting format: (123.45) means -123.45
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }

  // Handle -$3.28 format
  if (str.startsWith('-$')) {
    str = '-' + str.slice(2);
    hadCurrency = true;
  }

  // Remove commas
  str = str.replace(/,/g, '');

  const num = parseFloat(str);
  if (isNaN(num)) {
    return { amount: 0, cleaned: true, rule: 'unparseable_amount' };
  }

  const rule = hadCurrency ? 'stripped_currency' : null;
  return { amount: num, cleaned: hadCurrency || rule !== null, rule };
}
