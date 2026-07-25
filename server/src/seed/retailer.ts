interface RetailerRef {
  id: number;
  name: string;
}

const RETAILER_ALIASES: Record<string, string> = {
  // KeHE
  'kehe': 'KeHE',
  'kehe distributors': 'KeHE',
  'kehe distributors llc': 'KeHE',
  'kehe food distributors': 'KeHE',
  'k e h e': 'KeHE',
  // UNFI
  'unfi': 'UNFI',
  'united natural foods': 'UNFI',
  'united natural foods inc': 'UNFI',
  'u.n.f.i.': 'UNFI',
  'un fi': 'UNFI',
  // Gordon Food Service
  'gordon food service': 'Gordon Food Service',
  'gordon food svc': 'Gordon Food Service',
  'gordon food service (gfc)': 'Gordon Food Service',
  'gfc': 'Gordon Food Service',
  'gfs': 'Gordon Food Service',
  // Dot Foods
  'dot foods': 'Dot Foods',
  'dot foods inc': 'Dot Foods',
  'dotfoods': 'Dot Foods',
  // Kroger
  'kroger': 'Kroger',
  'kroger co': 'Kroger',
  'kroger co.': 'Kroger',
  'the kroger co.': 'Kroger',
  // Target
  'target': 'Target',
  'target corp': 'Target',
  'target corporation': 'Target',
  'tgt': 'Target',
  // Walmart
  'walmart': 'Walmart',
  'walmart inc.': 'Walmart',
  'wal-mart': 'Walmart',
  'wal mart': 'Walmart',
  // Amazon
  'amazon': 'Amazon',
  'amazon.com': 'Amazon',
  'amazon vendor': 'Amazon',
  'amazon vendor central': 'Amazon',
  'amzn': 'Amazon',
  // WinCo
  'winco': 'WinCo Foods',
  'winco foods': 'WinCo Foods',
  // Loblaw
  'loblaw': 'Loblaw',
  'loblaw companies': 'Loblaw',
  'loblaws': 'Loblaw',
  // Ahold Delhaize
  'ahold': 'Ahold Delhaize',
  'ahold delhaize': 'Ahold Delhaize',
  // BJ's
  'bjs': "BJ's Wholesale Club",
  'bjs wholesale': "BJ's Wholesale Club",
  "bj's wholesale club": "BJ's Wholesale Club",
  // H-E-B
  'h-e-b': 'H-E-B',
  'heb': 'H-E-B',
  'h e b': 'H-E-B',
  // CVS
  'cvs': 'CVS',
  'cvs health': 'CVS',
  'cvs pharmacy': 'CVS',
};

export function buildRetailerLookup(retailers: RetailerRef[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const r of retailers) {
    lookup.set(r.name, r.id);
  }
  return lookup;
}

export function cleanRetailerName(raw: unknown): { canonical: string | null; retailerId: number | null; cleaned: boolean } {
  if (raw == null || raw === '') return { canonical: null, retailerId: null, cleaned: false };
  const str = String(raw).replace(/\t/g, ' ').trim().toLowerCase();
  if (!str || str === 'null' || str === 'n/a' || str === '-') {
    return { canonical: null, retailerId: null, cleaned: true };
  }
  const canonical = RETAILER_ALIASES[str] || null;
  return { canonical, retailerId: null, cleaned: canonical !== null };
}

export function resolveRetailerId(canonical: string | null, lookup: Map<string, number>): number | null {
  if (!canonical) return null;
  return lookup.get(canonical) ?? null;
}
