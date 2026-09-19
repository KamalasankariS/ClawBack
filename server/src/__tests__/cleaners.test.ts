import { describe, it, expect } from 'vitest';
import { cleanAmount } from '../seed/amount.js';
import { cleanStatus } from '../seed/status.js';
import { cleanDate } from '../seed/date.js';

describe('Amount Cleaner', () => {
  it('parses plain numbers', () => {
    expect(cleanAmount(42.5)).toEqual({ amount: 42.5, cleaned: false, rule: null });
  });

  it('returns 0 for null/undefined', () => {
    expect(cleanAmount(null).amount).toBe(0);
    expect(cleanAmount(null).rule).toBe('null_to_zero');
    expect(cleanAmount(undefined).amount).toBe(0);
  });

  it('strips $ prefix', () => {
    const result = cleanAmount('$9.49');
    expect(result.amount).toBe(9.49);
    expect(result.rule).toBe('stripped_currency');
  });

  it('strips USD prefix', () => {
    const result = cleanAmount('USD 150.00');
    expect(result.amount).toBe(150);
    expect(result.rule).toBe('stripped_currency');
  });

  it('handles accounting negatives (102.78)', () => {
    const result = cleanAmount('(102.78)');
    expect(result.amount).toBe(-102.78);
  });

  it('handles -$3.28 format', () => {
    const result = cleanAmount('-$3.28');
    expect(result.amount).toBe(-3.28);
  });

  it('handles TBD as 0', () => {
    const result = cleanAmount('TBD');
    expect(result.amount).toBe(0);
    expect(result.rule).toBe('unparseable_placeholder');
  });

  it('handles N/A as 0', () => {
    expect(cleanAmount('N/A').amount).toBe(0);
  });

  it('handles empty string as 0', () => {
    expect(cleanAmount('').amount).toBe(0);
  });

  it('handles commas in numbers', () => {
    expect(cleanAmount('$1,234.56').amount).toBe(1234.56);
  });

  it('handles Infinity as 0', () => {
    expect(cleanAmount(Infinity).amount).toBe(0);
    expect(cleanAmount(Infinity).rule).toBe('near_zero_or_infinite');
  });

  it('handles NaN string as 0', () => {
    expect(cleanAmount('abc').amount).toBe(0);
    expect(cleanAmount('abc').rule).toBe('unparseable_amount');
  });

  it('handles near-zero as 0', () => {
    expect(cleanAmount(0.0000001).amount).toBe(0);
  });
});

describe('Status Cleaner', () => {
  it('maps "dispute" to in_dispute', () => {
    expect(cleanStatus('dispute').status).toBe('in_dispute');
  });

  it('maps "disputed" to in_dispute', () => {
    expect(cleanStatus('disputed').status).toBe('in_dispute');
  });

  it('maps "in dispute" to in_dispute', () => {
    expect(cleanStatus('in dispute').status).toBe('in_dispute');
  });

  it('maps "under review" to in_dispute', () => {
    expect(cleanStatus('under review').status).toBe('in_dispute');
  });

  it('maps "complete" to closed', () => {
    expect(cleanStatus('complete').status).toBe('closed');
  });

  it('maps "completed" to closed', () => {
    expect(cleanStatus('completed').status).toBe('closed');
  });

  it('maps "new" to open', () => {
    expect(cleanStatus('new').status).toBe('open');
  });

  it('maps "pending" to open', () => {
    expect(cleanStatus('pending').status).toBe('open');
  });

  it('maps null to open', () => {
    expect(cleanStatus(null).status).toBe('open');
    expect(cleanStatus(null).rule).toBe('null_to_open');
  });

  it('maps empty string to open', () => {
    expect(cleanStatus('').status).toBe('open');
    expect(cleanStatus('').rule).toBe('null_to_open');
  });

  it('maps "none" to open', () => {
    expect(cleanStatus('none').status).toBe('open');
  });

  it('handles case insensitivity', () => {
    expect(cleanStatus('DISPUTE').status).toBe('in_dispute');
    expect(cleanStatus('Complete').status).toBe('closed');
  });

  it('handles whitespace', () => {
    expect(cleanStatus('  dispute  ').status).toBe('in_dispute');
  });

  it('defaults unknown status to open', () => {
    const result = cleanStatus('some_random_status');
    expect(result.status).toBe('open');
    expect(result.rule).toBe('unknown_status_some_random_status');
  });

  it('maps dispute filing variants', () => {
    expect(cleanStatus('dispute - filed').status).toBe('dispute_filed');
    expect(cleanStatus('dispute - filing in progress').status).toBe('dispute_filed');
  });
});

describe('Date Cleaner', () => {
  it('returns null for null input', () => {
    expect(cleanDate(null).date).toBeNull();
  });

  it('handles placeholder "N/A"', () => {
    const result = cleanDate('N/A');
    expect(result.date).toBeNull();
    expect(result.rule).toBe('invalid_placeholder');
  });

  it('handles placeholder "0000-00-00"', () => {
    expect(cleanDate('0000-00-00').date).toBeNull();
  });

  it('parses YYYY-MM-DD', () => {
    const result = cleanDate('2026-03-15');
    expect(result.date).not.toBeNull();
    expect(result.date!.getFullYear()).toBe(2026);
    expect(result.date!.getMonth()).toBe(2); // March = 2
    expect(result.date!.getDate()).toBe(15);
  });

  it('parses MM/DD/YYYY', () => {
    const result = cleanDate('03/15/2026');
    expect(result.date).not.toBeNull();
    expect(result.date!.getFullYear()).toBe(2026);
    expect(result.rule).toBe('mm_dd_yyyy');
  });

  it('parses DD-MM-YYYY', () => {
    const result = cleanDate('15-03-2026');
    expect(result.date).not.toBeNull();
    expect(result.rule).toBe('dd_mm_yyyy');
  });

  it('parses ISO format', () => {
    const result = cleanDate('2026-01-05T00:00:00.000Z');
    expect(result.date).not.toBeNull();
    expect(result.rule).toBe('iso_format');
  });

  it('parses Unix timestamp', () => {
    const result = cleanDate(1737590400); // 2025-01-23
    expect(result.date).not.toBeNull();
    expect(result.rule).toBe('unix_timestamp');
  });

  it('parses text date "January 8, 2026"', () => {
    const result = cleanDate('January 8, 2026');
    expect(result.date).not.toBeNull();
    expect(result.rule).toBe('text_date');
  });

  it('rejects invalid month in YYYY-MM-DD', () => {
    const result = cleanDate('2026-13-01');
    expect(result.date).toBeNull();
    expect(result.rule).toBe('invalid_date_values');
  });

  it('rejects invalid day in MM/DD/YYYY', () => {
    const result = cleanDate('02/32/2026');
    expect(result.date).toBeNull();
    expect(result.rule).toBe('invalid_date_values');
  });

  it('returns null for completely unparseable', () => {
    const result = cleanDate('not a date');
    expect(result.date).toBeNull();
    expect(result.rule).toBe('unparseable_date');
  });
});
