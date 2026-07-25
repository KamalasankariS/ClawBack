const STATUS_MAP: Record<string, string> = {
  'dispute': 'in_dispute',
  'disputed': 'in_dispute',
  'in dispute': 'in_dispute',
  'in review': 'in_dispute',
  'under review': 'in_dispute',
  'send to ops': 'in_dispute',
  'dispute - filed': 'dispute_filed',
  'dispute - file': 'dispute_filed',
  'dispute - filing in progress': 'dispute_filed',
  'complete': 'closed',
  'completed': 'closed',
  'closed': 'closed',
  'resolved': 'closed',
  'open': 'open',
  'new': 'open',
  'pending': 'open',
};

export interface StatusResult {
  status: string;
  cleaned: boolean;
  rule: string | null;
}

export function cleanStatus(raw: unknown): StatusResult {
  if (raw == null || raw === '') {
    return { status: 'open', cleaned: true, rule: 'null_to_open' };
  }

  const str = String(raw).trim().toLowerCase();
  if (!str || str === 'none' || str === 'null') {
    return { status: 'open', cleaned: true, rule: 'empty_to_open' };
  }

  const mapped = STATUS_MAP[str];
  if (mapped) {
    return { status: mapped, cleaned: str !== mapped, rule: str !== mapped ? `mapped_${str}` : null };
  }

  return { status: 'open', cleaned: true, rule: `unknown_status_${str}` };
}
