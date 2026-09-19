interface RetailerRef {
  id: number;
  name: string;
}

const RETAILER_ALIASES: Record<string, string> = {
  // FreshRoute Supply
  'freshroute': 'FreshRoute Supply',
  'freshroute supply': 'FreshRoute Supply',
  'freshroute supply llc': 'FreshRoute Supply',
  'fresh route supply': 'FreshRoute Supply',
  'f r s': 'FreshRoute Supply',
  // NorthStar Distribution
  'northstar': 'NorthStar Distribution',
  'northstar distribution': 'NorthStar Distribution',
  'northstar dist': 'NorthStar Distribution',
  'north star distribution': 'NorthStar Distribution',
  'n.s.d.': 'NorthStar Distribution',
  'ns dist': 'NorthStar Distribution',
  // Meridian Food Service
  'meridian food service': 'Meridian Food Service',
  'meridian food svc': 'Meridian Food Service',
  'meridian food service (mfs)': 'Meridian Food Service',
  'mfs': 'Meridian Food Service',
  'meridian fs': 'Meridian Food Service',
  // PrimeLine Foods
  'primeline foods': 'PrimeLine Foods',
  'primeline foods inc': 'PrimeLine Foods',
  'primelinefoods': 'PrimeLine Foods',
  'prime line foods': 'PrimeLine Foods',
  // Greenfield Markets
  'greenfield': 'Greenfield Markets',
  'greenfield markets': 'Greenfield Markets',
  'greenfield mkts': 'Greenfield Markets',
  'greenfield markets co.': 'Greenfield Markets',
  // Summit Stores
  'summit': 'Summit Stores',
  'summit stores': 'Summit Stores',
  'summit stores corp': 'Summit Stores',
  'summit corporation': 'Summit Stores',
  // ValueMart
  'valuemart': 'ValueMart',
  'valuemart inc.': 'ValueMart',
  'value-mart': 'ValueMart',
  'value mart': 'ValueMart',
  // ShopStream
  'shopstream': 'ShopStream',
  'shopstream.com': 'ShopStream',
  'shopstream vendor': 'ShopStream',
  'shopstream vendor central': 'ShopStream',
  'shpstrm': 'ShopStream',
  // Prairie Grocers
  'prairie': 'Prairie Grocers',
  'prairie grocers': 'Prairie Grocers',
  'prairie grocers inc': 'Prairie Grocers',
  // Maple Leaf Market
  'maple leaf': 'Maple Leaf Market',
  'maple leaf market': 'Maple Leaf Market',
  'mapleleaf': 'Maple Leaf Market',
  'maple leaf markets': 'Maple Leaf Market',
  // Atlas Retail Group
  'atlas': 'Atlas Retail Group',
  'atlas retail': 'Atlas Retail Group',
  'atlas retail group': 'Atlas Retail Group',
  'atlas retail grp': 'Atlas Retail Group',
  // BulkBarn Club
  'bulkbarn': 'BulkBarn Club',
  'bulkbarn club': 'BulkBarn Club',
  'bulk barn club': 'BulkBarn Club',
  'bulk barn': 'BulkBarn Club',
  // Lone Star Grocery
  'lone star': 'Lone Star Grocery',
  'lone star grocery': 'Lone Star Grocery',
  'lonestar': 'Lone Star Grocery',
  'lone star grocery co.': 'Lone Star Grocery',
  // MediMart Pharmacy
  'medimart': 'MediMart Pharmacy',
  'medimart pharmacy': 'MediMart Pharmacy',
  'medi mart': 'MediMart Pharmacy',
  'medimart health': 'MediMart Pharmacy',
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
