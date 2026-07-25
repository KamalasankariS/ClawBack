const REASON_ALIASES: Record<string, string> = {
  // SHORT
  'shortage': 'SHORT',
  'short': 'SHORT',
  'shortage - product': 'SHORT',
  'shortage in transit': 'SHORT',
  // PRICE
  'price discrepancy': 'PRICE',
  'price': 'PRICE',
  'pricing': 'PRICE',
  // FREIGHT
  'freight': 'FREIGHT',
  'frieght': 'FREIGHT',
  'freight allowance': 'FREIGHT',
  // OSD
  'os&d': 'OSD',
  // COMP
  'compliance fine': 'COMP',
  'compliance': 'COMP',
  'fine': 'COMP',
  // SPOIL
  'spoilage': 'SPOIL',
  'spoiled': 'SPOIL',
  // UNSAL
  'unsaleables': 'UNSAL',
  'unsaleable': 'UNSAL',
  'unsalables': 'UNSAL',
  // MCB
  'bill back': 'MCB',
  'billback': 'MCB',
  'mcb': 'MCB',
  // PROMO
  'promotional allowance': 'PROMO',
  'promo': 'PROMO',
};

export function cleanReason(raw: unknown): { code: string | null; cleaned: boolean; rule: string | null } {
  if (raw == null || raw === '') {
    return { code: null, cleaned: false, rule: null };
  }

  const str = String(raw).trim().toLowerCase();
  if (!str || str === 'null' || str === 'n/a' || str === '???' || str === 'other' || str === 'misc') {
    return { code: null, cleaned: true, rule: 'unrecognized_reason' };
  }

  const code = REASON_ALIASES[str];
  if (code) {
    return { code, cleaned: true, rule: `mapped_${str}` };
  }

  return { code: null, cleaned: true, rule: `unknown_reason_${str}` };
}
